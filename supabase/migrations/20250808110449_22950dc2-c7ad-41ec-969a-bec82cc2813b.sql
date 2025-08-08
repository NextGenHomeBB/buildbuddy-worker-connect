
-- 1) Attachments table for photos/files linked to org/project/task/checklist
create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  org_id uuid not null,
  project_id uuid,
  task_id uuid,
  checklist_item_id uuid,
  user_id uuid not null,
  storage_path text not null,
  content_type text,
  metadata jsonb
);

alter table public.attachments enable row level security;

-- RLS: members of org can read
create policy if not exists "attachments members read"
  on public.attachments
  for select
  using (is_org_member(org_id));

-- RLS: members can insert their own rows
create policy if not exists "attachments insert self"
  on public.attachments
  for insert
  with check (is_org_member(org_id) and auth.uid() = user_id);

-- RLS: uploader or org managers can update/delete
create policy if not exists "attachments update own or managers"
  on public.attachments
  for update
  using (auth.uid() = user_id or has_org_role(org_id, array['org_admin','manager']))
  with check (is_org_member(org_id));

create policy if not exists "attachments delete own or managers"
  on public.attachments
  for delete
  using (auth.uid() = user_id or has_org_role(org_id, array['org_admin','manager']));

-- 2) Incidents table (safety forms)
create table if not exists public.incidents (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  org_id uuid not null,
  project_id uuid,
  user_id uuid not null,
  title text not null,
  description text,
  severity text default 'low',
  status text not null default 'open',
  photo_path text
);

alter table public.incidents enable row level security;

create policy if not exists "incidents members read"
  on public.incidents
  for select
  using (is_org_member(org_id));

create policy if not exists "incidents insert self"
  on public.incidents
  for insert
  with check (is_org_member(org_id) and auth.uid() = user_id);

create policy if not exists "incidents update own or managers"
  on public.incidents
  for update
  using (auth.uid() = user_id or has_org_role(org_id, array['org_admin','manager']))
  with check (is_org_member(org_id));

-- 3) Material requests (simple worker-side submission)
create table if not exists public.material_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  org_id uuid not null,
  project_id uuid,
  user_id uuid not null,
  item_name text not null,
  qty numeric,
  unit text,
  note text,
  photo_path text,
  status text not null default 'submitted'
);

alter table public.material_requests enable row level security;

create policy if not exists "material_requests members read"
  on public.material_requests
  for select
  using (is_org_member(org_id));

create policy if not exists "material_requests insert self"
  on public.material_requests
  for insert
  with check (is_org_member(org_id) and auth.uid() = user_id);

create policy if not exists "material_requests update own or managers"
  on public.material_requests
  for update
  using (auth.uid() = user_id or has_org_role(org_id, array['org_admin','manager']))
  with check (is_org_member(org_id));


-- 4) Storage bucket for attachments (private) + policies referencing public.attachments
insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', false)
on conflict (id) do nothing;

-- Allow authenticated users to upload into the attachments bucket
create policy if not exists "attachments storage insert"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'attachments');

-- Allow reading only if there's a linked public.attachments row and user is a member of that org
create policy if not exists "attachments storage read linked"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'attachments'
    and exists (
      select 1
      from public.attachments a
      where a.storage_path = storage.objects.name
        and is_org_member(a.org_id)
    )
  );

-- Allow update/delete if user uploaded it (or is org manager)
create policy if not exists "attachments storage update linked"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'attachments'
    and exists (
      select 1
      from public.attachments a
      where a.storage_path = storage.objects.name
        and (a.user_id = auth.uid() or has_org_role(a.org_id, array['org_admin','manager']))
    )
  )
  with check (
    bucket_id = 'attachments'
  );

create policy if not exists "attachments storage delete linked"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'attachments'
    and exists (
      select 1
      from public.attachments a
      where a.storage_path = storage.objects.name
        and (a.user_id = auth.uid() or has_org_role(a.org_id, array['org_admin','manager']))
    )
  );

-- 5) Realtime for new tables
alter table public.attachments replica identity full;
alter table public.incidents replica identity full;
alter table public.material_requests replica identity full;

do $$
begin
  begin
    execute 'alter publication supabase_realtime add table public.attachments';
  exception when others then
    null;
  end;
  begin
    execute 'alter publication supabase_realtime add table public.incidents';
  exception when others then
    null;
  end;
  begin
    execute 'alter publication supabase_realtime add table public.material_requests';
  exception when others then
    null;
  end;
end$$;

-- 6) Seed/demo: function to create a demo org/project/phases/tasks/checklists for the current user
create or replace function public.seed_demo_for_current_user()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
  v_project uuid;
  v_phase1 uuid;
  v_phase2 uuid;
  r_task record;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  -- Create demo org for current user
  v_org := public.create_org_with_admin('Demo Construction');

  -- Create a demo project
  insert into public.projects (org_id, name, status)
  values (v_org, 'Demo Site A', 'active')
  returning id into v_project;

  -- Two phases
  insert into public.project_phases (project_id, org_id, name, seq)
  values (v_project, v_org, 'Mobilization', 1)
  returning id into v_phase1;

  insert into public.project_phases (project_id, org_id, name, seq)
  values (v_project, v_org, 'Framing', 2)
  returning id into v_phase2;

  -- Two tasks assigned to current user
  insert into public.tasks (project_id, org_id, title, status, assignee, phase_id)
  values
    (v_project, v_org, 'Unload materials', 'todo', auth.uid(), v_phase1),
    (v_project, v_org, 'Frame wall A1', 'todo', auth.uid(), v_phase2);

  -- Ensure assignment for current user
  insert into public.project_assignments (project_id, user_id, employer_org_id, is_external, accepted_at, role)
  values (v_project, auth.uid(), v_org, false, now(), 'worker')
  on conflict do nothing;

  -- Checklist with two items for each of the user's tasks
  for r_task in
    select id from public.tasks where project_id = v_project and assignee = auth.uid()
  loop
    declare v_checklist uuid;
    begin
      insert into public.checklists (project_id, org_id, task_id, title)
      values (v_project, v_org, r_task.id, 'Task Checks')
      returning id into v_checklist;

      insert into public.checklist_items (project_id, org_id, task_id, checklist_id, title, done, seq)
      values
        (v_project, v_org, r_task.id, v_checklist, 'Safety check', false, 1),
        (v_project, v_org, r_task.id, v_checklist, 'Clean area', false, 2);
    end;
  end loop;

  return v_org;
end;
$$;

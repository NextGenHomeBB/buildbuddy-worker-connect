
-- 1) Helper function for assignment-based access
CREATE OR REPLACE FUNCTION public.is_assigned_to_project(check_project uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.project_assignments pa
    WHERE pa.project_id = check_project
      AND pa.user_id = auth.uid()
      AND pa.accepted_at IS NOT NULL
  );
$$;

-- 2) Phases table linked to projects
CREATE TABLE IF NOT EXISTS public.phases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  order_no integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3) Link tasks to phases
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS phase_id uuid;

ALTER TABLE public.tasks
  ADD CONSTRAINT IF NOT EXISTS tasks_phase_id_fkey
  FOREIGN KEY (phase_id) REFERENCES public.phases(id) ON DELETE SET NULL;

-- 4) Task checklists and items
CREATE TABLE IF NOT EXISTS public.task_checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Checklist',
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.task_checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id uuid NOT NULL REFERENCES public.task_checklists(id) ON DELETE CASCADE,
  text text NOT NULL,
  done boolean NOT NULL DEFAULT false,
  photo_path text,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 5) Utility trigger to maintain updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS task_checklist_items_set_updated_at ON public.task_checklist_items;
CREATE TRIGGER task_checklist_items_set_updated_at
BEFORE UPDATE ON public.task_checklist_items
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- 6) RLS policies

-- Enable RLS
ALTER TABLE public.phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_checklist_items ENABLE ROW LEVEL SECURITY;

-- Phases: read for org members or assigned workers
DROP POLICY IF EXISTS phases_read ON public.phases;
CREATE POLICY phases_read
  ON public.phases
  FOR SELECT
  USING (
    is_org_member((SELECT p.org_id FROM public.projects p WHERE p.id = phases.project_id))
    OR is_assigned_to_project(phases.project_id)
  );

-- Phases: managers create/update/delete
DROP POLICY IF EXISTS phases_insert ON public.phases;
CREATE POLICY phases_insert
  ON public.phases
  FOR INSERT
  WITH CHECK (
    has_org_role((SELECT p.org_id FROM public.projects p WHERE p.id = phases.project_id),
                 ARRAY['org_admin','manager'])
  );

DROP POLICY IF EXISTS phases_update ON public.phases;
CREATE POLICY phases_update
  ON public.phases
  FOR UPDATE
  USING (
    has_org_role((SELECT p.org_id FROM public.projects p WHERE p.id = phases.project_id),
                 ARRAY['org_admin','manager'])
  );

DROP POLICY IF EXISTS phases_delete ON public.phases;
CREATE POLICY phases_delete
  ON public.phases
  FOR DELETE
  USING (
    has_org_role((SELECT p.org_id FROM public.projects p WHERE p.id = phases.project_id),
                 ARRAY['org_admin','manager'])
  );

-- Checklists: read for org members or assigned workers
DROP POLICY IF EXISTS task_checklists_read ON public.task_checklists;
CREATE POLICY task_checklists_read
  ON public.task_checklists
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.tasks t
      JOIN public.projects p ON p.id = t.project_id
      WHERE t.id = task_checklists.task_id
        AND (is_org_member(p.org_id) OR is_assigned_to_project(t.project_id))
    )
  );

-- Checklists: managers manage
DROP POLICY IF EXISTS task_checklists_insert ON public.task_checklists;
CREATE POLICY task_checklists_insert
  ON public.task_checklists
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.tasks t
      JOIN public.projects p ON p.id = t.project_id
      WHERE t.id = task_checklists.task_id
        AND has_org_role(p.org_id, ARRAY['org_admin','manager'])
    )
  );

DROP POLICY IF EXISTS task_checklists_update ON public.task_checklists;
CREATE POLICY task_checklists_update
  ON public.task_checklists
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.tasks t
      JOIN public.projects p ON p.id = t.project_id
      WHERE t.id = task_checklists.task_id
        AND has_org_role(p.org_id, ARRAY['org_admin','manager'])
    )
  );

DROP POLICY IF EXISTS task_checklists_delete ON public.task_checklists;
CREATE POLICY task_checklists_delete
  ON public.task_checklists
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.tasks t
      JOIN public.projects p ON p.id = t.project_id
      WHERE t.id = task_checklists.task_id
        AND has_org_role(p.org_id, ARRAY['org_admin','manager'])
    )
  );

-- Checklist items: read for org members or assigned workers
DROP POLICY IF EXISTS task_checklist_items_read ON public.task_checklist_items;
CREATE POLICY task_checklist_items_read
  ON public.task_checklist_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.task_checklists cl
      JOIN public.tasks t ON t.id = cl.task_id
      JOIN public.projects p ON p.id = t.project_id
      WHERE cl.id = task_checklist_items.checklist_id
        AND (is_org_member(p.org_id) OR is_assigned_to_project(t.project_id))
    )
  );

-- Checklist items: assignees can toggle; managers can manage
DROP POLICY IF EXISTS task_checklist_items_update ON public.task_checklist_items;
CREATE POLICY task_checklist_items_update
  ON public.task_checklist_items
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.task_checklists cl
      JOIN public.tasks t ON t.id = cl.task_id
      JOIN public.projects p ON p.id = t.project_id
      WHERE cl.id = task_checklist_items.checklist_id
        AND (
          t.assignee = auth.uid()
          OR has_org_role(p.org_id, ARRAY['org_admin','manager'])
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.task_checklists cl
      JOIN public.tasks t ON t.id = cl.task_id
      JOIN public.projects p ON p.id = t.project_id
      WHERE cl.id = task_checklist_items.checklist_id
        AND (
          t.assignee = auth.uid()
          OR has_org_role(p.org_id, ARRAY['org_admin','manager'])
        )
    )
  );

DROP POLICY IF EXISTS task_checklist_items_insert ON public.task_checklist_items;
CREATE POLICY task_checklist_items_insert
  ON public.task_checklist_items
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.task_checklists cl
      JOIN public.tasks t ON t.id = cl.task_id
      JOIN public.projects p ON p.id = t.project_id
      WHERE cl.id = task_checklist_items.checklist_id
        AND has_org_role(p.org_id, ARRAY['org_admin','manager'])
    )
  );

DROP POLICY IF EXISTS task_checklist_items_delete ON public.task_checklist_items;
CREATE POLICY task_checklist_items_delete
  ON public.task_checklist_items
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.task_checklists cl
      JOIN public.tasks t ON t.id = cl.task_id
      JOIN public.projects p ON p.id = t.project_id
      WHERE cl.id = task_checklist_items.checklist_id
        AND has_org_role(p.org_id, ARRAY['org_admin','manager'])
    )
  );

-- 7) Realtime
ALTER TABLE public.phases REPLICA IDENTITY FULL;
ALTER TABLE public.task_checklists REPLICA IDENTITY FULL;
ALTER TABLE public.task_checklist_items REPLICA IDENTITY FULL;
ALTER TABLE public.tasks REPLICA IDENTITY FULL;

-- Add to supabase_realtime publication (works if not already present; if already present, ignore errors on rerun)
DO $$
BEGIN
  BEGIN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.phases';
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.task_checklists';
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.task_checklist_items';
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks';
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END$$;

-- 8) Storage: task photos bucket and policies
INSERT INTO storage.buckets (id, name, public)
VALUES ('task-photos','task-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Public read for this bucket
DROP POLICY IF EXISTS "Public read task photos" ON storage.objects;
CREATE POLICY "Public read task photos"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'task-photos');

-- Authenticated users can upload to this bucket
DROP POLICY IF EXISTS "Authenticated upload task photos" ON storage.objects;
CREATE POLICY "Authenticated upload task photos"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'task-photos');

-- Optional: allow update/delete by authenticated (can tighten later)
DROP POLICY IF EXISTS "Authenticated update task photos" ON storage.objects;
CREATE POLICY "Authenticated update task photos"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'task-photos')
  WITH CHECK (bucket_id = 'task-photos');

DROP POLICY IF EXISTS "Authenticated delete task photos" ON storage.objects;
CREATE POLICY "Authenticated delete task photos"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'task-photos');

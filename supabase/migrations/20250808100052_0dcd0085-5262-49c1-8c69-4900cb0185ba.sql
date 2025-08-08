-- Ensure accept_project_invite creates assignment and adds employer org membership
create or replace function public.accept_project_invite(invite_id uuid)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $$
DECLARE
  v_email text;
  v_user_id uuid;
  v_inv project_invites%ROWTYPE;
  v_existing uuid;
BEGIN
  -- Require authenticated session with email
  v_email := nullif(auth.jwt() ->> 'email', '');
  IF v_email IS NULL THEN
    RAISE EXCEPTION 'Not authenticated with email';
  END IF;

  -- Load invite ensuring ownership and validity
  SELECT * INTO v_inv
  FROM public.project_invites pi
  WHERE pi.id = invite_id
    AND pi.accepted_at IS NULL
    AND pi.email = v_email
    AND (pi.expires_at IS NULL OR pi.expires_at > now())
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invite not found or already used/expired';
  END IF;

  -- Current user id
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- If an assignment already exists for this user+project+employer, mark invite accepted and return
  SELECT pa.id INTO v_existing
  FROM public.project_assignments pa
  WHERE pa.user_id = v_user_id
    AND pa.project_id = v_inv.project_id
    AND pa.employer_org_id = v_inv.employer_org_id
  LIMIT 1;

  IF v_existing IS NULL THEN
    INSERT INTO public.project_assignments
      (project_id, user_id, employer_org_id, is_external, accepted_at, role)
    VALUES
      (v_inv.project_id, v_user_id, v_inv.employer_org_id, true, now(), 'worker')
    ON CONFLICT DO NOTHING;
  END IF;

  -- Ensure the invited user is a member of the employer org, so they can select it later
  INSERT INTO public.organization_members (org_id, user_id, role)
  VALUES (v_inv.employer_org_id, v_user_id, 'worker')
  ON CONFLICT DO NOTHING;

  UPDATE public.project_invites
  SET accepted_at = now()
  WHERE id = v_inv.id;

  RETURN true;
END;
$$;
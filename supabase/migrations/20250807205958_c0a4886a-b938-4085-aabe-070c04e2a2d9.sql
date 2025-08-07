-- Allow workers to accept/decline their own pending invitations (project_assignments)
-- Policy: worker accepts own invite (update accepted_at from NULL)
DROP POLICY IF EXISTS "worker accepts own invite" ON public.project_assignments;
CREATE POLICY "worker accepts own invite"
ON public.project_assignments
FOR UPDATE
USING (user_id = auth.uid() AND accepted_at IS NULL)
WITH CHECK (user_id = auth.uid() AND accepted_at IS NOT NULL);

-- Policy: worker declines own invite (delete when still pending)
DROP POLICY IF EXISTS "worker declines own invite" ON public.project_assignments;
CREATE POLICY "worker declines own invite"
ON public.project_assignments
FOR DELETE
USING (user_id = auth.uid() AND accepted_at IS NULL);

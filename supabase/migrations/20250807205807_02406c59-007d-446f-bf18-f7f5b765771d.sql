-- Add accepted_at column for invitations workflow
ALTER TABLE public.project_assignments
ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ NULL;

-- Indexes to speed up common queries
-- Pending invites for a user
CREATE INDEX IF NOT EXISTS idx_project_assignments_user_pending
  ON public.project_assignments (user_id)
  WHERE accepted_at IS NULL;

-- Accepted assignments filtered by employer company
CREATE INDEX IF NOT EXISTS idx_project_assignments_user_employer_accepted
  ON public.project_assignments (user_id, employer_org_id)
  WHERE accepted_at IS NOT NULL;

-- Optional: quick lookup by project for membership checks
CREATE INDEX IF NOT EXISTS idx_project_assignments_project_user
  ON public.project_assignments (project_id, user_id);

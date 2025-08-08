
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type TaskRow = {
  id: string;
  title: string;
  status: string;
  assignee: string | null;
  project_id: string;
  phase_id: string | null;
};

export function useTasksByProjects(projectIds: string[]) {
  const { user } = useAuth();
  const enabled = (projectIds?.length ?? 0) > 0 && !!user?.id;

  return useQuery<TaskRow[]>({
    queryKey: ["tasks", { projectIds, userId: user?.id }],
    enabled,
    queryFn: async () => {
      // We fetch tasks within the assigned projects. RLS may require org membership;
      // if the current user is not allowed, this will throw and React Query will show the error state.
      const { data, error } = await supabase
        .from("tasks" as any)
        .select("*")
        .in("project_id", projectIds)
        .order("created_at", { ascending: false });

      if (error) throw error;
      const rows = (data ?? []) as any[];
      return rows.map((r) => ({
        id: r.id,
        title: r.title,
        status: r.status,
        assignee: r.assignee ?? null,
        project_id: r.project_id,
        phase_id: r.phase_id ?? null,
      })) as TaskRow[];
    },
    placeholderData: [],
    initialData: [],
  });
}


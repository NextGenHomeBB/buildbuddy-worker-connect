
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Phase = {
  id: string;
  project_id: string;
  name: string;
  order_no: number;
};

export function usePhasesByProjects(projectIds: string[]) {
  const enabled = (projectIds?.length ?? 0) > 0;

  return useQuery<Phase[]>({
    queryKey: ["phases", projectIds],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_phases" as any)
        .select("id, project_id, name, seq")
        .in("project_id", projectIds)
        .order("seq", { ascending: true });

      if (error) throw error;
      const rows = (data ?? []) as any[];
      return rows.map((r) => ({
        id: r.id,
        project_id: r.project_id,
        name: r.name,
        order_no: r.seq ?? 0,
      })) as Phase[];
    },
    placeholderData: [],
    initialData: [],
  });
}



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
        .from("phases")
        .select("id, project_id, name, order_no")
        .in("project_id", projectIds)
        .order("order_no", { ascending: true });

      if (error) throw error;
      return (data ?? []) as Phase[];
    },
    placeholderData: [],
    initialData: [],
  });
}


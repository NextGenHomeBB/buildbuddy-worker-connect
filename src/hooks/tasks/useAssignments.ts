
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export function useAssignments() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["my-assignments", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_assignments")
        .select("project_id")
        .eq("user_id", user!.id)
        .not("accepted_at", "is", null);

      if (error) throw error;
      const ids = Array.from(new Set((data ?? []).map((r: any) => r.project_id).filter(Boolean)));
      return ids as string[];
    },
    placeholderData: [],
    initialData: [],
  });
}


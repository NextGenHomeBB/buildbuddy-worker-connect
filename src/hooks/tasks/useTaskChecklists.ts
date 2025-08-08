
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ChecklistItem = {
  id: string;
  checklist_id: string;
  text: string;
  done: boolean;
  photo_path: string | null;
  position: number;
  updated_at: string;
};

export type Checklist = {
  id: string;
  title: string;
  position: number;
  items: ChecklistItem[];
};

export function useTaskChecklists(taskId: string | null) {
  const enabled = !!taskId;

  return useQuery<Checklist[]>({
    queryKey: ["task-checklists", taskId],
    enabled,
    queryFn: async () => {
      // Use embedded relationship to load items along with checklists
      const { data, error } = await supabase
        .from("task_checklists")
        .select("id, title, position, items:task_checklist_items(id, checklist_id, text, done, photo_path, position, updated_at)")
        .eq("task_id", taskId as string)
        .order("position", { ascending: true });

      if (error) throw error;

      // Ensure items are sorted by position
      const lists = (data ?? []).map((cl: any) => ({
        id: cl.id,
        title: cl.title,
        position: cl.position,
        items: (cl.items ?? []).sort((a: any, b: any) => a.position - b.position),
      })) as Checklist[];

      return lists;
    },
    placeholderData: [],
    initialData: [],
  });
}


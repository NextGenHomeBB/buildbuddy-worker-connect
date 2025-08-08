
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ChecklistItem = {
  id: string;
  checklist_id: string;
  text: string;
  done: boolean;
  position: number;
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
      // Load checklists for the task, then items in bulk
      const { data: clData, error: clErr } = await supabase
        .from("checklists" as any)
        .select("id, title, project_id, task_id, created_at")
        .eq("task_id", taskId as string)
        .order("created_at", { ascending: true });

      if (clErr) throw clErr;
      const checklists = (clData ?? []) as any[];
      const checklistIds = checklists.map((c) => c.id);
      if (checklistIds.length === 0) return [];

      const { data: itemsData, error: itemsErr } = await supabase
        .from("checklist_items" as any)
        .select("id, checklist_id, title, done, seq, created_at")
        .in("checklist_id", checklistIds);

      if (itemsErr) throw itemsErr;

      const itemsByChecklist: Record<string, any[]> = {};
      (itemsData ?? []).forEach((it: any) => {
        const arr = itemsByChecklist[it.checklist_id] || (itemsByChecklist[it.checklist_id] = []);
        arr.push(it);
      });

      const lists = checklists.map((cl: any, idx: number) => ({
        id: cl.id,
        title: cl.title,
        position: idx,
        items: (itemsByChecklist[cl.id] || [])
          .sort((a: any, b: any) => (a.seq ?? 0) - (b.seq ?? 0))
          .map(
            (it: any) =>
              ({
                id: it.id,
                checklist_id: it.checklist_id,
                text: it.title,
                done: !!it.done,
                position: it.seq ?? 0,
              } as ChecklistItem)
          ),
      })) as Checklist[];

      return lists;
    },
    placeholderData: [],
    initialData: [],
  });
}


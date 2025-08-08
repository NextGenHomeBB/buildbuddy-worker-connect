
import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTaskChecklists, ChecklistItem } from "@/hooks/tasks/useTaskChecklists";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  task: { id: string; title: string } | null;
};

export default function TaskDetailDialog({ open, onOpenChange, task }: Props) {
  const qc = useQueryClient();
  const { data: lists } = useTaskChecklists(task?.id ?? null);

  const toggleItem = useMutation({
    mutationFn: async (item: ChecklistItem) => {
      const next = !item.done;
      const { error } = await supabase
        .from("checklist_items" as any)
        .update({ done: next } as any)
        .eq("id", item.id);
      if (error) throw error;
      return { id: item.id, done: next };
    },
    onMutate: async (item) => {
      await qc.cancelQueries({ queryKey: ["task-checklists", task?.id] });
      const prev = qc.getQueryData<any>(["task-checklists", task?.id]);
      // Optimistically update
      qc.setQueryData<any>(["task-checklists", task?.id], (old: any) => {
        if (!old) return old;
        return old.map((cl: any) => ({
          ...cl,
          items: cl.items.map((it: any) => (it.id === item.id ? { ...it, done: !it.done } : it)),
        }));
      });
      return { prev };
    },
    onError: (_e, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(["task-checklists", task?.id], ctx.prev);
      toast({ title: "Failed to update item" });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["task-checklists", task?.id] });
    },
  });

  



  const content = useMemo(() => {
    if (!lists || lists.length === 0) {
      return <div className="text-sm text-muted-foreground">No checklist items.</div>;
    }
    return (
      <div className="space-y-4">
        {lists.map((cl) => (
          <div key={cl.id} className="space-y-2">
            <div className="font-medium">{cl.title}</div>
            <ul className="space-y-2">
              {cl.items.map((it) => (
                <li key={it.id} className="flex items-center gap-2">
                  <Checkbox
                    id={it.id}
                    checked={it.done}
                    onCheckedChange={() => toggleItem.mutate(it)}
                  />
                  <label htmlFor={it.id} className="text-sm flex-1">{it.text}</label>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    );
  }, [lists, toggleItem]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{task?.title || "Task"}</DialogTitle>
        </DialogHeader>
        <div className="pt-2">{content}</div>
        <div className="mt-4 flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}



import { useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
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
        .from("task_checklist_items")
        .update({ done: next })
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

  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const uploadPhoto = useMutation({
    mutationFn: async ({ item, file }: { item: ChecklistItem; file: File }) => {
      const path = `${task!.id}/${item.id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("task-photos")
        .upload(path, file, { upsert: false });
      if (uploadError) throw uploadError;

      const { error: updateError } = await supabase
        .from("task_checklist_items")
        .update({ photo_path: path })
        .eq("id", item.id);
      if (updateError) throw updateError;

      return path;
    },
    onSuccess: () => {
      toast({ title: "Photo attached" });
      qc.invalidateQueries({ queryKey: ["task-checklists", task?.id] });
    },
    onError: (e: any) => {
      toast({ title: "Upload failed", description: e?.message || String(e) });
    },
  });

  const publicUrlFor = (path?: string | null) => {
    if (!path) return null;
    const { data } = supabase.storage.from("task-photos").getPublicUrl(path);
    return data?.publicUrl ?? null;
  };

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
              {cl.items.map((it) => {
                const url = publicUrlFor(it.photo_path);
                return (
                  <li key={it.id} className="flex items-center gap-2">
                    <Checkbox
                      id={it.id}
                      checked={it.done}
                      onCheckedChange={() => toggleItem.mutate(it)}
                    />
                    <label htmlFor={it.id} className="text-sm flex-1">{it.text}</label>

                    {url ? (
                      <a
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs underline text-primary"
                      >
                        View photo
                      </a>
                    ) : (
                      <>
                        <input
                          ref={(el) => (fileInputRefs.current[it.id] = el)}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            uploadPhoto.mutate({ item: it, file });
                            // reset value to allow re-uploading the same file name
                            e.currentTarget.value = "";
                          }}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => fileInputRefs.current[it.id]?.click()}
                        >
                          Add photo
                        </Button>
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    );
  }, [lists, toggleItem, uploadPhoto]);

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


import MobileLayout from "@/components/layout/MobileLayout";
import { SEO } from "@/components/SEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useAssignments } from "@/hooks/tasks/useAssignments";
import { usePhasesByProjects } from "@/hooks/tasks/usePhasesByProjects";
import { useTasksByProjects, TaskRow } from "@/hooks/tasks/useTasksByProjects";
import TaskDetailDialog from "@/components/tasks/TaskDetailDialog";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export default function Tasks() {
  const qc = useQueryClient();

  // 1) Load my accepted assignments => project ids
  const assignments = useAssignments();
  const projectIds = assignments.data ?? [];

  // 2) Load phases and tasks for these projects
  const { data: phases = [] } = usePhasesByProjects(projectIds);
  const { data: tasks = [], error: tasksError } = useTasksByProjects(projectIds);

  // 3) Group tasks by phase
  const phaseMap = useMemo(() => {
    const m = new Map<string, { id: string; name: string; project_id: string; order_no: number }>();
    phases.forEach((p) => m.set(p.id, p));
    return m;
  }, [phases]);

  const groups = useMemo(() => {
    const by: Record<string, { title: string; items: TaskRow[] }> = {};
    const noPhaseKey = "__no_phase__";
    const ensure = (key: string, title: string) => {
      if (!by[key]) by[key] = { title, items: [] };
      return by[key];
    };

    (tasks ?? []).forEach((t) => {
      if (t.phase_id && phaseMap.has(t.phase_id)) {
        const ph = phaseMap.get(t.phase_id)!;
        ensure(ph.id, ph.name).items.push(t);
      } else {
        ensure(noPhaseKey, "No phase").items.push(t);
      }
    });

    // Order groups by phase order_no; keep "No phase" last
    const ordered = Object.entries(by).sort((a, b) => {
      if (a[0] === "__no_phase__") return 1;
      if (b[0] === "__no_phase__") return -1;
      const ao = phaseMap.get(a[0]!)?.order_no ?? 0;
      const bo = phaseMap.get(b[0]!)?.order_no ?? 0;
      return ao - bo;
    });

    return ordered.map(([key, val]) => ({ key, title: val.title, items: val.items }));
  }, [tasks, phaseMap]);

  // 4) Task detail dialog state
  const [open, setOpen] = useState(false);
  const [activeTask, setActiveTask] = useState<TaskRow | null>(null);

  // 5) Realtime subscriptions: tasks / task_checklists / task_checklist_items
  useEffect(() => {
    if (projectIds.length === 0) return;

    const idsList = projectIds.join(",");
    const channel = supabase
      .channel("tasks-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks", filter: `project_id=in.(${idsList})` },
        () => {
          console.log("[realtime] tasks changed");
          qc.invalidateQueries({ queryKey: ["tasks"] });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "checklists" },
        () => {
          console.log("[realtime] task_checklists changed");
          if (activeTask?.id) qc.invalidateQueries({ queryKey: ["task-checklists", activeTask.id] });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "checklist_items" },
        () => {
          console.log("[realtime] task_checklist_items changed");
          if (activeTask?.id) qc.invalidateQueries({ queryKey: ["task-checklists", activeTask.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectIds, qc, activeTask?.id]);

  // 6) Render
  return (
    <MobileLayout title="Tasks & Checklists">
      <SEO title="Tasks & Checklists" description="View and complete assigned tasks" path="/tasks" />

      {assignments.isLoading ? (
        <div className="text-sm text-muted-foreground">Loading assignments…</div>
      ) : projectIds.length === 0 ? (
        <div className="rounded-lg border p-4 text-sm text-muted-foreground">No projects yet.</div>
      ) : tasksError ? (
        <div className="rounded-lg border p-4 text-sm text-destructive">Couldn't load tasks. Make sure you're a member of the project owner org or ask your manager to grant access.</div>
      ) : groups.length === 0 ? (
        <div className="text-sm text-muted-foreground">No tasks assigned.</div>
      ) : (
        <section className="grid gap-4">
          {groups.map((g) => (
            <Card key={g.key}>
              <CardHeader>
                <CardTitle>{g.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {g.items.map((t) => (
                    <li key={t.id} className="flex items-center justify-between">
                      <div className="text-sm">{t.title}</div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setActiveTask(t);
                          setOpen(true);
                        }}
                      >
                        Open
                      </Button>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </section>
      )}

      <TaskDetailDialog
        open={open}
        onOpenChange={setOpen}
        task={activeTask ? { id: activeTask.id, title: activeTask.title } : null}
      />
    </MobileLayout>
  );
}

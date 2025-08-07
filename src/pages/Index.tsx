import MobileLayout from "@/components/layout/MobileLayout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { NavLink } from "react-router-dom";
import { Clock } from "lucide-react";

interface ActiveTimer {
  startedAt: number;
}

export default function Index() {
  const qc = useQueryClient();
  const { data: activeTimer } = useQuery<ActiveTimer | null>({
    queryKey: ["activeTimer"],
    enabled: false,
    initialData: null,
  });

  const start = useMutation({
    mutationFn: async () => ({ startedAt: Date.now() }),
    onSuccess: (data: ActiveTimer) => {
      qc.setQueryData(["activeTimer"], data);
      toast({ title: "Clocked in" });
    },
  });

  const stop = useMutation({
    mutationFn: async () => {
      const timer = qc.getQueryData<ActiveTimer | null>(["activeTimer"]);
      const logs = (qc.getQueryData<any[]>(["timeLogs"]) ?? []) as any[];
      if (timer) {
        logs.unshift({
          id: crypto.randomUUID(),
          startedAt: timer.startedAt,
          stoppedAt: Date.now(),
          status: "draft",
        });
        qc.setQueryData(["timeLogs"], logs);
      }
      return true;
    },
    onSuccess: () => {
      qc.setQueryData(["activeTimer"], null);
      toast({ title: "Clocked out", description: "Review draft in Timer tab" });
    },
  });

  const { data: tasksDue = [] } = useQuery({
    queryKey: ["tasks"],
    enabled: false,
    initialData: [
      { id: "t1", title: "Safety check", due: new Date().toISOString(), completed: false },
      { id: "t2", title: "Daily report", due: new Date().toISOString(), completed: false },
    ],
  });

  const runningFor = activeTimer
    ? Math.floor((Date.now() - activeTimer.startedAt) / 60000)
    : 0;

  return (
    <MobileLayout title="Home">
      <SEO title="Home" description="Clock in/out, see shifts and tasks" path="/" />

      <section className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Clock /> Quick Clock</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {activeTimer ? `Running for ~${runningFor} min` : "You are off the clock"}
            </div>
            {activeTimer ? (
              <Button variant="destructive" onClick={() => stop.mutate()}>Clock out</Button>
            ) : (
              <Button variant="hero" onClick={() => start.mutate()}>Clock in</Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>My shifts today</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            No shifts assigned. Contact your dispatcher.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tasks due today</CardTitle>
          </CardHeader>
          <CardContent>
            {tasksDue.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tasks for today.</p>
            ) : (
              <ul className="list-disc pl-5 text-sm">
                {tasksDue.map((t) => (
                  <li key={t.id}>{t.title}</li>
                ))}
              </ul>
            )}
            <div className="mt-3">
              <NavLink to="/tasks" className="underline text-primary">Go to Tasks →</NavLink>
            </div>
          </CardContent>
        </Card>

        <div className="rounded-lg border p-3 text-xs text-muted-foreground">
          To enable realtime sync and approvals, connect this project to Supabase (same backend as Admin).
        </div>
      </section>
    </MobileLayout>
  );
}

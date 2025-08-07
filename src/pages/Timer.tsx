import MobileLayout from "@/components/layout/MobileLayout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

export default function Timer() {
  const qc = useQueryClient();
  const { data: activeTimer } = useQuery<any>({ queryKey: ["activeTimer"], initialData: null });
  const { data: timeLogs = [] } = useQuery<any[]>({ queryKey: ["timeLogs"], initialData: [] });

  const stopAndSave = useMutation({
    mutationFn: async (payload: { note?: string }) => {
      const timer = qc.getQueryData<any>(["activeTimer"]);
      if (!timer) return false;
      const log = {
        id: crypto.randomUUID(),
        startedAt: timer.startedAt,
        stoppedAt: Date.now(),
        note: payload.note ?? "",
        status: "draft" as const,
      };
      const next = [log, ...timeLogs];
      qc.setQueryData(["timeLogs"], next);
      qc.setQueryData(["activeTimer"], null);
      return true;
    },
  });

  const submitLog = useMutation({
    mutationFn: async (id: string) => {
      const next = timeLogs.map((l) => (l.id === id ? { ...l, status: "submitted" } : l));
      qc.setQueryData(["timeLogs"], next);
      return true;
    },
  });

  const runningFor = activeTimer
    ? Math.floor((Date.now() - activeTimer.startedAt) / 60000)
    : 0;

  return (
    <MobileLayout title="Timer">
      <SEO title="Timer & Time Logs" description="Track time per task and submit logs" path="/timer" />

      <section className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Active timer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {activeTimer ? (
              <TimerStopForm onStop={(note) => stopAndSave.mutate({ note })} runningFor={runningFor} />
            ) : (
              <p className="text-sm text-muted-foreground">No active timer. Start one from Home.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>My time logs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {timeLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No logs yet.</p>
            ) : (
              <ul className="space-y-2">
                {timeLogs.map((l) => (
                  <li key={l.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="text-sm">
                      <div>
                        {new Date(l.startedAt).toLocaleTimeString()} – {new Date(l.stoppedAt).toLocaleTimeString()}
                      </div>
                      {l.note && <div className="text-muted-foreground">{l.note}</div>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{l.status}</span>
                      {l.status === "draft" && (
                        <Button size="sm" onClick={() => submitLog.mutate(l.id)}>Submit</Button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>
    </MobileLayout>
  );
}

function TimerStopForm({ onStop, runningFor }: { onStop: (note?: string) => void; runningFor: number }) {
  const [note, setNote] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onStop(note);
      }}
      className="space-y-3"
    >
      <div className="text-sm text-muted-foreground">Running for ~{runningFor} min</div>
      <div className="grid gap-1">
        <label className="text-sm">Notes</label>
        <Textarea placeholder="What did you work on?" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      <div className="flex items-center gap-2">
        <Button type="submit" variant="destructive">Stop & Save Draft</Button>
      </div>
    </form>
  );
}

import MobileLayout from "@/components/layout/MobileLayout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useSession } from "@/hooks/useSession";

interface Assignment {
  id: string;
  project_id: string;
  employer_org_id: string;
  is_external: boolean | null;
  accepted_at: string | null;
}

interface ProjectInfo { id: string; name: string; owner_org_id: string }

export default function Timer() {
  const qc = useQueryClient();
  const { user } = useSession();
  const employerOrgId = typeof window !== 'undefined' ? localStorage.getItem('employer_org_id') : null;

  const [selectedAssignment, setSelectedAssignment] = useState<string>("");

  // Accepted assignments for this user and selected company
  const { data: assignments = [], isLoading: loadingAssignments } = useQuery<Assignment[]>({
    queryKey: ["assignments", user?.id, employerOrgId],
    enabled: !!user?.id && !!employerOrgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_assignments")
        .select("id, project_id, employer_org_id, is_external, accepted_at, user_id")
        .eq("user_id", user!.id)
        .eq("employer_org_id", employerOrgId)
        .not("accepted_at", "is", null);
      if (error) throw error;
      return (data as any[]).map((d) => ({
        id: d.id,
        project_id: d.project_id,
        employer_org_id: d.employer_org_id,
        is_external: d.is_external,
        accepted_at: d.accepted_at,
      }));
    },
  });

  const projectIds = useMemo(() => Array.from(new Set(assignments.map(a => a.project_id))), [assignments]);
  const { data: projectsMap } = useQuery<Map<string, ProjectInfo>>({
    queryKey: ["projects-for-assignments", projectIds],
    enabled: projectIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name, org_id")
        .in("id", projectIds);
      if (error) throw error;
      const map = new Map<string, ProjectInfo>();
      (data ?? []).forEach((p: any) => map.set(p.id, { id: p.id, name: p.name, owner_org_id: p.org_id }));
      return map;
    },
  });

  // Active timer (draft without end)
  const { data: activeTimer } = useQuery<any | null>({
    queryKey: ["activeTimer"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("time_logs")
        .select("id, project_id, assignment_id, employer_org_id, org_id, started_at, ended_at, status")
        .eq("status", "draft")
        .is("ended_at", null)
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  // My recent time logs
  const { data: timeLogs = [], isLoading: loadingLogs } = useQuery<any[]>({
    queryKey: ["timeLogs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("time_logs")
        .select("id, project_id, assignment_id, employer_org_id, org_id, note, status, started_at, ended_at")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as any[];
    },
  });

  const startTimer = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Not signed in");
      if (!employerOrgId) throw new Error("Select a company first");
      const a = assignments.find(a => a.id === selectedAssignment);
      if (!a) throw new Error("Select a project assignment to start the timer");
      const { error } = await supabase
        .from("time_logs")
        .insert({
          project_id: a.project_id,
          assignment_id: a.id,
          employer_org_id: a.employer_org_id,
          org_id: employerOrgId,
          user_id: user.id,
          started_at: new Date().toISOString(),
          status: "draft",
        });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Timer started" });
      qc.invalidateQueries({ queryKey: ["activeTimer"] });
      qc.invalidateQueries({ queryKey: ["timeLogs"] });
    },
    onError: (e: any) => {
      const msg = /row-level security|permission/i.test(e?.message || "")
        ? "You’re not assigned to this project."
        : e?.message || String(e);
      toast({ title: "Start failed", description: msg });
    },
  });

  const stopTimer = useMutation({
    mutationFn: async () => {
      if (!activeTimer?.id) return;
      const { error } = await supabase
        .from("time_logs")
        .update({ ended_at: new Date().toISOString() })
        .eq("id", activeTimer.id)
        .is("ended_at", null);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Timer stopped" });
      qc.invalidateQueries({ queryKey: ["activeTimer"] });
      qc.invalidateQueries({ queryKey: ["timeLogs"] });
    },
    onError: (e: any) => {
      toast({ title: "Stop failed", description: e?.message || String(e) });
    }
  });

  const submitLog = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("time_logs")
        .update({ status: "submitted" })
        .eq("id", id)
        .eq("status", "draft");
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Log submitted" });
      qc.invalidateQueries({ queryKey: ["timeLogs"] });
    },
    onError: (e: any) => {
      toast({ title: "Submit failed", description: e?.message || String(e) });
    }
  });

  const runningFor = activeTimer?.started_at
    ? Math.floor((Date.now() - new Date(activeTimer.started_at).getTime()) / 60000)
    : 0;

  const canStart = !!selectedAssignment && !activeTimer;

  return (
    <MobileLayout title="Timer">
      <SEO title="Timer & Time Logs" description="Track time per project and submit logs" path="/timer" />

      <section className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Active timer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {activeTimer ? (
              <TimerStopForm onStop={() => stopTimer.mutate()} runningFor={runningFor} />
            ) : (
              <div className="grid gap-3">
                {!employerOrgId && (
                  <div className="text-sm text-muted-foreground">Select a company to start tracking.</div>
                )}
                <div className="grid gap-1">
                  <label className="text-sm">Project</label>
                  <Select value={selectedAssignment} onValueChange={setSelectedAssignment}>
                    <SelectTrigger>
                      <SelectValue placeholder={loadingAssignments ? "Loading…" : "Choose a project"} />
                    </SelectTrigger>
                    <SelectContent>
                      {assignments.map((a) => {
                        const p = projectsMap?.get(a.project_id);
                        return (
                          <SelectItem key={a.id} value={a.id}>
                            {p?.name || a.project_id}
                            {a.is_external ? "  • External" : ""}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Button onClick={() => startTimer.mutate()} disabled={!canStart}>Start timer</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>My time logs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loadingLogs ? (
              <div className="text-sm text-muted-foreground">Loading…</div>
            ) : timeLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No logs yet.</p>
            ) : (
              <ul className="space-y-2">
                {timeLogs.map((l) => {
                  const p = projectsMap?.get(l.project_id);
                  const isExternal = l.employer_org_id && p?.owner_org_id && l.employer_org_id !== p.owner_org_id;
                  return (
                    <li key={l.id} className="flex items-center justify-between rounded-lg border p-3">
                      <div className="text-sm">
                        <div className="flex items-center gap-2">
                          <span>{p?.name || l.project_id}</span>
                          {isExternal && <Badge variant="outline">External</Badge>}
                        </div>
                        <div>
                          {new Date(l.started_at).toLocaleTimeString()} {l.ended_at ? `– ${new Date(l.ended_at).toLocaleTimeString()}` : "(running)"}
                        </div>
                        {l.note && <div className="text-muted-foreground">{l.note}</div>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{l.status}</span>
                        {l.status === "draft" && l.ended_at && (
                          <Button size="sm" onClick={() => submitLog.mutate(l.id)}>Submit</Button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>
    </MobileLayout>
  );
}

function TimerStopForm({ onStop, runningFor }: { onStop: () => void; runningFor: number }) {
  const [note, setNote] = useState("");
  useEffect(() => { setNote(""); }, []);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onStop();
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

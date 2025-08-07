import MobileLayout from "@/components/layout/MobileLayout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { NavLink, useNavigate } from "react-router-dom";
import { Clock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface ActiveTimer {
  startedAt: number;
}

export default function Index() {
  
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { data: activeTimer } = useQuery<any | null>({
    queryKey: ["activeTimer"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("time_logs")
        .select("id, started_at, ended_at, status")
        .eq("status", "draft")
        .is("ended_at", null)
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
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

  const runningFor = activeTimer?.started_at
    ? Math.floor((Date.now() - new Date(activeTimer.started_at).getTime()) / 60000)
    : 0;

  if (!loading && !user) {
    return (
      <MobileLayout title="Home">
        <SEO title="Login required" description="Sign in to access your projects" path="/" />
        <section className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Welcome</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">Please sign in to continue.</div>
              <NavLink to="/auth" className="underline text-primary">Go to Login →</NavLink>
            </CardContent>
          </Card>
        </section>
      </MobileLayout>
    );
  }

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
                <Button variant="destructive" onClick={() => navigate("/timer")}>Clock out</Button>
              ) : (
                <Button variant="hero" onClick={() => navigate("/timer")}>Clock in</Button>
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

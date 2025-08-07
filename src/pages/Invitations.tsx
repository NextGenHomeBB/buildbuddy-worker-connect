import MobileLayout from "@/components/layout/MobileLayout";
import { SEO } from "@/components/SEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Assignment {
  id: string;
  user_id: string;
  project_id: string;
  employer_org_id: string;
  accepted_at: string | null;
}

export default function Invitations() {
  const qc = useQueryClient();

  const { data: invites = [], isLoading } = useQuery<Assignment[]>({
    queryKey: ["invites"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_assignments")
        .select("id, user_id, project_id, employer_org_id, accepted_at")
        .is("accepted_at", null);
      if (error) throw error;
      return data as any;
    },
  });

  const projectIds = Array.from(new Set(invites.map((i) => i.project_id)));
  const ownerMap = useQuery({
    queryKey: ["invite-projects", projectIds],
    enabled: projectIds.length > 0,
    queryFn: async () => {
      const { data: projects, error } = await supabase
        .from("projects")
        .select("id, name, org_id")
        .in("id", projectIds);
      if (error) throw error;
      const ownerIds = Array.from(new Set((projects ?? []).map((p: any) => p.org_id)));
      const { data: orgs } = await supabase
        .from("organizations")
        .select("id, name")
        .in("id", ownerIds);
      const orgMap = new Map((orgs ?? []).map((o: any) => [o.id, o.name]));
      const map = new Map<string, { name: string; owner_org_id: string; owner_name: string }>();
      (projects ?? []).forEach((p: any) => {
        map.set(p.id, { name: p.name, owner_org_id: p.org_id, owner_name: orgMap.get(p.org_id) || "" });
      });
      return map;
    },
  });

  const accept = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("project_assignments")
        .update({ accepted_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Invitation accepted" });
      qc.invalidateQueries({ queryKey: ["invites"] });
    },
    onError: (e: any) => {
      const msg = e?.code === "403" || /row-level security/i.test(e?.message || "")
        ? "You are not allowed to accept this invite."
        : e?.message || String(e);
      toast({ title: "Error", description: msg });
    },
  });

  const decline = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("project_assignments")
        .delete()
        .eq("id", id)
        .is("accepted_at", null);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Invitation declined" });
      qc.invalidateQueries({ queryKey: ["invites"] });
    },
    onError: (e: any) => {
      const msg = e?.code === "403" || /row-level security/i.test(e?.message || "")
        ? "You are not allowed to decline this invite."
        : e?.message || String(e);
      toast({ title: "Error", description: msg });
    },
  });

  return (
    <MobileLayout title="Invitations">
      <SEO title="Project Invitations" description="Accept or decline project invites" path="/invitations" />
      <section className="grid gap-4">
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : invites.length === 0 ? (
          <div className="text-sm text-muted-foreground">No pending invitations.</div>
        ) : (
          invites.map((inv) => {
            const proj = ownerMap.data?.get(inv.project_id);
            return (
              <Card key={inv.id}>
                <CardHeader>
                  <CardTitle>{proj?.name || inv.project_id}</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Owner: {proj?.owner_name || proj?.owner_org_id || ""}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="secondary" onClick={() => decline.mutate(inv.id)}>Decline</Button>
                    <Button size="sm" onClick={() => accept.mutate(inv.id)}>Accept</Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </section>
    </MobileLayout>
  );
}

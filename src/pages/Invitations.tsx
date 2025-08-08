import MobileLayout from "@/components/layout/MobileLayout";
import { SEO } from "@/components/SEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useSession } from "@/hooks/useSession";
import { useNavigate } from "react-router-dom";

interface AssignmentRow {
  id: string;
  user_id: string;
  project_id: string;
  employer_org_id: string;
  accepted_at: string | null;
}

interface InviteRow {
  id: string;
  project_id: string;
  employer_org_id: string;
  email: string;
  accepted_at: string | null;
}

export default function Invitations() {
  const qc = useQueryClient();
  const { user } = useSession();
  const navigate = useNavigate();

  // Pending direct assignments
  const { data: assignments = [], isLoading: loadingAssignments } = useQuery<AssignmentRow[]>({
    queryKey: ["invites", "assignments", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_assignments")
        .select("id, user_id, project_id, employer_org_id, accepted_at")
        .eq("user_id", user!.id)
        .is("accepted_at", null);
      if (error) throw error;
      return data as any;
    },
  });

  // Email invitations (RLS limits by auth email automatically)
  const { data: emailInvites = [], isLoading: loadingEmailInvites } = useQuery<InviteRow[]>({
    queryKey: ["invites", "email"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_invites")
        .select("id, project_id, employer_org_id, email, accepted_at")
        .is("accepted_at", null);
      if (error) throw error;
      return data as any;
    },
  });

  const projectIds = Array.from(new Set([
    ...assignments.map((i) => i.project_id),
    ...emailInvites.map((i) => i.project_id),
  ]));

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

  const acceptAssignment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("project_assignments")
        .update({ accepted_at: new Date().toISOString() })
        .eq("id", id)
        .is("accepted_at", null);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Invitation accepted" });
      qc.invalidateQueries({ queryKey: ["invites"] });
      const next = localStorage.getItem("employer_org_id") ? "/" : "/settings/company";
      navigate(next, { replace: true });
    },
    onError: (e: any) => {
      const msg = e?.code === "403" || /row-level security/i.test(e?.message || "")
        ? "You are not allowed to accept this invite."
        : e?.message || String(e);
      toast({ title: "Error", description: msg });
    },
  });

  const declineAssignment = useMutation({
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

  const acceptEmailInvite = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("accept_project_invite", { invite_id: id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Invitation accepted" });
      qc.invalidateQueries({ queryKey: ["invites"] });
      const next = localStorage.getItem("employer_org_id") ? "/" : "/settings/company";
      navigate(next, { replace: true });
    },
    onError: (e: any) => {
      const msg = e?.code === "403" || /row-level security|permission/i.test(e?.message || "")
        ? "You’re not allowed to accept this invite."
        : e?.message || String(e);
      toast({ title: "Error", description: msg });
    },
  });

  const declineEmailInvite = useMutation({
    mutationFn: async (id: string) => {
      // Mark as handled without creating an assignment
      const { error } = await supabase
        .from("project_invites")
        .update({ accepted_at: new Date().toISOString() })
        .eq("id", id)
        .is("accepted_at", null);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Invitation declined" });
      qc.invalidateQueries({ queryKey: ["invites"] });
    },
    onError: (e: any) => {
      toast({ title: "Error", description: e?.message || String(e) });
    },
  });

  const nothing = (assignments.length === 0 && emailInvites.length === 0);

  return (
    <MobileLayout title="Invitations">
      <SEO title="Project Invitations" description="Accept or decline project invites" path="/invitations" />
      <section className="grid gap-4">
        {loadingAssignments || loadingEmailInvites ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : nothing ? (
          <div className="text-sm text-muted-foreground">No pending invitations.</div>
        ) : (
          <>
            {assignments.map((inv) => {
              const proj = ownerMap.data?.get(inv.project_id);
              return (
                <Card key={`a-${inv.id}`}>
                  <CardHeader>
                    <CardTitle>{proj?.name || inv.project_id}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">Owner: {proj?.owner_name || proj?.owner_org_id || ""}</div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="secondary" onClick={() => declineAssignment.mutate(inv.id)}>Decline</Button>
                      <Button size="sm" onClick={() => acceptAssignment.mutate(inv.id)}>Accept</Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {emailInvites.map((inv) => {
              const proj = ownerMap.data?.get(inv.project_id);
              return (
                <Card key={`e-${inv.id}`}>
                  <CardHeader>
                    <CardTitle>{proj?.name || inv.project_id}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">Owner: {proj?.owner_name || proj?.owner_org_id || ""}</div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="secondary" onClick={() => declineEmailInvite.mutate(inv.id)}>Decline</Button>
                      <Button size="sm" onClick={() => acceptEmailInvite.mutate(inv.id)}>Accept</Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </>
        )}
      </section>
    </MobileLayout>
  );
}

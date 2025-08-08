import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { CompanySelector, OrgOption } from "@/components/CompanySelector";
import { supabase } from "@/integrations/supabase/client";

const STORAGE_ID = "employer_org_id";
const STORAGE_NAME = "employer_org_name";

export default function CompanyChip() {
  const [open, setOpen] = useState(false);
  const [org, setOrg] = useState<OrgOption | null>(null);

  // Load from storage, validate membership or assignment
  useEffect(() => {
    const storedId = localStorage.getItem(STORAGE_ID);
    const storedName = localStorage.getItem(STORAGE_NAME);
    if (!storedId) return;
    (async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        const uid = userData.user?.id;

        const [{ data: memberships }, { data: assigns }] = await Promise.all([
          supabase
            .from("organization_members")
            .select("org_id")
            .eq("org_id", storedId)
            .limit(1),
          uid
            ? supabase
                .from("project_assignments")
                .select("id")
                .eq("user_id", uid)
                .eq("employer_org_id", storedId)
                .not("accepted_at", "is", null)
                .limit(1)
            : supabase
                .from("project_assignments")
                .select("id")
                .eq("employer_org_id", storedId)
                .not("accepted_at", "is", null)
                .limit(1),
        ]);

        const hasMembership = (memberships ?? []).length === 1;
        const hasAssignment = (assigns ?? []).length === 1;

        if (hasMembership || hasAssignment) {
          setOrg({ id: storedId, name: storedName || "Selected company" });
        } else {
          localStorage.removeItem(STORAGE_ID);
          localStorage.removeItem(STORAGE_NAME);
          setOrg(null);
        }
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  // If multiple memberships/assignments and none selected, require selection; if exactly one, auto-select
  useEffect(() => {
    (async () => {
      if (org) return;
      const storedId = localStorage.getItem(STORAGE_ID);
      if (storedId) return;

      try {
        const { data: userData } = await supabase.auth.getUser();
        const uid = userData.user?.id;

        const [{ data: memberships }, { data: assignments }] = await Promise.all([
          supabase
            .from("organization_members")
            .select("org_id")
            .order("created_at", { ascending: false }),
          uid
            ? supabase
                .from("project_assignments")
                .select("employer_org_id")
                .eq("user_id", uid)
                .not("accepted_at", "is", null)
            : supabase
                .from("project_assignments")
                .select("employer_org_id")
                .not("accepted_at", "is", null),
        ]);

        const memberIds = (memberships ?? []).map((m: any) => m.org_id);
        const employerIds = (assignments ?? []).map((a: any) => a.employer_org_id);
        const ids = Array.from(new Set([...memberIds, ...employerIds].filter(Boolean)));

        if (ids.length === 0) return;
        if (ids.length === 1) {
          const onlyId = ids[0];
          const { data: orgs } = await supabase
            .from("organizations")
            .select("id, name")
            .in("id", ids)
            .limit(1);
          const only = (orgs ?? [])[0];
          if (only) {
            localStorage.setItem(STORAGE_ID, only.id);
            localStorage.setItem(STORAGE_NAME, only.name);
            setOrg({ id: only.id, name: only.name });
          }
        } else {
          setOpen(true);
        }
      } catch (e) {
        console.error(e);
      }
    })();
  }, [org]);

  const label = useMemo(() => (org ? `Company: ${org.name}` : "Select company"), [org]);

  return (
    <>
      <CompanySelector
        open={open}
        onOpenChange={setOpen}
        onSelected={(o) => {
          localStorage.setItem(STORAGE_ID, o.id);
          localStorage.setItem(STORAGE_NAME, o.name);
          setOrg(o);
          setOpen(false);
        }}
      />
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        {label}
      </Button>
    </>
  );
}

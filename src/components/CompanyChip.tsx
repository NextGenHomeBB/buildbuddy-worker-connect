import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { CompanySelector, OrgOption } from "@/components/CompanySelector";
import { supabase } from "@/integrations/supabase/client";

const STORAGE_ID = "employer_org_id";
const STORAGE_NAME = "employer_org_name";

export default function CompanyChip() {
  const [open, setOpen] = useState(false);
  const [org, setOrg] = useState<OrgOption | null>(null);

  // Load from storage, validate membership
  useEffect(() => {
    const storedId = localStorage.getItem(STORAGE_ID);
    const storedName = localStorage.getItem(STORAGE_NAME);
    if (!storedId) return;
    (async () => {
      // Ensure user is still a member of this org
      const { data: memberships } = await supabase
        .from("organization_members")
        .select("org_id")
        .eq("org_id", storedId)
        .limit(1);
      if ((memberships ?? []).length === 1) {
        setOrg({ id: storedId, name: storedName || "Selected company" });
      } else {
        localStorage.removeItem(STORAGE_ID);
        localStorage.removeItem(STORAGE_NAME);
        setOrg(null);
      }
    })();
  }, []);

  // If multiple memberships and none selected, require selection; if exactly one, auto-select
  useEffect(() => {
    (async () => {
      if (org) return;
      const storedId = localStorage.getItem(STORAGE_ID);
      if (storedId) return;
      const { data: memberships } = await supabase
        .from("organization_members")
        .select("org_id")
        .order("created_at", { ascending: false });
      const ids = Array.from(new Set((memberships ?? []).map((m: any) => m.org_id)));
      if (ids.length === 0) return;
      if (ids.length === 1) {
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

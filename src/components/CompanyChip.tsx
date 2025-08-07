import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { CompanySelector, OrgOption } from "@/components/CompanySelector";
import { supabase } from "@/integrations/supabase/client";

const STORAGE_ID = "bb_employer_org_id";
const STORAGE_NAME = "bb_employer_org_name";

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

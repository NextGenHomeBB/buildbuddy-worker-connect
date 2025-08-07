import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export type OrgOption = { id: string; name: string };

export function CompanySelector({
  open,
  onOpenChange,
  onSelected,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSelected: (org: OrgOption) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<OrgOption[]>([]);
  const [value, setValue] = useState<string>("");

  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoading(true);
      // Get organizations where the user is a member
      const { data: memberships } = await supabase
        .from("organization_members")
        .select("org_id")
        .order("created_at", { ascending: false });

      const ids = Array.from(new Set((memberships ?? []).map((m: any) => m.org_id)));
      if (ids.length === 0) {
        setOptions([]);
        setLoading(false);
        return;
      }
      const { data: orgs } = await supabase
        .from("organizations")
        .select("id, name")
        .in("id", ids);

      setOptions((orgs ?? []).map((o: any) => ({ id: o.id, name: o.name })));
      setLoading(false);
    })();
  }, [open]);

  const canSave = useMemo(() => !!value, [value]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Select your company</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <Select onValueChange={setValue} value={value}>
            <SelectTrigger>
              <SelectValue placeholder={loading ? "Loading..." : "Choose company"} />
            </SelectTrigger>
            <SelectContent>
              {options.map((o) => (
                <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button
              onClick={() => {
                const org = options.find((o) => o.id === value);
                if (org) onSelected(org);
              }}
              disabled={!canSave}
            >
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

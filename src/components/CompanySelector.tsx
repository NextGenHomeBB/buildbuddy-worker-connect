import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoading(true);
      try {
        // Current user id for filtering assignments
        const { data: userData } = await supabase.auth.getUser();
        const uid = userData.user?.id;

        // Fetch org memberships and employer orgs from assignments in parallel
        const [{ data: memberships }, { data: assignments }] = await Promise.all([
          supabase.from("organization_members").select("org_id").order("created_at", { ascending: false }),
          uid
            ? supabase.from("project_assignments").select("employer_org_id").eq("user_id", uid).not("accepted_at", "is", null)
            : supabase.from("project_assignments").select("employer_org_id").not("accepted_at", "is", null),
        ]);

        const memberIds = (memberships ?? []).map((m: any) => m.org_id);
        const employerIds = (assignments ?? []).map((a: any) => a.employer_org_id);
        const ids = Array.from(new Set([...memberIds, ...employerIds].filter(Boolean)));

        if (ids.length === 0) {
          setOptions([]);
          return;
        }

        const { data: orgs } = await supabase
          .from("organizations")
          .select("id, name")
          .in("id", ids);

        setOptions((orgs ?? []).map((o: any) => ({ id: o.id, name: o.name })));
      } catch (e) {
        console.error(e);
        setOptions([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [open]);

  const canSave = useMemo(() => !!value, [value]);

  const createOrganization = async () => {
    if (!newOrgName.trim()) return;
    
    setCreating(true);
    try {
      const { data, error } = await supabase.rpc('create_org_with_admin', {
        org_name: newOrgName.trim()
      });

      if (error) throw error;

      const newOrg = { id: data, name: newOrgName.trim() };
      setOptions([newOrg]);
      setValue(data);
      setShowCreateForm(false);
      setNewOrgName("");
      
      toast({
        title: "Organization created",
        description: `${newOrgName} has been created successfully.`,
      });
    } catch (error) {
      console.error('Error creating organization:', error);
      toast({
        title: "Error",
        description: "Failed to create organization. Please try again.",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Select your company</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          {!showCreateForm ? (
            <>
              <Select onValueChange={setValue} value={value}>
                <SelectTrigger>
                  <SelectValue placeholder={loading ? "Loading..." : "Choose company"} />
                </SelectTrigger>
                <SelectContent>
                  {!loading && options.length === 0 ? (
                    <SelectItem disabled value="__none">No companies found</SelectItem>
                  ) : (
                    options.map((o) => (
                      <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {!loading && options.length === 0 && (
                <div className="space-y-3">
                  <div className="text-sm text-muted-foreground">
                    You're not assigned to any companies yet. You can create your own organization to get started.
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowCreateForm(true)}
                    className="w-full"
                  >
                    Create Organization
                  </Button>
                </div>
              )}
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
            </>
          ) : (
            <>
              <div className="space-y-3">
                <Label htmlFor="orgName">Organization Name</Label>
                <Input
                  id="orgName"
                  placeholder="Enter organization name"
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newOrgName.trim()) {
                      createOrganization();
                    }
                  }}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowCreateForm(false);
                    setNewOrgName("");
                  }}
                  disabled={creating}
                >
                  Back
                </Button>
                <Button
                  onClick={createOrganization}
                  disabled={!newOrgName.trim() || creating}
                >
                  {creating ? "Creating..." : "Create"}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
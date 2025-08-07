import MobileLayout from "@/components/layout/MobileLayout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { CompanySelector, OrgOption } from "@/components/CompanySelector";

export default function SettingsCompany() {
  const [open, setOpen] = useState(true);
  const [selected, setSelected] = useState<OrgOption | null>(null);

  useEffect(() => {
    // Keep dialog open until a selection is made
    if (selected) setOpen(false);
  }, [selected]);

  return (
    <MobileLayout title="Select Company">
      <SEO title="Company Selector" description="Choose your employer company" path="/settings/company" />
      <CompanySelector
        open={open}
        onOpenChange={setOpen}
        onSelected={(o) => {
          localStorage.setItem("employer_org_id", o.id);
          localStorage.setItem("employer_org_name", o.name);
          setSelected(o);
        }}
      />
      <section className="grid gap-4 max-w-md mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Choose your company</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-sm text-muted-foreground">
              Select the company you are working under for this session. You can change it later from the header.
            </div>
            <Button onClick={() => setOpen(true)} variant="outline">Open selector</Button>
          </CardContent>
        </Card>
      </section>
    </MobileLayout>
  );
}

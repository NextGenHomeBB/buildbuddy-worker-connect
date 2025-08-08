
import MobileLayout from "@/components/layout/MobileLayout";
import { SEO } from "@/components/SEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { getCurrentOrgId } from "@/lib/org";
import { MaterialRequestSchema } from "@/lib/schemas";
import { supabase } from "@/integrations/supabase/client";
import { uploadAttachment } from "@/hooks/useAttachmentUpload";
import { enqueue, isOfflineLike } from "@/lib/offlineQueue";
import { toast } from "@/hooks/use-toast";

export default function MaterialsRequest() {
  const { user } = useAuth();
  const [itemName, setItemName] = useState("");
  const [qty, setQty] = useState<string>("");
  const [unit, setUnit] = useState("");
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const org_id = getCurrentOrgId();
    if (!user?.id || !org_id) {
      toast({ title: "Missing organization", description: "Select a company first." });
      return;
    }

    setSubmitting(true);
    try {
      let photo_path: string | undefined;
      if (file) {
        const up = await uploadAttachment({
          file,
          org_id,
          user_id: user.id,
          content_type: file.type,
        });
        photo_path = up.storage_path;
      }

      const parsed = MaterialRequestSchema.parse({
        org_id,
        project_id: null,
        item_name: itemName,
        qty: qty ? Number(qty) : undefined,
        unit: unit || undefined,
        note: note || undefined,
        photo_path,
      });

      const { error } = await supabase.from("material_requests" as any).insert({
        ...parsed,
        user_id: user.id,
      } as any);
      if (error) throw error;

      toast({ title: "Request submitted" });
      window.location.href = "/materials";
    } catch (err: any) {
      if (isOfflineLike(err)) {
        await enqueue({
          type: "insert:material_requests",
          payload: {
            org_id,
            project_id: null,
            user_id: user?.id,
            item_name: itemName,
            qty: qty ? Number(qty) : null,
            unit: unit || null,
            note: note || null,
            photo_path: null, // photo upload is online-only in this simple version
          },
        });
        toast({ title: "Saved offline", description: "Will submit when back online." });
        window.location.href = "/materials";
      } else {
        toast({ title: "Submit failed", description: err?.message ?? String(err) });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <MobileLayout title="Material Request">
      <SEO title="Material Request" description="Request materials for your site" path="/materials/request" />
      <section className="max-w-md mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Request Materials</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="item">Item</Label>
                <Input id="item" value={itemName} onChange={(e) => setItemName(e.target.value)} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="qty">Qty</Label>
                  <Input id="qty" type="number" inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="unit">Unit</Label>
                  <Input id="unit" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="pcs, m, kg, ..." />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="note">Note</Label>
                <Textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="photo">Photo (optional)</Label>
                <Input id="photo" type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              </div>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Submitting..." : "Submit"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>
    </MobileLayout>
  );
}

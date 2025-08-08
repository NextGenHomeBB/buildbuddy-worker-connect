
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
import { IncidentSchema } from "@/lib/schemas";
import { supabase } from "@/integrations/supabase/client";
import { uploadAttachment } from "@/hooks/useAttachmentUpload";
import { enqueue, isOfflineLike } from "@/lib/offlineQueue";
import { toast } from "@/hooks/use-toast";

export default function IncidentsNew() {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState<"low" | "medium" | "high">("low");
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

      const parsed = IncidentSchema.parse({
        org_id,
        project_id: null,
        title,
        description,
        severity,
        photo_path,
      });

      const { error } = await supabase.from("incidents" as any).insert({
        ...parsed,
        user_id: user.id,
      } as any);

      if (error) throw error;

      toast({ title: "Incident submitted" });
      window.location.href = "/today";
    } catch (err: any) {
      if (isOfflineLike(err)) {
        const org_id = getCurrentOrgId();
        await enqueue({
          type: "insert:incidents",
          payload: {
            org_id,
            project_id: null,
            user_id: user?.id,
            title,
            description,
            severity,
            photo_path: null, // photo upload is online-only in this simple version
          },
        });
        toast({ title: "Saved offline", description: "Will submit when back online." });
        window.location.href = "/today";
      } else {
        toast({ title: "Submit failed", description: err?.message ?? String(err) });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <MobileLayout title="New Incident">
      <SEO title="New Incident" description="Report a safety incident" path="/incidents/new" />
      <section className="max-w-md mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Report Incident</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="title">Title</Label>
                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="severity">Severity</Label>
                <select
                  id="severity"
                  className="border rounded px-3 py-2 bg-background"
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value as any)}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="desc">Description</Label>
                <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} />
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

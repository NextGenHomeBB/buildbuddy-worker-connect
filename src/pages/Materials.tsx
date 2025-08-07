import MobileLayout from "@/components/layout/MobileLayout";
import { SEO } from "@/components/SEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { toast } from "@/hooks/use-toast";

export default function Materials() {
  const qc = useQueryClient();
  const { data: requests = [] } = useQuery<any[]>({ queryKey: ["materials"], initialData: [] });

  const create = useMutation({
    mutationFn: async (req: any) => {
      const next = [{ ...req, id: crypto.randomUUID(), status: "pending", createdAt: Date.now() }, ...requests];
      qc.setQueryData(["materials"], next);
      return true;
    },
    onSuccess: () => toast({ title: "Request sent" }),
  });

  return (
    <MobileLayout title="Materials">
      <SEO title="Materials" description="Request materials and track status" path="/materials" />

      <section className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Request materials</CardTitle>
          </CardHeader>
          <CardContent>
            <RequestForm onSubmit={(data) => create.mutate(data)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>My requests</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {requests.length === 0 ? (
              <p className="text-sm text-muted-foreground">No requests yet.</p>
            ) : (
              <ul className="space-y-2">
                {requests.map((r) => (
                  <li key={r.id} className="rounded-lg border p-3">
                    <div className="text-sm font-medium">{r.item} × {r.qty}</div>
                    <div className="text-xs text-muted-foreground">{r.status} • {new Date(r.createdAt).toLocaleString()}</div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>
    </MobileLayout>
  );
}

function RequestForm({ onSubmit }: { onSubmit: (data: any) => void }) {
  const [item, setItem] = useState("");
  const [qty, setQty] = useState<number>(1);
  const [note, setNote] = useState("");
  const [attachments, setAttachments] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <form
      className="grid gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ item, qty, note, attachments });
        setItem(""); setQty(1); setNote(""); setAttachments([]);
        if (fileRef.current) fileRef.current.value = "";
      }}
    >
      <div className="grid gap-1">
        <label className="text-sm">Item</label>
        <Input value={item} onChange={(e) => setItem(e.target.value)} placeholder="e.g., 2x4 Lumber" required />
      </div>
      <div className="grid gap-1">
        <label className="text-sm">Quantity</label>
        <Input type="number" min={1} value={qty} onChange={(e) => setQty(parseInt(e.target.value || "1", 10))} />
      </div>
      <div className="grid gap-1">
        <label className="text-sm">Notes</label>
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" />
      </div>
      <div className="grid gap-1">
        <label className="text-sm">Photos</label>
        <Input ref={fileRef} type="file" accept="image/*" multiple onChange={(e) => {
          const files = Array.from(e.target.files || []);
          const urls = files.map((f) => URL.createObjectURL(f));
          setAttachments(urls);
        }} />
      </div>
      <div className="flex items-center gap-2">
        <Button type="submit">Send request</Button>
      </div>
    </form>
  );
}

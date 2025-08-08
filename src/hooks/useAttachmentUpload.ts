
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

type Params = {
  file: File;
  org_id: string;
  user_id: string;
  project_id?: string | null;
  task_id?: string | null;
  checklist_item_id?: string | null;
  content_type?: string;
  metadata?: Record<string, any>;
};

export async function uploadAttachment(params: Params) {
  const { file, org_id, user_id, project_id, task_id, checklist_item_id, content_type, metadata } = params;

  const name = `${org_id}/${user_id}/${Date.now()}-${Math.random().toString(36).slice(2)}-${file.name}`;
  const { error: upErr } = await supabase.storage.from("attachments").upload(name, file, {
    upsert: false,
    contentType: content_type || file.type || "application/octet-stream",
  });
  if (upErr) {
    toast({ title: "Upload failed", description: upErr.message });
    throw upErr;
  }

  const { error: insErr } = await supabase.from("attachments" as any).insert({
    org_id,
    user_id,
    project_id: project_id ?? null,
    task_id: task_id ?? null,
    checklist_item_id: checklist_item_id ?? null,
    storage_path: name,
    content_type: content_type || file.type || null,
    metadata: metadata ?? null,
  } as any);

  if (insErr) {
    toast({ title: "Attachment save failed", description: insErr.message });
    throw insErr;
  }

  const { data: signed } = await supabase.storage.from("attachments").createSignedUrl(name, 60 * 10);
  const signedUrl = signed?.signedUrl ?? null;

  toast({ title: "Photo uploaded" });
  return { storage_path: name, signedUrl };
}

import localforage from "localforage";
import { supabase } from "@/integrations/supabase/client";

type QueueAction =
  | { type: "insert:incidents"; payload: any }
  | { type: "insert:material_requests"; payload: any };

const STORE_KEY = "bb_offline_queue_v1";

export async function getQueue(): Promise<QueueAction[]> {
  const list = await localforage.getItem<QueueAction[]>(STORE_KEY);
  return Array.isArray(list) ? list : [];
}

export async function enqueue(action: QueueAction) {
  const list = await getQueue();
  list.push(action);
  await localforage.setItem(STORE_KEY, list);
}

export async function clearQueue() {
  await localforage.setItem(STORE_KEY, []);
}

export async function processQueue(): Promise<{ processed: number; remaining: number }> {
  let list = await getQueue();
  if (list.length === 0) return { processed: 0, remaining: 0 };

  const keep: QueueAction[] = [];
  let processed = 0;

  for (const action of list) {
    try {
      switch (action.type) {
        case "insert:incidents": {
          const { error } = await supabase.from("incidents" as any).insert(action.payload as any);
          if (error) throw error;
          processed++;
          break;
        }
        case "insert:material_requests": {
          const { error } = await supabase.from("material_requests" as any).insert(action.payload as any);
          if (error) throw error;
          processed++;
          break;
        }
        default:
          keep.push(action);
      }
    } catch (_e) {
      // Keep it for next retry
      keep.push(action);
    }
  }

  await localforage.setItem(STORE_KEY, keep);
  return { processed, remaining: keep.length };
}

export async function getPendingCount(): Promise<number> {
  const q = await getQueue();
  return q.length;
}

export function isOfflineLike(err: any): boolean {
  const msg = (err?.message ?? "").toString().toLowerCase();
  return !navigator.onLine || msg.includes("failed to fetch") || msg.includes("networkerror");
}


import { useEffect, useState, useCallback } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { getPendingCount, processQueue } from "@/lib/offlineQueue";

export default function OfflineSyncBanner() {
  const [pending, setPending] = useState<number>(0);
  const [syncing, setSyncing] = useState(false);

  const refresh = useCallback(async () => {
    const count = await getPendingCount();
    setPending(count);
  }, []);

  const trySync = useCallback(async () => {
    setSyncing(true);
    const res = await processQueue();
    await refresh();
    setSyncing(false);
    console.log("Offline queue processed", res);
  }, [refresh]);

  useEffect(() => {
    refresh();
    const onOnline = () => trySync();
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [refresh, trySync]);

  if (pending <= 0) return null;

  return (
    <div className="sticky top-0 z-50 p-2">
      <Alert className="flex items-center justify-between">
        <AlertDescription>
          {pending} pending offline {pending === 1 ? "action" : "actions"} — will retry when online.
        </AlertDescription>
        <Button size="sm" onClick={trySync} disabled={syncing}>
          {syncing ? "Syncing..." : "Retry now"}
        </Button>
      </Alert>
    </div>
  );
}

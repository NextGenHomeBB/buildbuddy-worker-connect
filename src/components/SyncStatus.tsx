import { useEffect, useState } from "react";
import { useIsMutating } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";

export default function SyncStatus() {
  const [online, setOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const mutating = useIsMutating();

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  const label = !online ? "Offline" : mutating > 0 ? "Syncing…" : "Synced";
  const variant = !online ? ("destructive" as const) : ("secondary" as const);

  return <Badge variant={variant}>{label}</Badge>;
}

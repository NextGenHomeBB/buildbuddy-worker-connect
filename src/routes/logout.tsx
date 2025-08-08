import { useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { cleanupAuthState } from "@/lib/auth";
import { SEO } from "@/components/SEO";

export default function LogoutRoute() {
  useEffect(() => {
    const run = async () => {
      try {
        cleanupAuthState();
        try { await supabase.auth.signOut({ scope: "global" }); } catch {}
      } finally {
        // Force a clean reload back to /auth
        window.location.href = "/auth";
      }
    };
    run();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <SEO title="Signing out" description="Ending your session" noIndex />
      <div className="text-sm text-muted-foreground">Signing you out…</div>
    </div>
  );
}

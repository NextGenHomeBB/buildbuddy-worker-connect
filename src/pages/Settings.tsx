import MobileLayout from "@/components/layout/MobileLayout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { cleanupAuthState } from "@/lib/auth";

export default function Settings() {
  const signOut = async () => {
    try {
      cleanupAuthState();
      try { await supabase.auth.signOut({ scope: 'global' }); } catch {}
      window.location.href = "/auth";
    } catch (e: any) {
      toast({ title: "Sign out failed", description: e?.message ?? String(e) });
    }
  };

  return (
    <MobileLayout title="Settings">
      <SEO title="Settings" description="Manage your session" path="/settings" />
      <section className="grid gap-4 max-w-md mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">Sign out from this device</div>
            <Button variant="destructive" onClick={signOut}>Sign out</Button>
          </CardContent>
        </Card>
      </section>
    </MobileLayout>
  );
}

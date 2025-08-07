import MobileLayout from "@/components/layout/MobileLayout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

export default function UpdatePassword() {
  const { user } = useAuth();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // If not authenticated, they should come from a recovery link which creates a session
    // Otherwise, prompt to sign in
  }, []);

  const update = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast({ title: "Password updated" });
      window.location.href = "/";
    } catch (err: any) {
      toast({ title: "Update failed", description: err?.message ?? String(err) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <MobileLayout title="Update Password">
      <SEO title="Update Password" description="Set a new password" path="/auth/update-password" />
      <section className="grid gap-4 max-w-md mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Set new password</CardTitle>
          </CardHeader>
          <CardContent>
            {!user && (
              <div className="text-sm text-muted-foreground mb-2">
                Open this page from the password recovery email.
              </div>
            )}
            <form onSubmit={update} className="grid gap-3">
              <div className="grid gap-1">
                <label className="text-sm">New password</label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <Button type="submit" disabled={loading}>Update password</Button>
            </form>
          </CardContent>
        </Card>
      </section>
    </MobileLayout>
  );
}

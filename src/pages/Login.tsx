import MobileLayout from "@/components/layout/MobileLayout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { cleanupAuthState } from "@/lib/auth";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const signInPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      cleanupAuthState();
      try { await supabase.auth.signOut({ scope: 'global' }); } catch {}
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast({ title: "Signed in" });
      window.location.href = "/";
    } catch (err: any) {
      toast({ title: "Login failed", description: err?.message ?? String(err) });
    } finally {
      setLoading(false);
    }
  };

  const magicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      cleanupAuthState();
      const redirectUrl = `${window.location.origin}/`;
      const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectUrl } });
      if (error) throw error;
      toast({ title: "Check your email", description: "We sent you a magic link." });
    } catch (err: any) {
      toast({ title: "Magic link failed", description: err?.message ?? String(err) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <MobileLayout title="Login">
      <SEO title="Login" description="Sign in to BuildBuddy Worker" path="/login" />
      <section className="grid gap-4 max-w-md mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Email and password</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={signInPassword} className="grid gap-3">
              <div className="grid gap-1">
                <label className="text-sm">Email</label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="grid gap-1">
                <label className="text-sm">Password</label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <Button type="submit" disabled={loading}>Sign in</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Or get a magic link</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={magicLink} className="grid gap-3">
              <div className="grid gap-1">
                <label className="text-sm">Email</label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <Button type="submit" variant="secondary" disabled={loading}>Send magic link</Button>
            </form>
          </CardContent>
        </Card>
      </section>
    </MobileLayout>
  );
}

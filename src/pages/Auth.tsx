import MobileLayout from "@/components/layout/MobileLayout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { cleanupAuthState } from "@/lib/auth";

export default function Auth() {
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [creatingEmail, setCreatingEmail] = useState("");
  const [creatingPassword, setCreatingPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      window.location.href = "/";
    }
  }, [user]);

  const postLoginRedirect = async (userId: string) => {
    try {
      // Pending direct assignments (not yet accepted)
      const { data: pending, error: pendErr } = await supabase
        .from("project_assignments")
        .select("id")
        .eq("user_id", userId)
        .is("accepted_at", null)
        .limit(1);
      if (pendErr) throw pendErr;
      if ((pending ?? []).length > 0) {
        window.location.href = "/invitations";
        return;
      }

      // Accepted assignments and distinct employer orgs
      const { data: accepted, error: accErr } = await supabase
        .from("project_assignments")
        .select("employer_org_id")
        .eq("user_id", userId)
        .not("accepted_at", "is", null);
      if (accErr) throw accErr;
      const orgs = Array.from(new Set((accepted ?? []).map((a: any) => a.employer_org_id).filter(Boolean)));
      if (orgs.length > 1) {
        window.location.href = "/settings/company";
        return;
      }
      if (orgs.length === 1) {
        localStorage.setItem("employer_org_id", orgs[0]);
      }
      window.location.href = "/timer";
    } catch {
      window.location.href = "/";
    }
  };

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      cleanupAuthState();
      try { await supabase.auth.signOut({ scope: "global" }); } catch {}
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast({ title: "Signed in" });
      await postLoginRedirect(data.user!.id);
    } catch (err: any) {
      toast({ title: "Login failed", description: err?.message ?? String(err) });
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      cleanupAuthState();
      const redirectUrl = `${window.location.origin}/`;
      const { data, error } = await supabase.auth.signUp({
        email: creatingEmail,
        password: creatingPassword,
        options: { emailRedirectTo: redirectUrl },
      });
      if (error) throw error;
      if (data.user && !data.user.confirmed_at) {
        toast({ title: "Check your email", description: "Confirm to finish sign up." });
      } else {
        toast({ title: "Account created" });
      }
    } catch (err: any) {
      toast({ title: "Sign up failed", description: err?.message ?? String(err) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <MobileLayout title="Authentication">
      <SEO title="Sign in" description="Access your worker account" path="/auth" />
      <section className="grid gap-4 max-w-md mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Sign In</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={signIn} className="grid gap-3">
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
            <CardTitle>Create Account</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={signUp} className="grid gap-3">
              <div className="grid gap-1">
                <label className="text-sm">Email</label>
                <Input type="email" value={creatingEmail} onChange={(e) => setCreatingEmail(e.target.value)} required />
              </div>
              <div className="grid gap-1">
                <label className="text-sm">Password</label>
                <Input type="password" value={creatingPassword} onChange={(e) => setCreatingPassword(e.target.value)} required />
              </div>
              <Button type="submit" variant="secondary" disabled={loading}>Create account</Button>
            </form>
          </CardContent>
        </Card>
      </section>
    </MobileLayout>
  );
}

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
  const [otpCode, setOtpCode] = useState("");
  const [creatingEmail, setCreatingEmail] = useState("");
  const [creatingPassword, setCreatingPassword] = useState("");
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
      await checkInvitesAndRedirect();
    } catch (err: any) {
      toast({ title: "Login failed", description: err?.message ?? String(err) });
    } finally {
      setLoading(false);
    }
  };

  const checkInvitesAndRedirect = async () => {
    try {
      const { data, error } = await supabase
        .from("project_assignments")
        .select("id")
        .is("accepted_at", null)
        .limit(1);
      if (error) throw error;
      if ((data ?? []).length > 0) {
        window.location.href = "/invitations";
      } else {
        window.location.href = "/";
      }
    } catch {
      window.location.href = "/";
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

  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      cleanupAuthState();
      const { error } = await supabase.auth.verifyOtp({ email, token: otpCode, type: 'email' });
      if (error) throw error;
      toast({ title: "Signed in" });
      await checkInvitesAndRedirect();
    } catch (err: any) {
      toast({ title: "OTP failed", description: err?.message ?? String(err) });
    } finally {
      setLoading(false);
    }
  };

  const signupLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      cleanupAuthState();
      const redirectUrl = `${window.location.origin}/`;
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectUrl }
      });
      if (error) throw error;
      toast({ title: "Check your email", description: "We sent you a sign-up link." });
    } catch (err: any) {
      toast({ title: "Sign up failed", description: err?.message ?? String(err) });
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
              <div className="flex items-center gap-2">
                <Button type="submit" variant="secondary" disabled={loading}>Send magic link</Button>
                <Button type="button" variant="outline" onClick={signupLink} disabled={loading}>Send sign-up link</Button>
              </div>
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

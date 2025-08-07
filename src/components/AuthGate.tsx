import { PropsWithChildren } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { SEO } from "@/components/SEO";

export function AuthGate({ children }: PropsWithChildren) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <SEO title="Loading" description="Checking your session" noIndex />
        <div className="text-sm text-muted-foreground">Loading…</div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <SEO title="Login required" description="Please sign in" noIndex />
        <Navigate to="/login" replace state={{ from: location }} />
      </>
    );
  }

  return <>{children}</>;
}

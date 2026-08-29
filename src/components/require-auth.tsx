import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { Loader2 } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AuthState = { status: "loading" } | { status: "authed"; user: User } | { status: "unauthed" };

// Context handed to child routes (e.g. /app) so they can read the signed-in user.
export type AuthenticatedContext = { user: User };

// Client-side replacement for the old TanStack `_authenticated` route guard.
// Checks the Supabase session and redirects to /auth when there is no user.
export default function RequireAuth() {
  const [state, setState] = useState<AuthState>({ status: "loading" });

  useEffect(() => {
    let active = true;
    void supabase.auth.getUser().then(({ data, error }) => {
      if (!active) return;
      if (error || !data.user) {
        setState({ status: "unauthed" });
      } else {
        setState({ status: "authed", user: data.user });
      }
    });
    return () => {
      active = false;
    };
  }, []);

  if (state.status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  if (state.status === "unauthed") {
    return <Navigate to="/auth" replace />;
  }

  const context: AuthenticatedContext = { user: state.user };
  return <Outlet context={context} />;
}

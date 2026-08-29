import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Plane, LogOut, Construction } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/app")({
  head: () => ({
    meta: [
      { title: "Dashboard — Flight Price Notifier" },
      { name: "description", content: "Your flight route tracking dashboard." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AppPage,
});

function AppPage() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/app" className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Plane className="size-4" />
            </span>
            Flight Price Notifier
          </Link>
          <button
            onClick={handleSignOut}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
          >
            <LogOut className="size-4" />
            Sign out / 登出
          </button>
        </div>
      </header>

      <main className="hero-glow flex flex-1 items-center justify-center px-4 py-16">
        <div className="w-full max-w-lg text-center">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Hi {user.email}
          </h1>
          <div className="glow-card mx-auto mt-10 rounded-2xl p-10">
            <span className="mx-auto mb-6 flex size-14 items-center justify-center rounded-2xl bg-accent text-primary">
              <Construction className="size-7" />
            </span>
            <p className="text-base leading-relaxed text-muted-foreground">
              你的航線追蹤儀表板即將上線 ——
              下一個里程碑會加上訂閱航線的功能。
            </p>
            <p className="mt-3 text-sm text-muted-foreground/70">
              Your dashboard is coming soon. Route-subscription will be added in
              the next milestone.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

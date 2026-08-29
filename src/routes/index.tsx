import { createFileRoute, Link } from "@tanstack/react-router";
import { Plane, Radar, MailCheck, CalendarX2 } from "lucide-react";
import { useEffect, useRef } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Flight Price Notifier" },
      {
        name: "description",
        content:
          "設定航線與目標價，機票降價就通知你。Set a route and a target price — we email you when the fare drops.",
      },
      { property: "og:title", content: "Flight Price Notifier" },
      {
        property: "og:description",
        content:
          "設定航線與目標價，機票降價就通知你。Set a route and a target price — we email you when the fare drops.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LandingPage,
});

const features = [
  {
    icon: Radar,
    title: "盯緊熱門航線",
    subtitle: "Always-on route watching",
    body: "持續監控台北出發的熱門航線（東京、首爾），自動抓最低票價。",
  },
  {
    icon: MailCheck,
    title: "達標自動通知",
    subtitle: "Target-price email alerts",
    body: "低於你設定的目標價，就寄 email 提醒你，附上立即訂購連結。",
  },
  {
    icon: CalendarX2,
    title: "隨時取消",
    subtitle: "Cancel anytime",
    body: "月訂閱制，不想用隨時停，沒有綁約。",
  },
];

function LandingPage() {
  const revealRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = revealRef.current;
    if (!root) return;
    const els = root.querySelectorAll(".fade-in-up");
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.15 },
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={revealRef} className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Plane className="size-4" />
            </span>
            Flight Price Notifier
          </Link>
          <Link
            to="/auth"
            className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Sign in / 登入
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="hero-glow relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-4 pb-24 pt-24 text-center sm:px-6 sm:pb-32 sm:pt-32">
          <p className="fade-in-up mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-medium text-muted-foreground">
            <Plane className="size-3.5 text-primary" />
            機票降價通知
          </p>
          <h1
            className="fade-in-up mx-auto max-w-3xl text-4xl font-bold leading-tight tracking-tight sm:text-6xl"
            style={{ transitionDelay: "80ms" }}
          >
            設定航線與目標價，
            <br />
            <span className="bg-gradient-to-r from-primary to-[oklch(0.72_0.2_265)] bg-clip-text text-transparent">
              機票降價就通知你
            </span>
          </h1>
          <p
            className="fade-in-up mx-auto mt-6 max-w-xl text-base text-muted-foreground sm:text-lg"
            style={{ transitionDelay: "160ms" }}
          >
            Set a route and a target price — we email you when the fare drops.
          </p>
          <div className="fade-in-up mt-10" style={{ transitionDelay: "240ms" }}>
            <Link
              to="/auth"
              className="inline-flex items-center justify-center rounded-xl bg-primary px-8 py-3.5 text-base font-semibold text-primary-foreground shadow-[0_8px_40px_-8px_var(--glow)] transition-all hover:bg-primary/90 hover:shadow-[0_8px_50px_-6px_var(--glow)]"
            >
              Sign in / 登入
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
        <div className="grid gap-6 sm:grid-cols-3">
          {features.map((f, i) => (
            <article
              key={f.title}
              className="glow-card fade-in-up rounded-2xl p-8"
              style={{ transitionDelay: `${i * 100}ms` }}
            >
              <span className="mb-6 flex size-12 items-center justify-center rounded-xl bg-accent text-primary">
                <f.icon className="size-6" />
              </span>
              <h2 className="text-lg font-semibold tracking-tight">{f.title}</h2>
              <p className="mt-1 text-sm font-medium text-primary">
                {f.subtitle}
              </p>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                {f.body}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/60">
        <div className="mx-auto flex max-w-6xl items-center justify-center px-4 py-8 sm:px-6">
          <p className="text-sm text-muted-foreground">
            © 2026 Flight Price Notifier
          </p>
        </div>
      </footer>
    </div>
  );
}

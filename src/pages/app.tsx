import { Link, useNavigate, useOutletContext } from "react-router-dom";
import { Plane, LogOut, Loader2, Check, BellRing } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { AuthenticatedContext } from "@/components/require-auth";

// Base URL of the AWS HTTP API (API Gateway). Injected at build time by Vite
// from VITE_FLIGHT_API (.env locally, and picked up by the Vercel build).
const API_BASE = import.meta.env["VITE_FLIGHT_API"] as string | undefined;

// The two fixed plans, mirrored from the backend (flight-save-subscription).
// `hint` is the current-ish cheapest fare, shown so the user picks a sane budget.
const PLANS = [
  { planName: "tokyo", route: "TPE-TYO", label: "台北 ✈ 東京", hint: 9325 },
  { planName: "seoul", route: "TPE-SEL", label: "台北 ✈ 首爾", hint: 5989 },
] as const;

type Subscription = {
  email: string;
  route: string;
  plan_name: string;
  origin: string;
  destination: string;
  target_price: number;
  currency: string;
  created_at?: string;
  updated_at?: string;
};

const twd = (n: number) => "NT$" + n.toLocaleString("en-US");

export default function AppPage() {
  const { user } = useOutletContext<AuthenticatedContext>();
  const navigate = useNavigate();

  const [subs, setSubs] = useState<Record<string, Subscription>>({});
  const [loading, setLoading] = useState(true);
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    document.title = "Dashboard — Flight Price Notifier";
  }, []);

  const loadSubs = useCallback(async () => {
    if (!API_BASE) {
      setLoading(false);
      setNotice({ kind: "err", text: "後端 API 尚未設定（缺少 VITE_FLIGHT_API）。" });
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/subscriptions?email=${encodeURIComponent(user.email ?? "")}`);
      const data = await res.json();
      const map: Record<string, Subscription> = {};
      for (const row of (data.subscriptions ?? []) as Subscription[]) {
        map[row.plan_name] = row;
      }
      setSubs(map);
    } catch {
      setNotice({ kind: "err", text: "載入訂閱狀態失敗，請稍後再試。" });
    } finally {
      setLoading(false);
    }
  }, [user.email]);

  useEffect(() => {
    void loadSubs();
  }, [loadSubs]);

  async function handleSubmit(e: FormEvent, planName: string) {
    e.preventDefault();
    setNotice(null);
    if (!API_BASE) return;
    const raw = inputs[planName];
    const target = Number(raw);
    if (!raw || !Number.isFinite(target) || target <= 0) {
      setNotice({ kind: "err", text: "請輸入有效的目標價（正整數，單位 TWD）。" });
      return;
    }
    setBusy(planName);
    try {
      const res = await fetch(`${API_BASE}/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email, plan_name: planName, target_price: target }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error ?? "subscribe failed");
      setInputs((prev) => ({ ...prev, [planName]: "" }));
      await loadSubs();
      const label = PLANS.find((p) => p.planName === planName)?.label ?? planName;
      setNotice({ kind: "ok", text: `已開始追蹤 ${label}，目標價 ${twd(target)}。達標時會寄信通知你。` });
    } catch {
      setNotice({ kind: "err", text: "設定追蹤失敗，請稍後再試。" });
    } finally {
      setBusy(null);
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate("/", { replace: true });
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

      <main className="hero-glow flex flex-1 flex-col items-center px-4 py-14">
        <div className="w-full max-w-3xl">
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">選擇航線，設定目標價</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              嗨 {user.email}，挑一條航線並填入你的目標價（TWD）。我們每 30 分鐘檢查一次，價格達標就寄信通知你。
            </p>
          </div>

          {notice && (
            <p
              className={
                "mx-auto mt-6 max-w-xl rounded-lg border px-3.5 py-2.5 text-center text-sm " +
                (notice.kind === "ok"
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-destructive/40 bg-destructive/10 text-destructive")
              }
            >
              {notice.text}
            </p>
          )}

          {loading ? (
            <div className="mt-16 flex justify-center">
              <Loader2 className="size-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="mt-10 grid gap-6 sm:grid-cols-2">
              {PLANS.map((plan) => {
                const sub = subs[plan.planName];
                const subscribed = Boolean(sub);
                const value =
                  inputs[plan.planName] ?? (sub ? String(sub.target_price) : "");
                return (
                  <form
                    key={plan.planName}
                    onSubmit={(e) => handleSubmit(e, plan.planName)}
                    className="glow-card rounded-2xl p-6 text-left"
                  >
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-semibold tracking-tight">{plan.label}</h2>
                      {subscribed && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-1 text-xs font-medium text-primary">
                          <Check className="size-3" />
                          已訂閱
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      目前最低約 {twd(plan.hint)}
                      {subscribed && (
                        <>
                          {" · "}
                          目標價 {twd(sub!.target_price)}
                        </>
                      )}
                    </p>

                    <label
                      htmlFor={`target-${plan.planName}`}
                      className="mt-5 mb-1.5 block text-sm font-medium"
                    >
                      目標價 / Target price (NT$)
                    </label>
                    <input
                      id={`target-${plan.planName}`}
                      type="number"
                      min={1}
                      inputMode="numeric"
                      value={value}
                      onChange={(e) =>
                        setInputs((prev) => ({ ...prev, [plan.planName]: e.target.value }))
                      }
                      className="w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/30"
                      placeholder={`例如 ${plan.hint}`}
                    />

                    <button
                      type="submit"
                      disabled={busy === plan.planName}
                      className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
                    >
                      {busy === plan.planName ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <BellRing className="size-4" />
                      )}
                      {subscribed ? "更新目標價" : "開始追蹤"}
                    </button>
                  </form>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

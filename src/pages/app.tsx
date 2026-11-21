import { Link, useNavigate, useOutletContext } from "react-router-dom";
import { Plane, LogOut, Loader2, Check, BellRing, Ban, CreditCard, Clock } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { AuthenticatedContext } from "@/components/require-auth";

// Base URL of the AWS HTTP API (API Gateway). Injected at build time by Vite
// from VITE_FLIGHT_API (.env locally, and picked up by the Vercel build).
const API_BASE = import.meta.env["VITE_FLIGHT_API"] as string | undefined;

// The three fixed plans, mirrored from the backend (flight-save-subscription).
// `hint` is the current-ish cheapest fare, shown so the user picks a sane budget.
const PLANS = [
  { planName: "tokyo", route: "TPE-TYO", label: "台北 ✈ 東京", hint: 9325 },
  { planName: "seoul", route: "TPE-SEL", label: "台北 ✈ 首爾", hint: 5989 },
  { planName: "london", route: "TPE-LON", label: "台北 ✈ 倫敦", hint: 23854 },
] as const;

// M2 — the subscription lifecycle statuses written by the ECPay callbacks.
// Legacy M1 rows have no subscription_status; we treat those as pending_payment
// so users self-migrate by paying.
type SubStatus = "active" | "pending_payment" | "cancelled" | "expired";

type Subscription = {
  email: string;
  route: string;
  plan_name: string;
  origin: string;
  destination: string;
  target_price: number;
  currency: string;
  subscription_status?: SubStatus;
  current_period_end?: string;
  current_period_end_date?: string;
  merchant_trade_no?: string;
  created_at?: string;
  updated_at?: string;
};

const twd = (n: number) => "NT$" + n.toLocaleString("en-US");

// Legacy rows (no status) are shown as pending_payment.
const effStatus = (sub?: Subscription): SubStatus | null =>
  sub ? (sub.subscription_status ?? "pending_payment") : null;

function statusBadge(status: SubStatus): { text: string; cls: string } {
  switch (status) {
    case "active":
      return { text: "已訂閱（有效）", cls: "bg-primary/15 text-primary" };
    case "pending_payment":
      return { text: "未完成付款", cls: "bg-amber-500/15 text-amber-500" };
    case "cancelled":
      return { text: "已取消", cls: "bg-muted text-muted-foreground" };
    case "expired":
      return { text: "已結束", cls: "bg-muted text-muted-foreground" };
  }
}

function submitLabel(status: SubStatus | null): string {
  switch (status) {
    case "active":
      return "更新目標價";
    case "pending_payment":
      return "完成付款 / Pay";
    case "cancelled":
      return "更新目標價";
    case "expired":
      return "重新訂閱";
    default:
      return "訂閱並付款";
  }
}

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

  // One flow for 開始追蹤 / 完成付款 / 重新訂閱 / 更新目標價: POST /subscribe and
  // branch on the response Content-Type. The backend returns an auto-submit HTML
  // form (→ ECPay cashier) for a new/unpaid/expired row, or JSON for an in-place
  // target-price update on an already active/cancelled row (no re-payment).
  async function handleSubmit(e: FormEvent, planName: string) {
    e.preventDefault();
    setNotice(null);
    if (!API_BASE) return;
    const raw = inputs[planName] ?? (subs[planName] ? String(subs[planName].target_price) : "");
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
      const ct = res.headers.get("content-type") ?? "";
      if (ct.includes("text/html")) {
        // Hand the browser to ECPay's cashier. The returned form auto-submits.
        const html = await res.text();
        document.open();
        document.write(html);
        document.close();
        return;
      }
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error ?? "subscribe failed");
      setInputs((prev) => ({ ...prev, [planName]: "" }));
      await loadSubs();
      const label = PLANS.find((p) => p.planName === planName)?.label ?? planName;
      setNotice({ kind: "ok", text: `已更新 ${label} 的目標價為 ${twd(target)}。` });
    } catch {
      setNotice({ kind: "err", text: "操作失敗，請稍後再試。" });
    } finally {
      setBusy(null);
    }
  }

  async function handleCancel(planName: string) {
    setNotice(null);
    if (!API_BASE) return;
    const sub = subs[planName];
    if (!sub) return;
    setBusy(planName);
    try {
      const res = await fetch(`${API_BASE}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email, route: sub.route }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error ?? "cancel failed");
      await loadSubs();
      setNotice({ kind: "ok", text: "已取消訂閱，本期結束前仍會收到通知。" });
    } catch {
      setNotice({ kind: "err", text: "取消失敗，請稍後再試。" });
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
              嗨 {user.email}，選擇航線並設定目標價，月費 NT$300 訂閱後，達標時我們會寄 Email 通知你。
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
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {PLANS.map((plan) => {
                const sub = subs[plan.planName];
                const status = effStatus(sub);
                const badge = status ? statusBadge(status) : null;
                const value = inputs[plan.planName] ?? (sub ? String(sub.target_price) : "");
                const isBusy = busy === plan.planName;
                return (
                  <form
                    key={plan.planName}
                    onSubmit={(e) => handleSubmit(e, plan.planName)}
                    className="glow-card rounded-2xl p-6 text-left"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="text-xl font-semibold tracking-tight">{plan.label}</h2>
                      {badge && (
                        <span
                          className={
                            "inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium " +
                            badge.cls
                          }
                        >
                          {status === "active" ? (
                            <Check className="size-3" />
                          ) : status === "pending_payment" ? (
                            <CreditCard className="size-3" />
                          ) : (
                            <Clock className="size-3" />
                          )}
                          {badge.text}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      目前最低約 {twd(plan.hint)}
                      {sub && (
                        <>
                          {" · "}
                          目標價 {twd(sub.target_price)}
                        </>
                      )}
                      {status === "cancelled" && sub?.current_period_end_date && (
                        <>
                          {" · "}
                          有效至 {sub.current_period_end_date}（仍會通知到該日）
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
                      disabled={isBusy}
                      className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
                    >
                      {isBusy ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : status === "pending_payment" || status === "expired" ? (
                        <CreditCard className="size-4" />
                      ) : (
                        <BellRing className="size-4" />
                      )}
                      {submitLabel(status)}
                    </button>

                    {status === "active" && (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleCancel(plan.planName)}
                        className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent disabled:opacity-60"
                      >
                        <Ban className="size-4" />
                        取消訂閱
                      </button>
                    )}
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

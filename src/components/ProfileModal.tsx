import { ExternalLink, Sparkles } from "lucide-react";
import { useState } from "react";
import { ApiError, createBillingPortalSession } from "../lib/api";
import type { AuthState } from "../hooks/useAuth";
import type { ProCreditStatus } from "../hooks/useProStatus";
import type { QuotaInfo } from "../types";

interface ProfileModalProps {
  open: boolean;
  onClose: () => void;
  auth: AuthState;
  isPro: boolean;
  proCredits?: ProCreditStatus | null;
  quota: QuotaInfo | null;
  onUpgrade: () => void;
  accessToken: string | null;
}

function formatResetDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const dateOnlyMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const date = dateOnlyMatch
    ? new Date(
        Number(dateOnlyMatch[1]),
        Number(dateOnlyMatch[2]) - 1,
        Number(dateOnlyMatch[3]),
      )
    : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatCreditResetDate(
  periodStart: string | null | undefined,
  periodEnd: string | null | undefined,
): string | null {
  if (periodStart) {
    const dateOnlyMatch = periodStart.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const startDate = dateOnlyMatch
      ? new Date(
          Number(dateOnlyMatch[1]),
          Number(dateOnlyMatch[2]) - 1,
          Number(dateOnlyMatch[3]),
        )
      : new Date(periodStart);
    if (!Number.isNaN(startDate.getTime())) {
      startDate.setDate(startDate.getDate() + 30);
      return new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
      }).format(startDate);
    }
  }
  return formatResetDate(periodEnd);
}

function finiteNumber(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function ProfileModal({ open, onClose, auth, isPro, proCredits, quota, onUpgrade, accessToken }: ProfileModalProps) {
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState<string | null>(null);

  if (!open || !auth.user) return null;

  const email = auth.user.email ?? "";
  const local = email.split("@")[0];
  const parts = local.split(/[._\-+]/);
  const initials = (parts.length >= 2 && parts[0] && parts[1])
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : local.slice(0, 2).toUpperCase();
  const displayName = parts[0]
    ? parts[0].charAt(0).toUpperCase() + parts[0].slice(1)
    : local;
  const used = finiteNumber(quota?.used) ?? 0;
  const limit = finiteNumber(quota?.limit) ?? 3;
  const remaining = finiteNumber(quota?.remaining) ?? limit;
  const pct = limit > 0 ? clampPercent((used / limit) * 100) : 0;
  const monthlyCredits = finiteNumber(proCredits?.ai_credits_monthly);
  const remainingCredits = finiteNumber(proCredits?.ai_credits_remaining);
  const reportedUsedCredits = finiteNumber(proCredits?.ai_credits_used);
  const creditResetDate = formatCreditResetDate(
    proCredits?.ai_credits_period_start,
    proCredits?.ai_credits_period_end,
  );
  const derivedUsedCredits = monthlyCredits !== null && remainingCredits !== null
    ? Math.max(0, monthlyCredits - remainingCredits)
    : null;
  const usedCredits = reportedUsedCredits ?? derivedUsedCredits;
  const hasCreditLimit = monthlyCredits !== null && monthlyCredits > 0;
  const displayUsedCredits = monthlyCredits !== null && monthlyCredits > 0 && usedCredits !== null
    ? Math.min(monthlyCredits, Math.max(0, usedCredits))
    : null;
  const remainingCreditCount = monthlyCredits !== null && displayUsedCredits !== null
    ? monthlyCredits - displayUsedCredits
    : null;
  const creditPct = monthlyCredits !== null && monthlyCredits > 0 && displayUsedCredits !== null
    ? clampPercent((displayUsedCredits / monthlyCredits) * 100)
    : 0;
  const creditSummary = monthlyCredits !== null && monthlyCredits > 0 && displayUsedCredits !== null
    ? `${displayUsedCredits.toLocaleString()} / ${monthlyCredits.toLocaleString()} credits`
    : "Credits active";
  const creditMeta = creditResetDate ? `${creditSummary} · Resets ${creditResetDate}` : creditSummary;

  function handleUpgrade() {
    onClose();
    onUpgrade();
  }

  async function handleManagePlan() {
    if (!accessToken) return;
    setPortalLoading(true);
    setPortalError(null);
    try {
      const { url } = await createBillingPortalSession(accessToken);
      window.location.href = url;
    } catch (err) {
      // Surface the backend's specific message (e.g. "Billing account not found…")
      const msg = err instanceof ApiError
        ? err.message
        : "Couldn't open billing portal. Try again or email support@wrex.app.";
      setPortalError(msg);
    } finally {
      setPortalLoading(false);
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed inset-x-4 top-20 z-50 mx-auto max-w-sm rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-4 border-b border-slate-100 p-6">
          {/* Avatar */}
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-accent font-bold text-navy text-lg">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-charcoal">{displayName}</p>
            <p className="truncate text-xs text-slate-400">{email}</p>
            <span
              className={`mt-0.5 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                isPro
                  ? "bg-accent/20 text-emerald-700"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              {isPro ? <><Sparkles className="h-3 w-3" /> Pro</> : "Free plan"}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-charcoal transition-colors text-xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Usage */}
        {!isPro && quota?.is_authenticated && (
          <div className="border-b border-slate-100 px-6 py-4">
            <div className="mb-1.5 flex items-center justify-between text-sm">
              <span className="font-medium text-charcoal">Today's analyses</span>
              <span className={`font-semibold ${remaining === 0 ? "text-red-500" : remaining === 1 ? "text-amber-500" : "text-emerald-600"}`}>
                {used} / {limit} used
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full transition-all ${
                  pct >= 100 ? "bg-red-400" : pct >= 66 ? "bg-amber-400" : "bg-accent"
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="mt-1.5 text-xs text-slate-400">Resets at midnight · {remaining} remaining</p>
          </div>
        )}

        {/* Upgrade CTA */}
        {!isPro && (
          <div className="border-b border-slate-100 px-6 py-4">
            <p className="mb-3 text-sm text-slate-500">
              Upgrade to <strong className="text-charcoal">Pro</strong> to unlock the AI rewrite, Humanizer, and rubric tools with monthly credits included.
            </p>
            <button
              onClick={handleUpgrade}
              className="w-full rounded-xl bg-gradient-to-br from-accent to-accent-dark py-2.5 text-sm font-bold text-navy shadow-button transition hover:shadow-glow hover:scale-[1.02] active:scale-[0.98]"
            >
              <span className="flex items-center justify-center gap-2"><Sparkles className="h-3.5 w-3.5" />Upgrade to Pro — $9/mo</span>
            </button>
          </div>
        )}

        {/* Pro plan section */}
        {isPro && (
          <div className="border-b border-slate-100 px-6 py-4 space-y-3">
            <div className="flex items-start gap-2">
              <Sparkles className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-charcoal">Wrex Pro · $9 / month</p>
                <p className="text-xs text-slate-400 mt-0.5">2,000 words · AI rewrites · Humanizer · rubric tools</p>
              </div>
            </div>

            <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3">
              <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                <span className="font-medium text-charcoal">Monthly AI credits</span>
                <span className="whitespace-nowrap font-semibold text-emerald-700">
                  {remainingCreditCount !== null ? `${remainingCreditCount.toLocaleString()} left` : "Active"}
                </span>
              </div>
              <p className="mb-2 text-xs font-medium text-slate-600">{creditMeta}</p>
              <div className="h-2 w-full overflow-hidden rounded-full bg-white">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${creditPct}%` }}
                />
              </div>
              {!hasCreditLimit && (
                <p className="mt-1.5 text-xs text-slate-500">We couldn't load the exact balance, but your Pro AI tools are available.</p>
              )}
            </div>

            <button
              onClick={handleManagePlan}
              disabled={portalLoading}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 disabled:opacity-60"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              {portalLoading ? "Opening…" : "Manage plan / Cancel"}
            </button>

            {portalError && (
              <p className="text-xs text-red-500">{portalError}</p>
            )}
          </div>
        )}

        {/* Sign out */}
        <div className="px-6 py-4">
          <button
            onClick={() => { auth.signOut(); onClose(); }}
            className="w-full rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-500"
          >
            Sign out
          </button>
        </div>
      </div>
    </>
  );
}

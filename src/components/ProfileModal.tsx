import { Sparkles } from "lucide-react";
import type { AuthState } from "../hooks/useAuth";
import type { QuotaInfo } from "../types";

interface ProfileModalProps {
  open: boolean;
  onClose: () => void;
  auth: AuthState;
  isPro: boolean;
  quota: QuotaInfo | null;
  onUpgrade: () => void;
}

export function ProfileModal({ open, onClose, auth, isPro, quota, onUpgrade }: ProfileModalProps) {
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
  const used = quota?.used ?? 0;
  const limit = quota?.limit ?? 3;
  const remaining = quota?.remaining ?? limit;
  const pct = Math.min(100, Math.round((used / limit) * 100));

  function handleUpgrade() {
    onClose();
    onUpgrade();
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
              Upgrade to <strong className="text-charcoal">Pro</strong> for unlimited analyses, AI rewrites, and humanizer.
            </p>
            <button
              onClick={handleUpgrade}
              className="w-full rounded-xl bg-gradient-to-br from-accent to-accent-dark py-2.5 text-sm font-bold text-navy shadow-button transition hover:shadow-glow hover:scale-[1.02] active:scale-[0.98]"
            >
              <span className="flex items-center justify-center gap-2"><Sparkles className="h-3.5 w-3.5" />Upgrade to Pro — $9/mo</span>
            </button>
          </div>
        )}

        {/* Pro badge */}
        {isPro && (
          <div className="border-b border-slate-100 px-6 py-4">
            <p className="flex items-center gap-2 text-sm text-emerald-700 font-medium"><Sparkles className="h-3.5 w-3.5 flex-shrink-0" />You have unlimited analyses + all Pro features.</p>
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


import { useEffect, useState } from "react";
import { Headset, List, Sparkle, SquaresFour, X } from "phosphor-react";
import type { AuthState } from "../hooks/useAuth";
import type { QuotaInfo } from "../types";
import { Brand } from "./Brand";
import { Entrance } from "./Motion";

const NAV_LINKS = [
  { label: "How it works", href: "#how-it-works" },
  { label: "Pricing", href: "#pricing" },
  { label: "Try it free", href: "#analyzer" },
  { label: "FAQ", href: "#faq" },
];

interface NavbarProps {
  auth: AuthState;
  quota: QuotaInfo | null;
  isPro?: boolean;
  mode?: "landing" | "workspace";
  onOpenAuth: (tab?: "signin" | "signup") => void;
  /** Opens the account/plan modal owned by App */
  onOpenProfile: () => void;
  /** Called when the logo is clicked in workspace mode — navigates to landing view */
  onGoHome?: () => void;
  /** Called when "Go to workspace" is clicked in landing mode by a logged-in user */
  onGoWorkspace?: () => void;
  /** Mobile workspace action: opens the history drawer managed by App */
  onOpenHistory?: () => void;
  historyCount?: number;
}

function getInitials(email: string): string {
  const local = email.split("@")[0];
  const parts = local.split(/[._\-+]/);
  if (parts.length >= 2 && parts[0] && parts[1]) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return local.slice(0, 2).toUpperCase();
}

function getDisplayName(email: string): string {
  const local = email.split("@")[0];
  const name = local.split(/[._\-+]/)[0];
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function Avatar({ email, isPro }: { email: string; isPro: boolean }) {
  const initials = getInitials(email);
  return (
    <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-navy text-xs font-bold text-white select-none ring-2 ring-white/80 shadow-[0_12px_26px_-18px_rgba(15,23,42,0.9)]">
      {initials}
      {isPro && (
        <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-accent shadow-sm" title="Wrex Pro">
          <svg viewBox="0 0 14 10" fill="none" className="h-2.5 w-2.5" aria-hidden="true">
            <path d="M1 9 L3.5 3 L7 7 L10.5 1 L13 9 Z" fill="#1e2a3a" strokeLinejoin="round"/>
          </svg>
        </span>
      )}
    </span>
  );
}

export function Navbar({ auth, quota, isPro = false, mode = "landing", onOpenAuth, onOpenProfile, onGoHome, onGoWorkspace, onOpenHistory, historyCount = 0 }: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [active, setActive] = useState("");
  const isWorkspace = mode === "workspace";

  // Escape closes the mobile drawer
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMenuOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  useEffect(() => {
    const sections = ["how-it-works", "pricing", "analyzer", "faq"];
    const observers = sections.map((id) => {
      const el = document.getElementById(id);
      if (!el) return null;
      const observer = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActive(`#${id}`); },
        { threshold: 0.3 },
      );
      observer.observe(el);
      return observer;
    });
    return () => observers.forEach((o) => o?.disconnect());
  }, []);

  // Optional usage progress bar for environments that return quota metadata.
  const quotaPct = quota?.is_authenticated && quota.limit > 0
    ? Math.min(100, Math.round((quota.used / quota.limit) * 100))
    : null;

  return (
    <>
    <header className="sticky top-0 z-20 px-4 pt-3 pb-1.5 lg:px-6">
      {/* Quota progress bar — thin strip above the pill, only for logged-in free users */}
      {quotaPct !== null && (
        <div className="absolute inset-x-0 top-0 h-[3px] overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${quotaPct}%`,
              background: quotaPct >= 100
                ? "#ef4444"
                : quotaPct >= 66
                ? "#f59e0b"
                : "#10b981",
            }}
          />
        </div>
      )}
      <div className="mx-auto max-w-7xl">
        <Entrance y={-22}>
          <div className="glass-nav flex items-center justify-between px-4 py-3.5 md:px-5">
            <Brand onClick={isWorkspace ? onGoHome : undefined} />

            {/* Desktop nav */}
            <nav className="hidden items-center gap-3 text-sm md:flex">
            {/* Landing nav links — hidden in workspace mode */}
            {!isWorkspace && NAV_LINKS.map(({ label, href }) => (
              <a
                key={href}
                href={href}
                className={`rounded-full px-3 py-2 font-medium transition-colors ${
                  active === href
                    ? "bg-white/75 text-navy shadow-[0_12px_28px_-22px_rgba(15,23,42,0.45)]"
                    : "text-charcoal/60 hover:bg-white/55 hover:text-navy"
                }`}
              >
                {label}
              </a>
            ))}

            {/* Workspace-mode: support link */}
            {isWorkspace && (
              <a
                href="mailto:support@wrex.app"
                title="Get support"
                className="flex items-center gap-2 rounded-full px-3 py-2 text-xs font-medium text-charcoal/50 transition hover:bg-white/55 hover:text-navy"
              >
                <Headset className="h-4 w-4" weight="duotone" />
                <span>Support</span>
              </a>
            )}

            {auth.user ? (
              <>
                {quota && !isPro && (
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      quota.remaining === 0
                        ? "bg-red-100 text-red-600"
                        : quota.remaining === 1
                        ? "bg-amber-100 text-amber-700"
                        : "bg-emerald-100 text-emerald-700"
                    }`}
                  >
                    {quota.remaining}/{quota.limit} left
                  </span>
                )}
                {isPro && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2.5 py-1 text-xs font-semibold text-navy">
                    <Sparkle className="h-3 w-3" weight="fill" />Pro
                  </span>
                )}
                {/* Landing mode: "Go to workspace" button for logged-in users */}
                {!isWorkspace && onGoWorkspace && (
                  <button
                    type="button"
                    onClick={onGoWorkspace}
                    className="flex items-center gap-1.5 rounded-full border border-navy/15 bg-white/70 px-3.5 py-2 text-xs font-semibold text-navy transition duration-300 hover:-translate-y-0.5 hover:bg-navy hover:text-white"
                  >
                    <SquaresFour className="h-3.5 w-3.5" weight="duotone" />
                    My workspace
                  </button>
                )}
                <button
                  onClick={onOpenProfile}
                  className="flex items-center gap-2 rounded-full px-2 py-1.5 transition duration-300 hover:-translate-y-0.5 hover:bg-white/60"
                  title={auth.user.email}
                >
                  <Avatar email={auth.user.email!} isPro={isPro} />
                  {isWorkspace && (
                    <span className="max-w-[120px] truncate text-sm font-medium text-charcoal/80">
                      {getDisplayName(auth.user.email!)}
                    </span>
                  )}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => onOpenAuth("signin")}
                  className="font-medium text-charcoal/60 transition hover:text-navy"
                >
                  Sign in
                </button>
                <button
                  onClick={() => onOpenAuth("signup")}
                  className="btn-shine rounded-full bg-gradient-to-br from-accent to-accent-dark px-5 py-2.5 text-sm font-bold text-navy shadow-button transition duration-300 hover:-translate-y-0.5 hover:shadow-button-hover active:translate-y-0 active:scale-[0.98]"
                >
                  Try free
                </button>
              </>
            )}
            </nav>

            {/* Mobile hamburger */}
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-border-base bg-white/70 text-navy transition duration-300 hover:-translate-y-0.5 md:hidden"
              aria-label="Toggle menu"
            >
              {menuOpen ? (
                <X className="h-[18px] w-[18px]" weight="bold" />
              ) : (
                <List className="h-[18px] w-[18px]" weight="bold" />
              )}
            </button>
          </div>
        </Entrance>

        {/* Mobile drawer — drops under the pill */}
        {menuOpen && (
          <div className="mt-2 animate-fade-in rounded-[1.6rem] border border-border-base bg-white/95 px-6 pb-6 pt-4 shadow-glass backdrop-blur-sm md:hidden">
            <nav className="flex flex-col gap-4 text-sm">
              {!isWorkspace && NAV_LINKS.map(({ label, href }) => (
                <a
                  key={href}
                  href={href}
                  onClick={() => setMenuOpen(false)}
                  className="font-medium text-charcoal/70 transition hover:text-navy"
                >
                  {label}
                </a>
              ))}
              {auth.user ? (
                <>
                  <button
                    onClick={() => { onOpenProfile(); setMenuOpen(false); }}
                    className="flex items-center gap-2 rounded-xl px-2 py-1.5 transition-colors text-left hover:bg-slate-100"
                  >
                    <Avatar email={auth.user.email!} isPro={isPro} />
                    <div className="flex flex-col leading-tight">
                      <span className="text-sm font-medium text-charcoal/80">{getDisplayName(auth.user.email!)}</span>
                      <span className="text-xs text-charcoal/40 truncate max-w-[180px]">{auth.user.email}</span>
                    </div>
                  </button>
                  {quota && !isPro && (
                    <span className="text-xs text-charcoal/40">{quota.remaining}/{quota.limit} checks left today</span>
                  )}
                  {isPro && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-accent"><Sparkle className="h-3 w-3" weight="fill" />Pro member</span>
                  )}
                  {/* Landing mode mobile: go to workspace */}
                  {!isWorkspace && onGoWorkspace && (
                    <button
                      type="button"
                      onClick={() => { onGoWorkspace(); setMenuOpen(false); }}
                      className="flex items-center gap-2 rounded-soft border border-navy/20 px-3 py-2 text-sm font-semibold text-navy transition hover:bg-navy hover:text-white"
                    >
                      <SquaresFour className="h-4 w-4" weight="duotone" />My workspace
                    </button>
                  )}
                  {/* Workspace mode mobile: support link */}
                  {isWorkspace && (
                    <button
                      type="button"
                      onClick={() => { onOpenHistory?.(); setMenuOpen(false); }}
                      className="flex items-center justify-between rounded-input border border-border-base px-3 py-2 text-sm font-semibold text-navy transition hover:bg-mist"
                    >
                      <span className="flex items-center gap-2">
                        <SquaresFour className="h-4 w-4" weight="duotone" />History
                      </span>
                      <span className="rounded-full bg-accent/20 px-2 py-0.5 text-xs font-bold text-navy">
                        {historyCount}
                      </span>
                    </button>
                  )}
                  {isWorkspace && (
                    <a
                      href="mailto:support@wrex.app"
                      className="flex items-center gap-2 text-sm font-medium text-charcoal/60 hover:text-navy"
                      onClick={() => setMenuOpen(false)}
                    >
                      <Headset className="h-4 w-4" weight="duotone" />Support
                    </a>
                  )}
                </>
              ) : (
                <>
                  <button
                    onClick={() => { onOpenAuth("signin"); setMenuOpen(false); }}
                    className="font-medium text-charcoal/70 transition hover:text-navy text-left"
                  >
                    Sign in
                  </button>
                  <button
                    onClick={() => { onOpenAuth("signup"); setMenuOpen(false); }}
                    className="btn-shine mt-1 rounded-soft bg-gradient-to-br from-accent to-accent-dark px-4 py-3 text-center text-sm font-bold text-navy"
                  >
                    Try free
                  </button>
                </>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
    </>
  );
}

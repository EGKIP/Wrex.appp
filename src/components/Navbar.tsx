import { useEffect, useState } from "react";
import { HelpCircle, LayoutDashboard, Sparkles } from "lucide-react";
import type { AuthState } from "../hooks/useAuth";
import type { QuotaInfo } from "../types";
import { Brand } from "./Brand";
import { ProfileModal } from "./ProfileModal";

const NAV_LINKS = [
  { label: "How it works", href: "#how-it-works" },
  { label: "Try it free", href: "#analyzer" },
  { label: "FAQ", href: "#faq" },
];

interface NavbarProps {
  auth: AuthState;
  quota: QuotaInfo | null;
  isPro?: boolean;
  mode?: "landing" | "workspace";
  onOpenAuth: (tab?: "signin" | "signup") => void;
  onUpgrade?: () => void;
  /** Called when the logo is clicked in workspace mode — navigates to landing view */
  onGoHome?: () => void;
  /** Called when "Go to workspace" is clicked in landing mode by a logged-in user */
  onGoWorkspace?: () => void;
  accessToken?: string | null;
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
    <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-navy text-xs font-bold text-white select-none ring-2 ring-white shadow-sm">
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

export function Navbar({ auth, quota, isPro = false, mode = "landing", onOpenAuth, onUpgrade, onGoHome, onGoWorkspace, accessToken = null }: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [active, setActive] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const isWorkspace = mode === "workspace";

  useEffect(() => {
    const sections = ["how-it-works", "analyzer", "faq"];
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

  // Quota progress bar: pct of daily quota consumed (0-100)
  const quotaPct = quota?.is_authenticated
    ? Math.round((quota.used / quota.limit) * 100)
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
        <div className="glass-nav flex items-center justify-between px-5 py-3">
          <Brand onClick={isWorkspace ? onGoHome : undefined} />

          {/* Desktop nav */}
          <nav className="hidden items-center gap-5 text-sm md:flex">
            {/* Landing nav links — hidden in workspace mode */}
            {!isWorkspace && NAV_LINKS.map(({ label, href }) => (
              <a
                key={href}
                href={href}
                className={`relative pb-0.5 font-medium transition-colors ${
                  active === href
                    ? "text-navy after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:rounded-full after:bg-accent after:content-['']"
                    : "text-charcoal/60 hover:text-navy"
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
                className="flex items-center gap-1.5 text-xs font-medium text-charcoal/50 transition hover:text-navy"
              >
                <HelpCircle className="h-4 w-4" />
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
                  <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2.5 py-0.5 text-xs font-semibold text-navy">
                    <Sparkles className="h-3 w-3" />Pro
                  </span>
                )}
                {/* Landing mode: "Go to workspace" button for logged-in users */}
                {!isWorkspace && onGoWorkspace && (
                  <button
                    type="button"
                    onClick={onGoWorkspace}
                    className="flex items-center gap-1.5 rounded-soft border border-navy/20 px-3 py-1.5 text-xs font-semibold text-navy transition hover:bg-navy hover:text-white"
                  >
                    <LayoutDashboard className="h-3.5 w-3.5" />
                    My workspace
                  </button>
                )}
                <button
                  onClick={() => setProfileOpen(true)}
                  className="flex items-center gap-2 rounded-lg px-2 py-1 transition-colors hover:bg-slate-100"
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
                  className="btn-shine rounded-soft bg-gradient-to-br from-accent to-accent-dark px-5 py-2 text-sm font-bold text-navy shadow-button transition hover:shadow-glow hover:scale-[1.03] active:scale-[0.97]"
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
            className="flex h-9 w-9 items-center justify-center rounded-input border border-border-base text-navy md:hidden"
            aria-label="Toggle menu"
          >
            {menuOpen ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile drawer — drops under the pill */}
        {menuOpen && (
          <div className="mt-2 rounded-card border border-border-base bg-white/95 px-6 pb-6 pt-4 shadow-glass backdrop-blur-sm md:hidden">
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
                    onClick={() => { setProfileOpen(true); setMenuOpen(false); }}
                    className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-100 transition-colors text-left"
                  >
                    <Avatar email={auth.user.email!} isPro={isPro} />
                    <div className="flex flex-col leading-tight">
                      <span className="text-sm font-medium text-charcoal/80">{getDisplayName(auth.user.email!)}</span>
                      <span className="text-xs text-charcoal/40 truncate max-w-[180px]">{auth.user.email}</span>
                    </div>
                  </button>
                  {quota && !isPro && (
                    <span className="text-xs text-charcoal/40">{quota.remaining}/{quota.limit} analyses left today</span>
                  )}
                  {isPro && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-accent"><Sparkles className="h-3 w-3" />Pro member</span>
                  )}
                  {/* Landing mode mobile: go to workspace */}
                  {!isWorkspace && onGoWorkspace && (
                    <button
                      type="button"
                      onClick={() => { onGoWorkspace(); setMenuOpen(false); }}
                      className="flex items-center gap-2 rounded-soft border border-navy/20 px-3 py-2 text-sm font-semibold text-navy transition hover:bg-navy hover:text-white"
                    >
                      <LayoutDashboard className="h-4 w-4" />My workspace
                    </button>
                  )}
                  {/* Workspace mode mobile: support link */}
                  {isWorkspace && (
                    <a
                      href="mailto:support@wrex.app"
                      className="flex items-center gap-2 text-sm font-medium text-charcoal/60 hover:text-navy"
                      onClick={() => setMenuOpen(false)}
                    >
                      <HelpCircle className="h-4 w-4" />Support
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

    <ProfileModal
      open={profileOpen}
      onClose={() => setProfileOpen(false)}
      auth={auth}
      isPro={isPro}
      quota={quota}
      onUpgrade={onUpgrade ?? (() => {})}
      accessToken={accessToken}
    />
    </>
  );
}

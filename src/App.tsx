import { useCallback, useEffect, useRef, useState } from "react";
import { AnalyzerSection } from "./components/AnalyzerSection";
import { AuthModal } from "./components/AuthModal";
import { FaqSection } from "./components/FaqSection";
import { Footer } from "./components/Footer";
import { Hero } from "./components/Hero";
import { HowItWorks } from "./components/HowItWorks";
import { Navbar } from "./components/Navbar";
import { ProfileModal } from "./components/ProfileModal";
import { Toaster } from "./components/Toaster";
import { WorkspaceSidebar } from "./components/WorkspaceSidebar";
import { useToast } from "./context/toast";
import { useAuth } from "./hooks/useAuth";
import { useProStatus } from "./hooks/useProStatus";
import { createCheckoutSession, getHistory } from "./lib/api";
import type { QuotaInfo, SubmissionRecord } from "./types";
import type { User } from "@supabase/supabase-js";

function App() {
  const auth = useAuth();
  const { toast } = useToast();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<"signin" | "signup">("signin");
  const [quota, setQuota] = useState<QuotaInfo | null>(null);
  const { isPro } = useProStatus(auth.session?.access_token);

  // Workspace sidebar state
  const [historyOpen, setHistoryOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [history, setHistory] = useState<SubmissionRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Track whether this page load was triggered by an email confirmation link.
  // We DON'T strip the URL hash here — Supabase's async _initialize() reads
  // window.location.hash to exchange the token. Stripping it before that runs
  // kills the session establishment entirely.
  const emailJustConfirmed = useRef(false);

  // Handle URL params on load (Supabase auth callbacks + Stripe redirects)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.replace("#", "?"));
    const type = params.get("type") || hash.get("type");
    const pro = params.get("pro");

    // Stripe checkout result — no hash involved, safe to clean immediately
    if (pro === "success") {
      window.history.replaceState(null, "", window.location.pathname);
      setTimeout(() => toast("You're now a Pro member! 🎉 Enjoy unlimited analyses.", "success"), 400);
    } else if (pro === "cancel") {
      window.history.replaceState(null, "", window.location.pathname);
      setTimeout(() => toast("Upgrade cancelled — you can upgrade any time.", "info"), 400);
    }

    // Email confirmation redirect: note the intent so the prevUser effect can
    // show the right toast AFTER Supabase actually establishes the session.
    // ⚠️  Do NOT call replaceState here — it would wipe the #access_token hash
    //     before Supabase's async init reads it, breaking session establishment.
    if (type === "signup") {
      emailJustConfirmed.current = true;
      // Only strip query params (not the hash) to keep the URL clean
      if (window.location.search) {
        window.history.replaceState(null, "", window.location.pathname + window.location.hash);
      }
    }

    // PASSWORD_RECOVERY is handled automatically via useAuth's onAuthStateChange listener.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fire toasts on sign-in / sign-out transitions.
  // This is the single source of truth — it fires ONLY after Supabase has
  // actually confirmed a session, never from URL params alone.
  const prevUser = useRef<User | null | undefined>(undefined);
  useEffect(() => {
    if (auth.loading) return;
    const prev = prevUser.current;
    const curr = auth.user;
    if (prev === undefined) {
      // First render after loading clears — record state, no toast
      prevUser.current = curr;
      return;
    }
    if (!prev && curr) {
      // User just signed in
      if (emailJustConfirmed.current) {
        emailJustConfirmed.current = false;
        toast("Email confirmed! You're all set 🎉", "success");
      } else {
        const name = curr.email?.split("@")[0] ?? "there";
        toast(`Welcome back, ${name}! 👋`, "success");
      }
      // Close the modal whether the sign-in came from the form or an OAuth/email redirect
      setAuthModalOpen(false);
    } else if (prev && !curr) {
      toast("You've been signed out.", "info");
    }
    prevUser.current = curr;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.user, auth.loading]);

  // Open the set-password modal automatically when Supabase fires PASSWORD_RECOVERY
  useEffect(() => {
    if (auth.isRecovery) {
      setAuthModalOpen(true);
    }
  }, [auth.isRecovery]);

  function openAuth(tab: "signin" | "signup" = "signin") {
    setAuthModalTab(tab);
    setAuthModalOpen(true);
  }

  function handleAuthModalClose() {
    setAuthModalOpen(false);
  }

  async function handleUpgrade() {
    if (!auth.session?.access_token) { openAuth("signup"); return; }
    try {
      const { url } = await createCheckoutSession(auth.session.access_token);
      window.location.href = url;
    } catch {
      toast("Could not start checkout. Please try again.", "error");
    }
  }

  // ── Workspace history management ─────────────────────────────────────────────
  const fetchHistory = useCallback(async () => {
    const token = auth.session?.access_token;
    if (!token) return;
    setHistoryLoading(true);
    try {
      const data = await getHistory(token);
      setHistory(data.submissions);
    } catch {
      // non-critical
    } finally {
      setHistoryLoading(false);
    }
  }, [auth.session?.access_token]);

  // Load history when user authenticates (workspace mode only)
  useEffect(() => {
    if (auth.user && auth.session?.access_token) {
      void fetchHistory();
    } else {
      setHistory([]);
    }
  }, [auth.user, auth.session?.access_token, fetchHistory]);

  const isWorkspace = !auth.loading && !!auth.user;

  // Workspace: load history item into the editor
  const [workspaceLoadText, setWorkspaceLoadText] = useState<{ text: string; rubric: string | null } | null>(null);

  return (
    <div className="flex min-h-screen flex-col bg-white text-charcoal">
      <Navbar
        auth={auth}
        quota={quota}
        isPro={isPro}
        mode={isWorkspace ? "workspace" : "landing"}
        onOpenAuth={openAuth}
        onUpgrade={handleUpgrade}
      />

      {isWorkspace ? (
        /* ── Authenticated workspace ──────────────────────────────────────────── */
        <main className="flex flex-1">
          <WorkspaceSidebar
            historyOpen={historyOpen}
            onHistoryToggle={() => setHistoryOpen((v) => !v)}
            onSettingsOpen={() => setProfileOpen(true)}
            submissions={history}
            historyLoading={historyLoading}
            accessToken={auth.session?.access_token ?? ""}
            onSelectHistory={(text, rubric) => setWorkspaceLoadText({ text, rubric })}
            onRefreshHistory={fetchHistory}
          />
          <div className="flex flex-1 flex-col overflow-hidden">
            <AnalyzerSection
              accessToken={auth.session?.access_token ?? null}
              isPro={isPro}
              onQuotaUpdate={setQuota}
              onAuthRequired={() => openAuth("signup")}
              workspace
              externalHistory={history}
              externalHistoryLoading={historyLoading}
              onAnalyzed={fetchHistory}
              loadRequest={workspaceLoadText}
              onLoadRequestConsumed={() => setWorkspaceLoadText(null)}
            />
          </div>
        </main>
      ) : (
        /* ── Marketing landing page ───────────────────────────────────────────── */
        <>
          <main>
            <Hero onTryFree={() => openAuth("signup")} />
            <HowItWorks />
            <AnalyzerSection
              accessToken={auth.session?.access_token ?? null}
              isPro={isPro}
              onQuotaUpdate={setQuota}
              onAuthRequired={() => openAuth("signup")}
            />
            <FaqSection />
          </main>
          <Footer />
        </>
      )}

      <AuthModal
        open={authModalOpen}
        onClose={handleAuthModalClose}
        auth={auth}
        defaultTab={authModalTab}
        isRecovery={auth.isRecovery}
      />

      <ProfileModal
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        auth={auth}
        isPro={isPro}
        quota={quota}
        onUpgrade={handleUpgrade}
      />

      <Toaster />
    </div>
  );
}

export default App;

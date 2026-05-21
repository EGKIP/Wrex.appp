import { useCallback, useEffect, useRef, useState } from "react";
import { AnalyzerSection } from "./components/AnalyzerSection";
import { AuthModal } from "./components/AuthModal";
import { CheckoutModal } from "./components/CheckoutModal";
import { FaqSection } from "./components/FaqSection";
import { Footer } from "./components/Footer";
import { FreeVsPaid } from "./components/FreeVsPaid";
import { Hero } from "./components/Hero";
import { HowItWorks } from "./components/HowItWorks";
import { LegalPage } from "./components/LegalPage";
import { Navbar } from "./components/Navbar";
import { ProfileModal } from "./components/ProfileModal";
import { Toaster } from "./components/Toaster";
import { WorkspaceSidebar } from "./components/WorkspaceSidebar";
import { useToast } from "./context/toast";
import { useAuth } from "./hooks/useAuth";
import { useProStatus } from "./hooks/useProStatus";
import { createCheckoutSession, getHistory, syncSubscription } from "./lib/api";
import type { QuotaInfo, SubmissionRecord } from "./types";
import type { User } from "@supabase/supabase-js";

const LEGAL_PAGES = {
  "/privacy": {
    title: "Privacy Policy",
    effectiveDate: "Effective May 19, 2026",
    intro:
      "Wrex.app helps students review and revise their own writing. This policy explains what we collect, how we use it, and the choices you have.",
    sections: [
      {
        title: "Information we collect",
        body: [
          "We collect account information such as your email address when you sign up, along with basic subscription and usage details needed to operate the service.",
          "When you submit writing for feedback, we process the text you provide, optional rubric details, and the resulting analysis so we can show your results and, for signed-in users, maintain your workspace history.",
        ],
      },
      {
        title: "How we use information",
        body: [
          "We use your information to provide writing feedback, manage accounts, process subscriptions, prevent misuse, troubleshoot issues, and improve Wrex.app.",
          "We do not sell your personal information. We also do not claim ownership of your drafts or submissions.",
        ],
      },
      {
        title: "Service providers",
        body: [
          "We rely on trusted providers for hosting, authentication, payments, analytics, and AI-powered feedback. These providers may process information only as needed to help us run Wrex.app.",
        ],
      },
      {
        title: "Your choices",
        body: [
          "You can choose what text you submit. You may also contact us to request help with account access, deletion, or privacy questions.",
          "For privacy requests, email support@wrex.app from the email address connected to your account.",
        ],
      },
      {
        title: "Data security and retention",
        body: [
          "We use reasonable technical and organizational safeguards, but no online service can guarantee perfect security.",
          "We keep information for as long as needed to provide the service, meet legal obligations, resolve disputes, and maintain reliable records.",
        ],
      },
    ],
  },
  "/terms": {
    title: "Terms of Service",
    effectiveDate: "Effective May 19, 2026",
    intro:
      "These terms explain the rules for using Wrex.app. By using the service, you agree to use it responsibly and only where it is allowed.",
    sections: [
      {
        title: "What Wrex.app provides",
        body: [
          "Wrex.app provides writing feedback, revision suggestions, and self-review tools for students. The service is designed to support your own writing process, not replace your judgment or your responsibilities.",
        ],
      },
      {
        title: "Your responsibilities",
        body: [
          "You are responsible for the drafts you submit, the edits you accept, and how you use the feedback. Follow your school, course, workplace, and platform rules.",
          "Do not submit content you do not have permission to use, attempt to abuse the service, interfere with security, or use Wrex.app for unlawful purposes.",
        ],
      },
      {
        title: "Academic integrity",
        body: [
          "Wrex.app is a revision and self-review tool. It does not guarantee grades, originality findings, admissions outcomes, or acceptance by any institution or detection system.",
          "If you are unsure whether a use is allowed, ask your instructor or institution before submitting work.",
        ],
      },
      {
        title: "Accounts and billing",
        body: [
          "You may need an account for certain features. Keep your account information accurate and protect your sign-in access.",
          "Paid features, if offered, are billed through our payment provider. Subscription terms, renewals, cancellations, and refunds may depend on the checkout terms shown when you purchase.",
        ],
      },
      {
        title: "Availability and changes",
        body: [
          "We work to keep Wrex.app useful and available, but the service may change, pause, or occasionally be unavailable.",
          "We may update these terms as the product evolves. If changes are significant, we will take reasonable steps to let users know.",
        ],
      },
      {
        title: "Contact",
        body: [
          "Questions about these terms can be sent to support@wrex.app.",
        ],
      },
    ],
  },
} as const;

function normalizePathname(pathname: string) {
  return pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
}

function App() {
  const auth = useAuth();
  const { toast } = useToast();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<"signin" | "signup">("signin");
  const [quota, setQuota] = useState<QuotaInfo | null>(null);
  const { isPro, credits: proCredits, refresh: refreshProStatus } = useProStatus(auth.session?.access_token);
  const [checkoutClientSecret, setCheckoutClientSecret] = useState<string | null>(null);
  const [pathname, setPathname] = useState(() => window.location.pathname);

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

    // Stripe embedded checkout result — redirected back to our app
    const checkout = params.get("checkout");
    if (checkout === "success") {
      window.history.replaceState(null, "", window.location.pathname);
      // Sync directly from Stripe first (in case webhook is delayed), then refresh UI
      setTimeout(async () => {
        try {
          const token = auth.session?.access_token;
          if (token) await syncSubscription(token);
        } catch {
          // Non-fatal — refreshProStatus below will re-check the DB
        }
        toast("You're now a Pro member. Your monthly AI credits are active.", "success");
        refreshProStatus();
      }, 400);
    }
    // Legacy hosted checkout params (keep for safety)
    if (pro === "success") {
      window.history.replaceState(null, "", window.location.pathname);
      setTimeout(() => { toast("You're now a Pro member.", "success"); refreshProStatus(); }, 400);
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
        toast("Email confirmed. You're all set.", "success");
      } else {
        const name = curr.email?.split("@")[0] ?? "there";
        toast(`Welcome back, ${name}.`, "success");
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
      const { client_secret } = await createCheckoutSession(auth.session.access_token);
      setCheckoutClientSecret(client_secret);
    } catch (err) {
      console.error("[Wrex] checkout failed:", err);
      const msg =
        err instanceof Error && err.message && err.message !== "Something went wrong."
          ? err.message
          : "Could not start checkout. Please try again.";
      toast(msg, "error");
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

  const isLoggedIn = !auth.loading && !!auth.user;
  // viewMode lets logged-in users navigate back to the landing page while staying authenticated
  const [viewMode, setViewMode] = useState<"workspace" | "landing">("workspace");
  const isWorkspace = isLoggedIn && viewMode === "workspace";

  // Workspace: load history item into the editor (optionally auto-analyze)
  const [workspaceLoadText, setWorkspaceLoadText] = useState<{ text: string; rubric: string | null; autoAnalyze?: boolean } | null>(null);

  // Called when a logged-in user hits Analyze on the landing page
  function handleLandingAnalyze(text: string, rubric: string | null) {
    setWorkspaceLoadText({ text, rubric, autoAnalyze: true });
    setViewMode("workspace");
  }

  useEffect(() => {
    const handlePopState = () => setPathname(window.location.pathname);
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const legalPathname = normalizePathname(pathname);
  const legalPage = LEGAL_PAGES[legalPathname as keyof typeof LEGAL_PAGES];

  return (
    <div className="flex min-h-screen flex-col bg-white text-charcoal">
      <Navbar
        auth={auth}
        quota={quota}
        isPro={isPro}
        proCredits={proCredits}
        mode={isWorkspace ? "workspace" : "landing"}
        onOpenAuth={openAuth}
        onUpgrade={handleUpgrade}
        onGoHome={() => setViewMode("landing")}
        onGoWorkspace={() => setViewMode("workspace")}
        onOpenHistory={() => setHistoryOpen(true)}
        historyCount={history.length}
        accessToken={auth.session?.access_token ?? null}
      />

      {legalPage ? (
        <>
          <LegalPage {...legalPage} />
          <Footer />
        </>
      ) : isWorkspace ? (
        /* ── Authenticated workspace ──────────────────────────────────────────── */
        <main className="flex flex-1 overflow-hidden animate-fade-in">
          <WorkspaceSidebar
            historyOpen={historyOpen}
            onHistoryToggle={() => setHistoryOpen((v) => !v)}
            onSettingsOpen={() => setProfileOpen(true)}
            onGoHome={() => setViewMode("landing")}
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
              quota={quota}
              onQuotaUpdate={setQuota}
              onAuthRequired={() => openAuth("signup")}
              onUpgrade={handleUpgrade}
              workspace
              externalHistory={history}
              externalHistoryLoading={historyLoading}
              onAnalyzed={fetchHistory}
              proCredits={proCredits}
              onProUsage={refreshProStatus}
              loadRequest={workspaceLoadText}
              onLoadRequestConsumed={() => setWorkspaceLoadText(null)}
            />
          </div>
        </main>
      ) : (
        /* ── Marketing landing page ───────────────────────────────────────────── */
        <>
          <main>
            <Hero onTryFree={isLoggedIn ? () => setViewMode("workspace") : () => openAuth("signup")} />
            <HowItWorks />
            <FreeVsPaid onUpgrade={handleUpgrade} />
            <AnalyzerSection
              accessToken={auth.session?.access_token ?? null}
              isPro={isPro}
              quota={quota}
              onQuotaUpdate={setQuota}
              onAuthRequired={() => openAuth("signup")}
              onUpgrade={handleUpgrade}
              proCredits={proCredits}
              onProUsage={refreshProStatus}
              onSwitchToWorkspace={isLoggedIn ? handleLandingAnalyze : undefined}
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
        proCredits={proCredits}
        quota={quota}
        onUpgrade={handleUpgrade}
        accessToken={auth.session?.access_token ?? null}
      />

      {checkoutClientSecret && (
        <CheckoutModal
          clientSecret={checkoutClientSecret}
          onClose={() => setCheckoutClientSecret(null)}
        />
      )}

      <Toaster />
    </div>
  );
}

export default App;

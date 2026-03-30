import { useEffect, useRef, useState } from "react";
import { AnalyzerSection } from "./components/AnalyzerSection";
import { AuthModal } from "./components/AuthModal";
import { FaqSection } from "./components/FaqSection";
import { Footer } from "./components/Footer";
import { Hero } from "./components/Hero";
import { HowItWorks } from "./components/HowItWorks";
import { Navbar } from "./components/Navbar";
import { Toaster } from "./components/Toaster";
import { useToast } from "./context/toast";
import { useAuth } from "./hooks/useAuth";
import { useProStatus } from "./hooks/useProStatus";
import { createCheckoutSession } from "./lib/api";
import type { QuotaInfo } from "./types";
import type { User } from "@supabase/supabase-js";

function App() {
  const auth = useAuth();
  const { toast } = useToast();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<"signin" | "signup">("signin");
  const [quota, setQuota] = useState<QuotaInfo | null>(null);
  const { isPro } = useProStatus(auth.session?.access_token);

  // Handle URL params on load (Supabase auth callbacks + Stripe redirects)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.replace("#", "?"));
    const type = params.get("type") || hash.get("type");
    const hasToken = hash.get("access_token");
    const pro = params.get("pro");

    // Stripe checkout result
    if (pro === "success") {
      window.history.replaceState(null, "", window.location.pathname);
      setTimeout(() => toast("You're now a Pro member! 🎉 Enjoy unlimited analyses.", "success"), 400);
    } else if (pro === "cancel") {
      window.history.replaceState(null, "", window.location.pathname);
      setTimeout(() => toast("Upgrade cancelled — you can upgrade any time.", "info"), 400);
    }

    if (type === "signup" || (hasToken && type !== "recovery")) {
      // Clean up the URL so the params don't persist on refresh
      const cleanUrl = window.location.pathname;
      window.history.replaceState(null, "", cleanUrl);
      // Wait a tick for auth state to settle, then toast
      setTimeout(() => {
        toast("Email confirmed! You're all set 🎉", "success");
        setAuthModalOpen(false);
      }, 400);
    }

    if (type === "recovery" && hasToken) {
      // Password reset link — open auth modal on the sign-in tab
      const cleanUrl = window.location.pathname;
      window.history.replaceState(null, "", cleanUrl);
      setTimeout(() => {
        toast("Set your new password below 🔑", "info");
        openAuth("signin");
      }, 400);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fire toasts on sign-in / sign-out transitions
  const prevUser = useRef<User | null | undefined>(undefined);
  useEffect(() => {
    if (auth.loading) return;
    const prev = prevUser.current;
    const curr = auth.user;
    if (prev === undefined) {
      // First render — just record the current user, no toast
      prevUser.current = curr;
      return;
    }
    if (!prev && curr) {
      const name = curr.email?.split("@")[0] ?? "there";
      toast(`Welcome back, ${name}! 👋`, "success");
    } else if (prev && !curr) {
      toast("You've been signed out.", "info");
    }
    prevUser.current = curr;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.user, auth.loading]);

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

  return (
    <div className="min-h-screen bg-white text-charcoal">
      <Navbar auth={auth} quota={quota} isPro={isPro} onOpenAuth={openAuth} onUpgrade={handleUpgrade} />
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
      <AuthModal
        open={authModalOpen}
        onClose={handleAuthModalClose}
        auth={auth}
        defaultTab={authModalTab}
      />
      <Toaster />
    </div>
  );
}

export default App;

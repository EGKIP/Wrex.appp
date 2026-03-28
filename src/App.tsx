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
import type { QuotaInfo } from "./types";
import type { User } from "@supabase/supabase-js";

function App() {
  const auth = useAuth();
  const { toast } = useToast();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<"signin" | "signup">("signin");
  const [quota, setQuota] = useState<QuotaInfo | null>(null);

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

  return (
    <div className="min-h-screen bg-white text-charcoal">
      <Navbar auth={auth} quota={quota} onOpenAuth={openAuth} />
      <main>
        <Hero onTryFree={() => openAuth("signup")} />
        <HowItWorks />
        <AnalyzerSection
          accessToken={auth.session?.access_token ?? null}
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

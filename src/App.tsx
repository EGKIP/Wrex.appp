import { useState } from "react";
import { AnalyzerSection } from "./components/AnalyzerSection";
import { AuthModal } from "./components/AuthModal";
import { FaqSection } from "./components/FaqSection";
import { Footer } from "./components/Footer";
import { Hero } from "./components/Hero";
import { HowItWorks } from "./components/HowItWorks";
import { Navbar } from "./components/Navbar";
import { useAuth } from "./hooks/useAuth";
import type { QuotaInfo } from "./types";

function App() {
  const auth = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<"signin" | "signup">("signin");
  const [quota, setQuota] = useState<QuotaInfo | null>(null);

  function openAuth(tab: "signin" | "signup" = "signin") {
    setAuthModalTab(tab);
    setAuthModalOpen(true);
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
        onClose={() => setAuthModalOpen(false)}
        auth={auth}
        defaultTab={authModalTab}
      />
    </div>
  );
}

export default App;

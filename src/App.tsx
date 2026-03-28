import { AnalyzerSection } from "./components/AnalyzerSection";
import { DisclaimerSection } from "./components/DisclaimerSection";
import { Footer } from "./components/Footer";
import { Hero } from "./components/Hero";
import { Navbar } from "./components/Navbar";
import { ProPreview } from "./components/ProPreview";
import { WaitlistSection } from "./components/WaitlistSection";

function App() {
  return (
    <div className="min-h-screen bg-white text-charcoal">
      <Navbar />
      <main>
        <Hero />
        <AnalyzerSection />
        <ProPreview />
        <WaitlistSection />
        <DisclaimerSection />
      </main>
      <Footer />
    </div>
  );
}

export default App;

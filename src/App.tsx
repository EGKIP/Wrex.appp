import { AnalyzerSection } from "./components/AnalyzerSection";
import { FaqSection } from "./components/FaqSection";
import { Footer } from "./components/Footer";
import { Hero } from "./components/Hero";
import { HowItWorks } from "./components/HowItWorks";
import { Navbar } from "./components/Navbar";

function App() {
  return (
    <div className="min-h-screen bg-white text-charcoal">
      <Navbar />
      <main>
        <Hero />
        <HowItWorks />
        <AnalyzerSection />
        <FaqSection />
      </main>
      <Footer />
    </div>
  );
}

export default App;

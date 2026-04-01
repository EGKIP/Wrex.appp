import { useEffect, useRef } from "react";
import { Check, X } from "lucide-react";

interface ProPreviewProps {
  onTryFree?: () => void;
  onUpgrade?: () => void;
}

const FREE_FEATURES = [
  "AI-pattern score (0–100)",
  "Sentence-level flags with reasons",
  "Rubric alignment",
  "Writing tips",
  "250 words per analysis",
  "3 analyses / day (free account)",
  "1 analysis without an account",
];

const PRO_ONLY = [
  "Sentence-level rewrites (inline)",
  "Full humanize — 5 tone templates",
  "Deep rubric gap detection",
  "1,250 words per analysis",
  "Unlimited analyses every day",
];

function Tick() {
  return <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />;
}
function Cross() {
  return <X className="mt-0.5 h-4 w-4 shrink-0 text-charcoal/25" />;
}

export function ProPreview({ onTryFree, onUpgrade }: ProPreviewProps) {
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const els = sectionRef.current?.querySelectorAll<HTMLElement>(".scroll-reveal");
    if (!els?.length) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in-view"); obs.unobserve(e.target); } });
      },
      { threshold: 0.1 }
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return (
    <section id="pricing" className="bg-mist px-6 py-16 lg:px-10 lg:py-24" ref={sectionRef}>
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-12 text-center scroll-reveal">
          <h2 className="text-[1.75rem] font-bold tracking-tight text-navy lg:text-[2.25rem]">
            Simple, honest pricing
          </h2>
          <p className="mt-3 text-base text-charcoal/65">
            Start free — no credit card, no account needed. Upgrade when you're ready.
          </p>
        </div>

        {/* Pricing cards */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Free tier */}
          <div className="scroll-reveal rounded-modal border border-border-base bg-white p-8 shadow-soft" data-delay="1">
            <p className="text-xs font-semibold uppercase tracking-widest text-charcoal/45">Free</p>
            <p className="mt-3 text-4xl font-extrabold text-navy">$0</p>
            <p className="mt-1 text-sm text-charcoal/55">Forever free</p>

            <ul className="mt-7 space-y-3">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-charcoal/80">
                  <Tick /> {f}
                </li>
              ))}
              {PRO_ONLY.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-charcoal/35 line-through decoration-charcoal/20">
                  <Cross /> {f}
                </li>
              ))}
            </ul>

            <button
              onClick={onTryFree}
              className="mt-8 w-full rounded-soft border border-border-base bg-white py-3 text-sm font-semibold text-navy transition hover:border-navy/20 hover:bg-mist"
            >
              Start free
            </button>
          </div>

          {/* Pro tier */}
          <div className="scroll-reveal relative overflow-hidden rounded-modal border border-accent/40 bg-gradient-to-br from-navy to-navy-light p-8 shadow-soft-md" data-delay="2">
            {/* Popular badge */}
            <span className="absolute right-6 top-6 rounded-full bg-accent px-3 py-1 text-xs font-bold text-navy">
              Most popular
            </span>

            <p className="text-xs font-semibold uppercase tracking-widest text-white/50">Pro</p>
            <p className="mt-3 text-4xl font-extrabold text-white">$9<span className="text-xl font-medium text-white/60">/mo</span></p>
            <p className="mt-1 text-sm text-white/50">Cancel any time</p>

            <ul className="mt-7 space-y-3">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-white/75">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" /> {f}
                </li>
              ))}
              {PRO_ONLY.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm font-medium text-white">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" /> {f}
                </li>
              ))}
            </ul>

            <button
              onClick={onUpgrade}
              className="btn-shine mt-8 w-full rounded-soft bg-gradient-to-br from-accent to-accent-dark py-3 text-sm font-bold text-navy shadow-button transition hover:shadow-glow hover:scale-[1.01] active:scale-[0.98]"
            >
              Upgrade to Pro
            </button>
            <p className="mt-3 text-center text-xs text-white/35">Secure checkout via Stripe</p>
          </div>
        </div>
      </div>
    </section>
  );
}

import { useEffect, useRef } from "react";
import { Check, Sparkles } from "lucide-react";

interface ProPreviewProps {
  onTryFree?: () => void;
  onUpgrade?: () => void;
}

const FREE_FEATURES = [
  "AI-pattern score (0–100)",
  "Sentence-level flags & reasons",
  "Rubric alignment check",
  "Writing improvement tips",
  "500 words · 3 analyses/day",
];

const PRO_EXTRAS = [
  "Sentence-level rewrites (inline)",
  "Humanize — 5 tone templates",
  "Deep rubric gap detection",
  "Up to 2,000 words per analysis",
  "Unlimited daily analyses",
];

export function ProPreview({ onTryFree, onUpgrade }: ProPreviewProps) {
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const els = sectionRef.current?.querySelectorAll<HTMLElement>(".scroll-reveal");
    if (!els?.length) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) { e.target.classList.add("in-view"); obs.unobserve(e.target); }
        });
      },
      { threshold: 0.1 }
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return (
    <section id="pricing" className="bg-mist px-6 py-16 lg:px-10 lg:py-20" ref={sectionRef}>
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-10 text-center scroll-reveal">
          <h2 className="text-[1.75rem] font-bold tracking-tight text-navy lg:text-[2.25rem]">
            Simple pricing
          </h2>
          <p className="mt-2 text-base text-charcoal/60">
            Start free — no card needed. Upgrade when you're ready.
          </p>
        </div>

        {/* Cards */}
        <div className="grid gap-5 md:grid-cols-2">

          {/* Free */}
          <div className="scroll-reveal flex flex-col rounded-modal border border-border-base bg-white p-7 shadow-soft" data-delay="1">
            <p className="text-xs font-semibold uppercase tracking-widest text-charcoal/40">Free</p>
            <div className="mt-3 flex items-end gap-1">
              <span className="text-4xl font-extrabold text-navy">$0</span>
              <span className="mb-1 text-sm text-charcoal/45">/ forever</span>
            </div>

            <ul className="mt-6 space-y-2.5">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-2.5 text-sm text-charcoal/75">
                  <Check className="h-4 w-4 shrink-0 text-emerald-500" /> {f}
                </li>
              ))}
            </ul>

            <div className="flex-1" />
            <button
              onClick={onTryFree}
              className="mt-7 w-full rounded-soft border border-border-base bg-white py-2.5 text-sm font-semibold text-navy transition hover:border-navy/25 hover:bg-mist"
            >
              Start free
            </button>
          </div>

          {/* Pro */}
          <div className="scroll-reveal relative flex flex-col overflow-hidden rounded-modal border border-accent/30 bg-gradient-to-br from-navy to-navy-light p-7 shadow-soft-md" data-delay="2">
            <span className="absolute right-5 top-5 inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-0.5 text-[11px] font-bold text-navy">
              <Sparkles className="h-3 w-3" /> Most popular
            </span>

            <p className="text-xs font-semibold uppercase tracking-widest text-white/45">Pro</p>
            <div className="mt-3 flex items-end gap-1">
              <span className="text-4xl font-extrabold text-white">$9</span>
              <span className="mb-1 text-sm text-white/45">/ month</span>
            </div>
            <p className="mt-0.5 text-xs text-white/35">Cancel any time</p>

            {/* Everything in free */}
            <p className="mt-5 text-xs font-semibold uppercase tracking-widest text-white/40">Everything in Free, plus</p>
            <ul className="mt-3 space-y-2.5">
              {PRO_EXTRAS.map((f) => (
                <li key={f} className="flex items-center gap-2.5 text-sm font-medium text-white">
                  <Check className="h-4 w-4 shrink-0 text-accent" /> {f}
                </li>
              ))}
            </ul>

            <div className="flex-1" />
            <button
              onClick={onUpgrade}
              className="btn-shine mt-7 w-full rounded-soft bg-gradient-to-br from-accent to-accent-dark py-2.5 text-sm font-bold text-navy shadow-button transition hover:shadow-glow hover:scale-[1.01] active:scale-[0.98]"
            >
              Upgrade to Pro
            </button>
            <p className="mt-2.5 text-center text-[11px] text-white/30">Secure checkout · Stripe</p>
          </div>

        </div>
      </div>
    </section>
  );
}

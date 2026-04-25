import { useEffect, useRef } from "react";
import { ShieldCheck, EyeOff, GraduationCap } from "lucide-react";

interface HeroProps {
  onTryFree?: () => void;
}

const TRUST = [
  { Icon: ShieldCheck, label: "Private by default" },
  { Icon: EyeOff, label: "Not shared with schools" },
  { Icon: GraduationCap, label: "Built for students" },
];

/** A static mockup of the Wrex score UI — shows the actual product, not icon rows */
function ScorePreview() {
  return (
    <div className="rounded-modal bg-white p-5 shadow-float select-none">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-border-base pb-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-charcoal/40">Authenticity Score</p>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="font-mono text-4xl font-extrabold text-navy">63</span>
            <span className="text-lg font-bold text-charcoal/40">%</span>
          </div>
          <p className="mt-0.5 text-xs font-medium text-amber-600">Moderate AI likelihood</p>
        </div>
        {/* Score ring */}
        <svg width="72" height="72" viewBox="0 0 72 72" className="shrink-0">
          <circle cx="36" cy="36" r="28" fill="none" stroke="#F1F5F9" strokeWidth="7" />
          <circle
            cx="36" cy="36" r="28" fill="none" stroke="#FBBF24" strokeWidth="7"
            strokeDasharray={`${Math.PI * 56 * 0.63} ${Math.PI * 56 * 0.37}`}
            strokeLinecap="round"
            transform="rotate(-90 36 36)"
          />
          <text x="36" y="40" textAnchor="middle" fontSize="13" fontWeight="800" fill="#0F172A" fontFamily="Inter,sans-serif">63%</text>
        </svg>
      </div>
      {/* Flagged sentences */}
      <div className="mt-4 space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-charcoal/40">Writing signals</p>
        <div className="rounded-input border-l-2 border-amber-400 bg-amber-50/60 px-3 py-2">
          <p className="text-xs leading-5 text-charcoal/80">
            <span className="rounded bg-amber-200/70 px-0.5">Moreover, it offers convenience</span> and efficiency in many contexts.
          </p>
          <p className="mt-1 text-[10px] text-amber-700">Generic transition opener — rewrite in your own voice</p>
        </div>
        <div className="rounded-input border-l-2 border-red-400 bg-red-50/50 px-3 py-2">
          <p className="text-xs leading-5 text-charcoal/80">
            <span className="rounded bg-red-200/70 px-0.5">It is important to think carefully</span> about how writing…
          </p>
          <p className="mt-1 text-[10px] text-red-600">High AI-pattern signal — add your specific perspective</p>
        </div>
      </div>
      {/* Grammar fix row */}
      <div className="mt-3 flex items-center gap-2 rounded-input border border-border-base bg-mist px-3 py-2">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-danger" />
        <span className="flex-1 text-[11px] text-charcoal/70">
          <span className="font-mono line-through opacity-50">recieve</span>
          <span className="mx-1 text-charcoal/30">→</span>
          <span className="font-mono font-semibold text-navy">receive</span>
        </span>
        <span className="rounded-soft bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-white">✓ Fix</span>
      </div>
    </div>
  );
}

export function Hero({ onTryFree }: HeroProps) {
  const rightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = rightRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { el.classList.add("in-view"); obs.disconnect(); } },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <section className="relative overflow-hidden px-6 pb-20 pt-20 lg:px-10 lg:pb-28 lg:pt-28">
      {/* Clean geometric accent — intentional, not decorative noise */}
      <div className="absolute inset-0 bg-gradient-to-b from-canvas to-white" />
      <div
        className="pointer-events-none absolute -right-24 -top-24 h-[480px] w-[480px] rounded-full opacity-[0.07]"
        style={{ background: "radial-gradient(circle, #FBBF24 0%, transparent 70%)" }}
      />
      <div
        className="pointer-events-none absolute -left-16 bottom-0 h-[320px] w-[320px] rounded-full opacity-[0.04]"
        style={{ background: "radial-gradient(circle, #0F172A 0%, transparent 70%)" }}
      />

      <div className="relative mx-auto max-w-7xl">
        <div className="grid items-center gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:gap-20">

          {/* Left — text */}
          <div className="animate-fade-in-up">
            <span className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-4 py-1.5 text-xs font-semibold tracking-wide text-navy/80">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
              Free forever — score + grammar, no account needed
            </span>

            <h1 className="font-heading mt-6 text-[2.75rem] font-extrabold leading-[1.08] tracking-tight text-navy lg:text-[3.5rem]">
              Write with confidence.<br />
              <span className="relative inline-block">
                Sound like you.
                <span
                  className="absolute -bottom-1.5 left-0 h-[5px] w-full rounded-full"
                  style={{ background: "linear-gradient(90deg, #FBBF24, #F59E0B 60%, transparent)" }}
                />
              </span>
            </h1>

            <p className="mt-7 max-w-[460px] text-[1.0625rem] leading-relaxed text-charcoal/70">
              Paste your draft. Wrex shows your authenticity score, flags sentences
              that sound AI-generated, and fixes grammar inline — before you submit.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-4">
              <button
                onClick={onTryFree}
                className="btn-shine rounded-soft bg-gradient-to-br from-accent to-accent-dark px-8 py-3.5 text-base font-bold text-navy shadow-button transition hover:shadow-glow hover:scale-[1.02] active:scale-[0.97]"
              >
                Check your writing — free
              </button>
              <a href="#how-it-works" className="text-sm font-medium text-charcoal/55 underline-offset-4 transition hover:text-navy hover:underline">
                How it works →
              </a>
            </div>

            {/* Trust strip */}
            <div className="mt-8 flex flex-wrap items-center gap-5">
              {TRUST.map(({ Icon, label }) => (
                <span key={label} className="flex items-center gap-1.5 text-xs font-medium text-charcoal/50">
                  <Icon className="h-3.5 w-3.5 text-charcoal/35" />
                  {label}
                </span>
              ))}
            </div>
          </div>

          {/* Right — real app UI preview (not a generic card list) */}
          <div ref={rightRef} className="scroll-reveal" data-delay="1">
            <div className="animate-float">
              <ScorePreview />
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}


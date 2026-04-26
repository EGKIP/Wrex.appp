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

/** Full browser-chrome mockup of the Wrex workspace — shows editor + results side by side */
function AppMockup() {
  return (
    <div className="select-none overflow-hidden rounded-xl border border-charcoal/10 shadow-float">
      {/* Browser chrome */}
      <div className="flex items-center gap-3 bg-[#1e293b] px-3 py-2.5">
        <div className="flex gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
          <div className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
          <div className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
        </div>
        <div className="flex flex-1 justify-center">
          <div className="flex items-center gap-1.5 rounded bg-[#0f172a]/60 px-3 py-1 text-[10px] text-slate-400">
            <span className="text-slate-500">🔒</span> wrex.app
          </div>
        </div>
        <div className="w-14" />
      </div>

      {/* App toolbar */}
      <div className="flex items-center gap-2 border-b border-[#e2e8f0] bg-white px-3 py-2">
        <span className="text-[10px] font-bold text-[#0f172a]">Wrex</span>
        <span className="text-[10px] text-[#cbd5e1]">/</span>
        <span className="text-[10px] text-[#475569]">My essay draft</span>
        <div className="flex-1" />
        <span className="rounded bg-red-50 px-1.5 py-0.5 text-[8px] font-semibold text-red-500">2 errors</span>
        <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[8px] font-semibold text-amber-600">1 suggestion</span>
        <div className="mx-1 h-3 w-px bg-[#e2e8f0]" />
        <span className="text-[8px] text-[#94a3b8]">63 words</span>
      </div>

      {/* 2-column workspace content */}
      <div className="flex bg-[#f1f5f9]">
        {/* Left: Editor */}
        <div className="flex-1 border-r border-[#e2e8f0] p-3">
          <div className="rounded-lg border border-[#e2e8f0] bg-white p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[9px] font-semibold text-[#0f172a]">Your writing</span>
              <span className="rounded-full bg-[#f1f5f9] px-1.5 py-0.5 text-[8px] text-[#94a3b8]">47 words</span>
            </div>
            {/* Text with underlines */}
            <p className="text-[10.5px] leading-[1.65] text-[#334155]">
              In today's environment, technology has{" "}
              <span className="border-b-2 border-red-400">recieve</span>d much attention.{" "}
              <span className="border-b-2 border-amber-400">Moreover, it offers</span>{" "}
              convenience in many different contexts.
            </p>
            {/* Inline fix popover */}
            <div className="mt-2 flex items-center gap-1.5 rounded border border-[#e2e8f0] bg-[#f8fafc] px-2 py-1.5">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
              <span className="font-mono text-[9px] line-through text-[#94a3b8]">recieve</span>
              <span className="text-[9px] text-[#cbd5e1]">→</span>
              <span className="font-mono text-[9px] font-bold text-[#0f172a]">receive</span>
              <span className="ml-auto rounded bg-emerald-500 px-1.5 py-0.5 text-[8px] font-bold text-white">✓ Fix</span>
            </div>
            {/* Re-analyze row */}
            <div className="mt-2.5 flex items-center gap-2 rounded border border-amber-200 bg-amber-50 px-2 py-1.5">
              <span className="text-[9px] text-amber-700 flex-1">✏️ Changes detected</span>
              <span className="rounded-md bg-[#FBBF24] px-2 py-0.5 text-[8px] font-bold text-[#0f172a]">↑ Re-analyze</span>
            </div>
          </div>
        </div>

        {/* Right: Score + results */}
        <div className="w-36 shrink-0 space-y-2 p-3">
          {/* Score card */}
          <div className="rounded-lg border border-[#e2e8f0] bg-white p-3">
            <p className="text-[8px] font-semibold uppercase tracking-widest text-[#94a3b8]">Score</p>
            <div className="mt-1.5 flex justify-center">
              <svg width="54" height="54" viewBox="0 0 54 54">
                <circle cx="27" cy="27" r="21" fill="none" stroke="#F1F5F9" strokeWidth="5.5" />
                <circle
                  cx="27" cy="27" r="21" fill="none" stroke="#FBBF24" strokeWidth="5.5"
                  strokeDasharray={`${Math.PI * 42 * 0.63} ${Math.PI * 42 * 0.37}`}
                  strokeLinecap="round"
                  transform="rotate(-90 27 27)"
                />
                <text x="27" y="31" textAnchor="middle" fontSize="10" fontWeight="800" fill="#0F172A" fontFamily="Inter,sans-serif">63%</text>
              </svg>
            </div>
            <p className="mt-1 text-center text-[8px] font-medium text-amber-600">Moderate signals</p>
          </div>

          {/* Flagged signals */}
          <div className="space-y-1.5">
            <div className="rounded border-l-2 border-amber-400 bg-white px-2 py-1.5">
              <p className="text-[8px] leading-tight text-[#334155]">Generic opener — rewrite in your voice</p>
            </div>
            <div className="rounded border-l-2 border-red-400 bg-white px-2 py-1.5">
              <p className="text-[8px] leading-tight text-[#334155]">High AI-pattern signal</p>
            </div>
          </div>

          {/* Pro tools teaser */}
          <div className="rounded-lg border border-[#FBBF24]/30 bg-white p-2">
            <p className="text-[8px] font-bold text-[#FBBF24]">✦ Pro tools</p>
            <div className="mt-1.5 space-y-1">
              {["Humanize tone", "Improve sentences", "Rubric align"].map((t) => (
                <div key={t} className="flex items-center gap-1">
                  <span className="h-1 w-1 rounded-full bg-[#FBBF24] shrink-0" />
                  <span className="text-[8px] text-[#475569]">{t}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
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
        <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.1fr] lg:gap-16">

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

          {/* Right — full workspace browser mockup */}
          <div ref={rightRef} className="scroll-reveal" data-delay="1">
            <AppMockup />
          </div>

        </div>
      </div>
    </section>
  );
}


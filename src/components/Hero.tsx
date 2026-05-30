import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { CheckCircle2, EyeOff, GraduationCap, ShieldCheck } from "lucide-react";

interface HeroProps {
  onTryFree?: () => void;
}

const TRUST = [
  { Icon: ShieldCheck, label: "Private by default" },
  { Icon: EyeOff, label: "Not shared with schools" },
  { Icon: GraduationCap, label: "Built for students" },
];


function BrowserFrame({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="select-none overflow-hidden rounded-xl border border-charcoal/10 shadow-float">
      <div className="flex items-center gap-3 bg-[#1e293b] px-3 py-2.5">
        <div className="flex gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
          <div className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
          <div className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
        </div>
        <div className="flex flex-1 justify-center">
          <div className="rounded bg-[#0f172a]/60 px-3 py-1 text-[10px] text-slate-400">
            {label}
          </div>
        </div>
        <div className="w-14" />
      </div>
      {children}
    </div>
  );
}

function ScorePreview() {
  return (
    <BrowserFrame label="wrex.app / analysis">
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

      <div className="flex bg-[#f1f5f9]">
        <div className="flex-1 border-r border-[#e2e8f0] p-3">
          <div className="rounded-lg border border-[#e2e8f0] bg-white p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[9px] font-semibold text-[#0f172a]">Your writing</span>
              <span className="rounded-full bg-[#f1f5f9] px-1.5 py-0.5 text-[8px] text-[#94a3b8]">47 words</span>
            </div>
            <p className="text-[10.5px] leading-[1.65] text-[#334155]">
              In today's environment, technology has{" "}
              <span className="border-b-2 border-red-400">recieve</span>d much attention.{" "}
              <span className="border-b-2 border-amber-400">Moreover, it offers</span>{" "}
              convenience in many different contexts.
            </p>
            <div className="mt-2 flex items-center gap-1.5 rounded border border-[#e2e8f0] bg-[#f8fafc] px-2 py-1.5">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
              <span className="font-mono text-[9px] line-through text-[#94a3b8]">recieve</span>
              <span className="text-[9px] text-[#cbd5e1]">to</span>
              <span className="font-mono text-[9px] font-bold text-[#0f172a]">receive</span>
              <span className="ml-auto rounded bg-emerald-500 px-1.5 py-0.5 text-[8px] font-bold text-white">Fix</span>
            </div>
            <div className="mt-2.5 flex items-center gap-2 rounded border border-amber-200 bg-amber-50 px-2 py-1.5">
              <span className="flex-1 text-[9px] text-amber-700">Changes detected</span>
              <span className="rounded-md bg-[#FBBF24] px-2 py-0.5 text-[8px] font-bold text-[#0f172a]">Re-analyze</span>
            </div>
          </div>
        </div>

        <div className="w-36 shrink-0 space-y-2 p-3">
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

          <div className="space-y-1.5">
            <div className="rounded border-l-2 border-amber-400 bg-white px-2 py-1.5">
              <p className="text-[8px] leading-tight text-[#334155]">Generic opener - rewrite in your voice</p>
            </div>
            <div className="rounded border-l-2 border-red-400 bg-white px-2 py-1.5">
              <p className="text-[8px] leading-tight text-[#334155]">Grammar issue found</p>
            </div>
            <div className="rounded border-l-2 border-emerald-400 bg-white px-2 py-1.5">
              <p className="text-[8px] leading-tight text-[#334155]">Clear next step</p>
            </div>
          </div>
        </div>
      </div>
    </BrowserFrame>
  );
}

function EvidenceCard({
  title,
  eyebrow,
  children,
  className = "",
}: {
  title: string;
  eyebrow: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl border border-navy/8 bg-white/95 p-4 shadow-[0_20px_54px_-38px_rgba(15,23,42,0.72)] ${className}`}>
      <p className="text-[10px] font-bold uppercase tracking-wide text-accent-dark">{eyebrow}</p>
      <p className="mt-1 text-sm font-bold text-navy">{title}</p>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function VisualStack() {
  return (
    <div className="relative mx-auto max-w-[650px] lg:max-w-none">
      <div
        className="pointer-events-none absolute -inset-8 rounded-[3rem] opacity-70 blur-2xl"
        style={{ background: "radial-gradient(ellipse at 50% 45%, rgba(251,191,36,0.16), transparent 68%)" }}
      />

      <div className="relative">
        <div className="relative z-10 rounded-[1.65rem] border border-navy/8 bg-white/80 p-3 shadow-[0_28px_80px_-50px_rgba(15,23,42,0.9)]">
          <div className="overflow-hidden rounded-xl">
            <ScorePreview />
          </div>
        </div>

        <EvidenceCard
          eyebrow="Inline fix"
          title="Accept a correction in place"
          className="relative z-20 mt-4 sm:absolute sm:-bottom-10 sm:-left-8 sm:mt-0 sm:w-64"
        >
          <div className="flex items-start gap-2 rounded-xl bg-emerald-50 px-3 py-2.5">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
            <div className="min-w-0">
              <p className="text-xs leading-5 text-charcoal/65">
                <span className="font-mono line-through text-charcoal/40">recieve</span>{" "}
                <span className="text-charcoal/35">to</span>{" "}
                <span className="font-mono font-bold text-navy">receive</span>
              </p>
              <p className="mt-1 text-[11px] text-emerald-700">One-click grammar cleanup</p>
            </div>
          </div>
        </EvidenceCard>

        <EvidenceCard
          eyebrow="Saved trail"
          title="History without the clutter"
          className="relative z-20 mt-3 sm:absolute sm:-right-6 sm:-top-7 sm:mt-0 sm:w-56"
        >
          <div className="space-y-2">
            {[
              { score: "28%", label: "Narrative draft", color: "bg-emerald-100 text-emerald-700" },
              { score: "46%", label: "Essay revision", color: "bg-amber-100 text-amber-700" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                <span className={`rounded-md px-2 py-1 text-[10px] font-bold ${item.color}`}>{item.score}</span>
                <span className="truncate text-xs text-charcoal/62">{item.label}</span>
              </div>
            ))}
          </div>
        </EvidenceCard>
      </div>

      <p className="relative mt-14 max-w-md text-sm leading-6 text-charcoal/58 sm:ml-auto sm:mt-12">
        A simple workspace view: score first, fixes next, history nearby when you need it.
      </p>
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
          <div className="animate-fade-in-up">
            <span className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-4 py-1.5 text-xs font-semibold tracking-wide text-navy/80">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
              Free score + grammar, no account needed
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
              that sound AI-generated, and fixes grammar inline before you submit.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-4">
              <button
                onClick={onTryFree}
                className="btn-shine rounded-soft bg-gradient-to-br from-accent to-accent-dark px-8 py-3.5 text-base font-bold text-navy shadow-button transition hover:scale-[1.02] hover:shadow-glow active:scale-[0.97]"
              >
                Check your writing free
              </button>
              <a href="#how-it-works" className="text-sm font-medium text-charcoal/55 underline-offset-4 transition hover:text-navy hover:underline">
                How it works
              </a>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-5">
              {TRUST.map(({ Icon, label }) => (
                <span key={label} className="flex items-center gap-1.5 text-xs font-medium text-charcoal/50">
                  <Icon className="h-3.5 w-3.5 text-charcoal/35" />
                  {label}
                </span>
              ))}
            </div>
          </div>

          <div ref={rightRef} className="scroll-reveal" data-delay="1">
            <VisualStack />
          </div>
        </div>
      </div>
    </section>
  );
}

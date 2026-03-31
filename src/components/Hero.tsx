import { BarChart2, Highlighter, ClipboardList, Lightbulb } from "lucide-react";

const FEATURES = [
  { Icon: BarChart2, label: "AI-pattern score", desc: "0–100 likelihood score based on writing patterns" },
  { Icon: Highlighter, label: "Sentence flags", desc: "Highlights specific sentences that look AI-written" },
  { Icon: ClipboardList, label: "Rubric alignment", desc: "Maps your draft against assignment criteria" },
  { Icon: Lightbulb, label: "Writing tips", desc: "Concrete suggestions to improve your draft" },
];

interface HeroProps {
  onTryFree?: () => void;
}

export function Hero({ onTryFree }: HeroProps) {
  return (
    <section className="relative overflow-hidden px-6 pb-20 pt-20 lg:px-10 lg:pb-28 lg:pt-28">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-canvas via-white to-mist" />

      {/* Yellow blob */}
      <div
        className="blob-yellow"
        style={{ width: 520, height: 520, top: -120, right: -80 }}
      />

      <div className="relative mx-auto max-w-7xl">
        <div className="grid items-center gap-12 lg:grid-cols-[1.2fr_0.8fr] lg:gap-16">

          {/* Left — text */}
          <div className="animate-fade-in-up">
            <span className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-4 py-1.5 text-xs font-semibold text-charcoal">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              Free for students
            </span>
            <h1 className="font-heading mt-6 text-[3rem] font-extrabold leading-[1.1] tracking-tight text-navy lg:text-[3.5rem]">
              Write to your rubric.<br />
              <span className="relative inline-block">
                Every time.
                <span
                  className="absolute -bottom-1 left-0 h-[6px] w-full rounded-full opacity-60"
                  style={{ background: "linear-gradient(90deg, #FBBF24, #F59E0B)" }}
                />
              </span>
            </h1>
            <p className="mt-7 max-w-[480px] text-lg leading-relaxed text-charcoal/75">
              Paste your draft. Wrex shows what you've covered, what's thin,
              and exactly what to fix — before you submit.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <button
                onClick={onTryFree}
                className="btn-shine rounded-soft bg-gradient-to-br from-accent to-accent-dark px-8 py-3.5 text-base font-bold text-navy shadow-button transition hover:shadow-glow hover:scale-[1.02] active:scale-[0.97]"
              >
                Try it now — free
              </button>
              <a href="#how-it-works" className="text-sm font-medium text-charcoal/60 underline-offset-4 transition hover:text-navy hover:underline">
                See how it works →
              </a>
            </div>
            <p className="mt-5 text-xs text-charcoal/40">
              No account needed · 3 free analyses/day with sign-up
            </p>
          </div>

          {/* Right — what you get card */}
          <div>
            <div className="animate-float">
              <div className="rounded-modal bg-white p-6 shadow-float">
                <p className="text-xs font-semibold uppercase tracking-widest text-charcoal/45">
                  What you get
                </p>
                <div className="mt-4 space-y-3">
                  {FEATURES.map(({ Icon, label, desc }) => (
                    <div key={label} className="flex items-start gap-3 rounded-input bg-mist px-4 py-3">
                      <Icon className="mt-0.5 h-4 w-4 flex-shrink-0 text-accent" />
                      <div>
                        <p className="text-sm font-semibold text-navy">{label}</p>
                        <p className="mt-0.5 text-xs leading-5 text-charcoal/60">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-input border border-accent/25 bg-accent/8 px-4 py-2.5">
                  <p className="text-xs font-medium text-charcoal/70">
                    Free · No account needed · Private
                  </p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}

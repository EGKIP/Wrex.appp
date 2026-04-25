import { useEffect, useRef } from "react";

const STEPS = [
  {
    num: "01",
    title: "Paste your draft",
    body: "Drop in whatever you've written — an essay, a rough paragraph, any stage. No setup, no account required.",
    detail: "Works with any text",
  },
  {
    num: "02",
    title: "Wrex reads it",
    body: "Sentence by sentence: voice patterns, vocabulary, consistency. Pinpoints exactly which parts sound AI-generated and why.",
    detail: "Takes ~3 seconds",
  },
  {
    num: "03",
    title: "Fix what needs fixing",
    body: "A clear authenticity score, flagged sentences with explanations, and inline grammar fixes. Make it yours before you submit.",
    detail: "One-click corrections",
  },
];

export function HowItWorks() {
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
    <section id="how-it-works" className="bg-white px-6 py-20 lg:px-10 lg:py-28" ref={sectionRef}>
      <div className="mx-auto max-w-5xl">

        {/* Header */}
        <div className="scroll-reveal mb-16 max-w-lg">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-accent-dark">
            How it works
          </p>
          <h2 className="text-[1.75rem] font-bold leading-tight tracking-tight text-navy lg:text-[2.25rem]">
            From rough draft<br className="hidden sm:block" /> to confident submission.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-charcoal/65">
            30 seconds. No signup. No school data shared.
          </p>
        </div>

        {/* Step timeline — vertical connector line on desktop */}
        <div className="relative">
          {/* Vertical connector — visible on md+ */}
          <div
            className="absolute left-[26px] top-10 hidden h-[calc(100%-80px)] w-[2px] md:block"
            style={{ background: "linear-gradient(180deg, #FBBF24 0%, #E2E8F0 60%, transparent 100%)" }}
          />

          <div className="flex flex-col gap-10 md:gap-14">
            {STEPS.map(({ num, title, body, detail }, i) => (
              <div
                key={num}
                className="scroll-reveal flex gap-6 md:gap-10"
                data-delay={String(i + 1) as "1" | "2" | "3"}
              >
                {/* Number bubble */}
                <div className="relative flex shrink-0 flex-col items-center">
                  <div className={`flex h-[54px] w-[54px] items-center justify-center rounded-full border-2 text-sm font-bold shadow-sm ${
                    i === 0
                      ? "border-accent bg-accent text-navy"
                      : "border-border-base bg-white text-charcoal/60"
                  }`}>
                    {num}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 pb-2 pt-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-xl font-bold text-navy">{title}</h3>
                    <span className="rounded-full border border-border-base bg-mist px-2.5 py-0.5 text-[11px] font-medium text-charcoal/50">
                      {detail}
                    </span>
                  </div>
                  <p className="mt-3 max-w-[520px] text-base leading-relaxed text-charcoal/65">
                    {body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom CTA strip */}
        <div className="scroll-reveal mt-16 flex flex-wrap items-center justify-between gap-6 rounded-modal border border-border-base bg-mist px-7 py-6">
          <div>
            <p className="text-base font-semibold text-navy">Ready to check your writing?</p>
            <p className="mt-1 text-sm text-charcoal/60">Free forever. No account needed to start.</p>
          </div>
          <a
            href="#analyzer"
            className="btn-shine rounded-soft bg-gradient-to-br from-accent to-accent-dark px-7 py-3 text-sm font-bold text-navy shadow-button transition hover:shadow-glow hover:scale-[1.02] active:scale-[0.97]"
          >
            Try it now →
          </a>
        </div>

      </div>
    </section>
  );
}



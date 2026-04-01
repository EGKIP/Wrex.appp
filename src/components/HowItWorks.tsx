import { useEffect, useRef } from "react";

const STEPS = [
  {
    num: "01",
    title: "Paste your draft",
    body: "Drop in whatever you've written — a full essay, a rough paragraph, any stage. Wrex meets you where you are.",
    accent: true,
  },
  {
    num: "02",
    title: "Wrex reads it",
    body: "Sentence by sentence: writing patterns, vocabulary, consistency, and how closely it matches your rubric criteria.",
    accent: false,
  },
  {
    num: "03",
    title: "See what to fix",
    body: "A clear score, flagged sentences with reasons, and specific writing tips. Not a grade — a guide for your next revision.",
    accent: false,
  },
];

export function HowItWorks() {
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const els = sectionRef.current?.querySelectorAll<HTMLElement>(".scroll-reveal");
    if (!els?.length) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in-view"); obs.unobserve(e.target); } });
      },
      { threshold: 0.12 }
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return (
    <section id="how-it-works" className="bg-white px-6 py-16 lg:px-10 lg:py-20" ref={sectionRef}>
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 text-center scroll-reveal">
          <h2 className="text-[1.75rem] font-bold tracking-tight text-navy lg:text-[2.25rem]">
            How it works
          </h2>
          <p className="mt-3 text-base text-charcoal/65">
            Three steps. No setup. Takes 30 seconds.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {STEPS.map(({ num, title, body, accent }, i) => (
            <div
              key={num}
              data-delay={String(i + 1) as "1" | "2" | "3"}
              className={`scroll-reveal rounded-modal p-7 shadow-soft transition duration-300 hover:shadow-soft-md hover:-translate-y-1 ${
                accent
                  ? "bg-gradient-to-br from-accent to-accent-dark"
                  : "border border-border-base bg-white"
              }`}
            >
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-full ${
                  accent ? "bg-navy/10" : "bg-mist"
                }`}
              >
                <span className={`font-stat text-sm font-bold ${accent ? "text-navy" : "text-charcoal"}`}>
                  {num}
                </span>
              </div>
              <h3 className={`mt-5 text-xl font-bold ${accent ? "text-navy" : "text-navy"}`}>
                {title}
              </h3>
              <p className={`mt-3 text-sm leading-7 ${accent ? "text-navy/75" : "text-charcoal/70"}`}>
                {body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}


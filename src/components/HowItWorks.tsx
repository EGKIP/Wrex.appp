const steps = [
  {
    number: "01",
    title: "Paste your draft",
    desc: "Drop in whatever you've written so far. A full essay, a paragraph, a rough draft — any stage works.",
  },
  {
    number: "02",
    title: "Wrex reads it",
    desc: "We scan sentence by sentence for writing patterns, consistency, and how well it matches the assignment criteria.",
  },
  {
    number: "03",
    title: "You see exactly what to fix",
    desc: "A clear score, flagged sentences with reasons, and specific tips. Not a grade — a guide for your next revision.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-white">
      <div className="mx-auto max-w-7xl px-6 py-16 lg:px-10 lg:py-20">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="text-[1.75rem] font-bold tracking-tight text-navy lg:text-[2rem]">
            How it works
          </h2>
          <p className="mt-3 text-base leading-relaxed text-charcoal/70">
            Three steps. No setup. Takes 30 seconds.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {steps.map((step) => (
            <div
              key={step.number}
              className="rounded-card border border-border-base bg-white p-6 shadow-soft transition hover:shadow-soft-md hover:-translate-y-0.5"
            >
              {/* Yellow number circle */}
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent">
                <span className="text-base font-bold text-navy">{step.number}</span>
              </div>
              <h3 className="mt-5 text-lg font-semibold text-navy">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-7 text-charcoal/75">
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}


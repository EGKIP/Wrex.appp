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
    <section id="how-it-works" className="bg-mist">
      <div className="mx-auto max-w-7xl px-6 py-16 lg:px-10 lg:py-20">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-navy">
            How it works
          </h2>
          <p className="mt-3 text-base text-charcoal/70">
            Three steps. No setup. Takes 30 seconds.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {steps.map((step) => (
            <div
              key={step.number}
              className="rounded-[2rem] border border-navy/8 bg-white p-8"
            >
              <span className="text-4xl font-semibold tracking-tight text-accent">
                {step.number}
              </span>
              <h3 className="mt-4 text-lg font-semibold text-navy">
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


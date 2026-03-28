const features = [
  "Humanize writing",
  "Improve clarity and flow",
  "Grammar and style suggestions",
  "Rubric-based writing help",
  "Curated writing templates",
];

export function ProPreview() {
  return (
    <section
      id="pro-preview"
      className="mx-auto max-w-7xl px-6 py-10 lg:px-10 lg:py-16"
    >
      <div className="rounded-[2rem] border border-navy/10 bg-mist p-8 shadow-soft lg:p-10">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-navy/10 bg-white px-4 py-2 text-sm font-medium text-charcoal/80">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-accent" />
              Locked Pro writing preview
            </div>
            <h2 className="mt-5 text-3xl font-semibold tracking-tight text-navy">
              Improve your writing with Pro when deeper support launches.
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-8 text-charcoal/75">
              The free detector helps identify likely issues. Pro is where Wrex
              will offer guided revision help, natural phrasing support, grammar
              feedback, and structure-aware writing assistance.
            </p>
          </div>
          <div className="rounded-soft border border-white/80 bg-white px-5 py-4 text-sm text-charcoal shadow-sm">
            <p className="text-charcoal/55">Student pricing preview</p>
            <p className="mt-2 text-2xl font-semibold text-navy">$8/month</p>
            <p className="mt-3 text-charcoal/60">Regular: $12/month</p>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {features.map((feature) => (
            <div
              key={feature}
              className="relative overflow-hidden rounded-soft border border-navy/10 bg-white p-5"
            >
              <span className="absolute right-4 top-4 rounded-full border border-navy/10 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-charcoal/45">
                Locked
              </span>
              <p className="max-w-[11rem] pt-8 text-base font-medium text-navy">
                {feature}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

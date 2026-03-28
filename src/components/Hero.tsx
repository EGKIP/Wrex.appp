export function Hero() {
  return (
    <section className="mx-auto grid max-w-7xl gap-12 px-6 pb-14 pt-12 lg:grid-cols-[1.1fr_0.9fr] lg:px-10 lg:pb-20 lg:pt-16">
      <div className="max-w-2xl">
        <div className="mb-5 inline-flex items-center rounded-full border border-accent/50 bg-accent/15 px-4 py-1.5 text-sm font-medium text-navy">
          Study use only
        </div>
        <h1 className="max-w-xl text-4xl font-semibold tracking-tight text-navy sm:text-5xl">
          Calm, explainable AI text analysis for student writing.
        </h1>
        <p className="mt-5 max-w-xl text-lg leading-8 text-charcoal/80">
          Wrex.app helps students review writing for patterns commonly associated
          with AI-assisted text. Results stay informational, probabilistic, and
          designed to support learning.
        </p>
        <div className="mt-8 flex flex-wrap gap-4 text-sm text-charcoal/75">
          <span className="rounded-full border border-navy/10 px-4 py-2">
            Explainable scoring
          </span>
          <span className="rounded-full border border-navy/10 px-4 py-2">
            Flagged sentence review
          </span>
          <span className="rounded-full border border-navy/10 px-4 py-2">
            Writing tips and Pro guidance
          </span>
        </div>
      </div>
      <div className="rounded-[2rem] border border-navy/10 bg-mist p-7 shadow-soft">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-charcoal/50">
            Phase 1
          </p>
          <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-charcoal/75">
            Free detector live
          </span>
        </div>
        <div className="mt-8 space-y-5">
          <div className="rounded-soft bg-white p-5">
            <p className="text-sm text-charcoal/60">What you get now</p>
            <p className="mt-2 text-lg font-semibold text-navy">
              AI-likelihood score, confidence, red flags, highlighted sentences,
              and study-minded writing tips.
            </p>
          </div>
          <div className="rounded-soft border border-dashed border-navy/15 bg-white p-5">
            <p className="text-sm text-charcoal/60">What Pro will add</p>
            <p className="mt-2 text-lg font-semibold text-navy">
              Humanizing support, grammar guidance, clarity improvements, and
              rubric-based writing help.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

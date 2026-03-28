export function Hero() {
  return (
    <section className="mx-auto grid max-w-7xl gap-12 px-6 pb-14 pt-12 lg:grid-cols-[1.1fr_0.9fr] lg:px-10 lg:pb-20 lg:pt-16">
      <div className="max-w-2xl">
        <div className="mb-5 inline-flex items-center rounded-full border border-accent/50 bg-accent/15 px-4 py-1.5 text-sm font-medium text-navy">
          Built for students, not institutions
        </div>
        <h1 className="max-w-xl text-4xl font-semibold tracking-tight text-navy sm:text-5xl">
          Understand your writing before your professor does.
        </h1>
        <p className="mt-5 max-w-xl text-lg leading-8 text-charcoal/80">
          Wrex.app scans your writing for patterns associated with AI-generated
          text — then shows you exactly why, sentence by sentence. No
          accusations. Just clear, calm feedback you can act on.
        </p>
        <div className="mt-8 flex flex-wrap gap-4 text-sm text-charcoal/75">
          <span className="rounded-full border border-navy/10 px-4 py-2">
            Sentence-level breakdown
          </span>
          <span className="rounded-full border border-navy/10 px-4 py-2">
            Explainable scoring
          </span>
          <span className="rounded-full border border-navy/10 px-4 py-2">
            Rubric alignment — coming Pro
          </span>
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          <a
            href="#analyzer"
            className="rounded-2xl bg-navy px-6 py-3 text-sm font-semibold text-white transition hover:bg-navy/90"
          >
            Analyze my writing
          </a>
          <a
            href="#waitlist"
            className="rounded-2xl border border-navy/15 px-6 py-3 text-sm font-semibold text-navy transition hover:bg-mist"
          >
            Get Pro early access
          </a>
        </div>
      </div>
      <div className="rounded-[2rem] border border-navy/10 bg-mist p-7 shadow-soft">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-charcoal/50">
            What Wrex does
          </p>
          <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-charcoal/75">
            Free to try
          </span>
        </div>
        <div className="mt-8 space-y-5">
          <div className="rounded-soft bg-white p-5">
            <p className="text-sm text-charcoal/60">Free detector</p>
            <p className="mt-2 text-lg font-semibold text-navy">
              AI-likelihood score, flagged sentences with reasons, red flags,
              and writing tips — instantly.
            </p>
          </div>
          <div className="rounded-soft border border-dashed border-navy/15 bg-white p-5">
            <p className="text-sm text-charcoal/60">Pro — coming soon</p>
            <p className="mt-2 text-lg font-semibold text-navy">
              Rubric alignment, humanizing guidance, grammar improvements, and
              your personal Writing DNA baseline.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

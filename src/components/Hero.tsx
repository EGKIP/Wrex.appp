export function Hero() {
  return (
    <section className="mx-auto max-w-4xl px-6 pb-16 pt-20 text-center lg:px-10 lg:pb-24 lg:pt-28">
      <h1 className="text-5xl font-semibold tracking-tight text-navy sm:text-6xl">
        Know if your writing<br />actually answers the question.
      </h1>
      <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-charcoal/75">
        Paste your draft and your rubric. Wrex tells you what you've covered,
        what's thin, and what's missing — before you submit.
      </p>
      <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
        <a
          href="#analyzer"
          className="rounded-2xl bg-navy px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-navy/90"
        >
          Try it free →
        </a>
      </div>
      <p className="mt-4 text-xs text-charcoal/55">
        No account needed · Free to start · 3 analyses per day
      </p>
    </section>
  );
}

export function Hero() {
  return (
    <section className="bg-gradient-to-b from-mist to-white px-6 pb-24 pt-24 text-center lg:px-10 lg:pb-32 lg:pt-32">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-[3rem] font-bold leading-[1.2] tracking-tight text-navy sm:text-[3.5rem]">
          Write to your rubric.<br />Every time.
        </h1>
        <p className="mx-auto mt-6 max-w-[600px] text-lg leading-relaxed text-charcoal/80">
          Paste your draft. Wrex shows you what you've covered, what's thin,
          and exactly what to fix — before you submit.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <a
            href="#analyzer"
            className="rounded-lg bg-accent px-8 py-3.5 text-base font-bold text-navy shadow-card transition hover:bg-accent-dark hover:scale-[1.02]"
          >
            Try it now — no signup needed
          </a>
        </div>
        <p className="mt-4 text-sm text-charcoal/50">
          Free forever · 3 analyses/day with account
        </p>
      </div>
    </section>
  );
}

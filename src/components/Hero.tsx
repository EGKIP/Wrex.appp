export function Hero() {
  return (
    <section className="mx-auto grid max-w-7xl gap-12 px-6 pb-14 pt-12 lg:grid-cols-[1.1fr_0.9fr] lg:px-10 lg:pb-20 lg:pt-16">
      <div className="flex flex-col justify-center">
        <h1 className="max-w-lg text-4xl font-semibold tracking-tight text-navy sm:text-5xl">
          Write to your rubric.<br />Every time.
        </h1>
        <p className="mt-5 max-w-md text-lg leading-8 text-charcoal/70">
          Paste your assignment brief and your draft. Wrex tells you how well
          your writing meets the criteria — sentence by sentence.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <a
            href="#analyzer"
            className="rounded-2xl bg-navy px-6 py-3 text-sm font-semibold text-white transition hover:bg-navy/90"
          >
            Try it free
          </a>
          <a
            href="#waitlist"
            className="rounded-2xl border border-navy/15 px-6 py-3 text-sm font-semibold text-navy transition hover:bg-mist"
          >
            Get early access
          </a>
        </div>
      </div>

      <div className="rounded-[2rem] border border-navy/10 bg-mist p-7 shadow-soft">
        <div className="space-y-4">
          <FeatureRow
            label="Rubric alignment"
            desc="See which criteria your draft covers and which it misses."
            badge="Pro"
          />
          <FeatureRow
            label="AI pattern check"
            desc="Understand which sentences may read as AI-generated and why."
            badge="Free"
          />
          <FeatureRow
            label="Writing tips"
            desc="Actionable suggestions to strengthen your draft."
            badge="Free"
          />
          <FeatureRow
            label="Deep rewrite guidance"
            desc="Paragraph-level rewrites aligned to your rubric."
            badge="Pro"
          />
        </div>
      </div>
    </section>
  );
}

function FeatureRow({ label, desc, badge }: { label: string; desc: string; badge: "Free" | "Pro" }) {
  const isPro = badge === "Pro";
  return (
    <div className="flex items-start gap-4 rounded-soft bg-white p-4">
      <span className={`mt-0.5 shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${isPro ? "bg-navy text-accent" : "bg-accent/20 text-navy"}`}>
        {badge}
      </span>
      <div>
        <p className="text-sm font-semibold text-navy">{label}</p>
        <p className="mt-0.5 text-sm text-charcoal/65">{desc}</p>
      </div>
    </div>
  );
}

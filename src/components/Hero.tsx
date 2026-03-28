const PREVIEW_ITEMS = [
  { label: "Causes addressed", status: "covered" },
  { label: "Social impact", status: "partial" },
  { label: "Economic analysis", status: "missing" },
];

function statusStyle(status: string) {
  if (status === "covered") return { dot: "bg-success", text: "text-success", badge: "bg-success/10 text-success" };
  if (status === "partial") return { dot: "bg-warning", text: "text-warning", badge: "bg-warning/10 text-warning" };
  return { dot: "bg-danger", text: "text-danger", badge: "bg-danger/10 text-danger" };
}

function statusLabel(status: string) {
  if (status === "covered") return "Covered";
  if (status === "partial") return "Partial";
  return "Missing";
}

export function Hero() {
  return (
    <section className="relative overflow-hidden px-6 pb-20 pt-20 lg:px-10 lg:pb-28 lg:pt-28">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-canvas via-white to-mist" />

      {/* Yellow blob */}
      <div
        className="blob-yellow"
        style={{ width: 520, height: 520, top: -120, right: -80 }}
      />

      <div className="relative mx-auto max-w-7xl">
        <div className="grid items-center gap-12 lg:grid-cols-[1.2fr_0.8fr] lg:gap-16">

          {/* Left — text */}
          <div className="animate-fade-in-up">
            <span className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-4 py-1.5 text-xs font-semibold text-charcoal">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              Free for students
            </span>
            <h1 className="font-heading mt-6 text-[3rem] font-extrabold leading-[1.1] tracking-tight text-navy lg:text-[3.5rem]">
              Write to your rubric.<br />
              <span className="relative inline-block">
                Every time.
                <span
                  className="absolute -bottom-1 left-0 h-[6px] w-full rounded-full opacity-60"
                  style={{ background: "linear-gradient(90deg, #FBBF24, #F59E0B)" }}
                />
              </span>
            </h1>
            <p className="mt-7 max-w-[480px] text-lg leading-relaxed text-charcoal/75">
              Paste your draft. Wrex shows what you've covered, what's thin,
              and exactly what to fix — before you submit.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <a
                href="#analyzer"
                className="btn-shine rounded-soft bg-gradient-to-br from-accent to-accent-dark px-8 py-3.5 text-base font-bold text-navy shadow-button transition hover:shadow-glow hover:scale-[1.02] active:scale-[0.97]"
              >
                Try it now — free
              </a>
              <a href="#how-it-works" className="text-sm font-medium text-charcoal/60 underline-offset-4 transition hover:text-navy hover:underline">
                See how it works →
              </a>
            </div>
            <p className="mt-5 text-xs text-charcoal/40">
              No account needed · 3 free analyses/day with sign-up
            </p>
          </div>

          {/* Right — floating preview card */}
          <div className="hidden lg:block">
            <div className="animate-float">
              <div
                className="rounded-modal bg-white p-6 shadow-float"
                style={{ transform: "rotate(3deg)" }}
              >
                {/* Score badge */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-charcoal/50">
                      Rubric alignment
                    </p>
                    <p className="font-stat mt-1 text-4xl font-bold text-navy">72%</p>
                  </div>
                  <div className="flex h-14 w-14 items-center justify-center rounded-score bg-gradient-to-br from-warning/20 to-accent/10">
                    <span className="text-2xl">📝</span>
                  </div>
                </div>

                {/* Criterion list */}
                <div className="mt-4 space-y-2">
                  {PREVIEW_ITEMS.map(({ label, status }) => {
                    const s = statusStyle(status);
                    return (
                      <div key={label} className="flex items-center justify-between rounded-input bg-mist px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full ${s.dot}`} />
                          <span className="text-xs font-medium text-charcoal">{label}</span>
                        </div>
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.badge}`}>
                          {statusLabel(status)}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Bottom tip */}
                <div className="mt-4 rounded-input border border-accent/20 bg-accent/5 px-3 py-2">
                  <p className="text-xs text-charcoal/70">
                    💡 <span className="font-medium">Tip:</span> Add more on economic factors — that criterion is missing.
                  </p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}

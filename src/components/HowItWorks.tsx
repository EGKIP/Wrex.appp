export function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-white px-6 py-16 lg:px-10 lg:py-20">
      <div className="mx-auto max-w-7xl">

        {/* Section label */}
        <div className="mb-10 text-center">
          <h2 className="font-heading text-[1.75rem] font-bold tracking-tight text-navy lg:text-[2.25rem]">
            How it works
          </h2>
          <p className="mt-3 text-base text-charcoal/65">
            Three steps. No setup. Takes 30 seconds.
          </p>
        </div>

        {/* Bento grid */}
        <div className="bento-grid grid gap-4" style={{ gridTemplateColumns: "repeat(6, 1fr)" }}>
          {/* Tile 1 — Large yellow (spans 3 cols, 2 rows) */}
          <div
            className="relative overflow-hidden rounded-modal p-8 transition-transform duration-300 hover:-translate-y-1"
            style={{
              gridColumn: "1 / 4",
              gridRow: "1 / 3",
              background: "linear-gradient(135deg, #FBBF24 0%, #F59E0B 100%)",
            }}
          >
            <span className="absolute bottom-5 right-5 text-8xl opacity-10 select-none">📋</span>
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-navy/10">
              <span className="font-stat text-sm font-bold text-navy">01</span>
            </div>
            <h3 className="font-heading mt-6 text-2xl font-bold text-navy">
              Paste your draft
            </h3>
            <p className="mt-3 max-w-[280px] text-base leading-relaxed text-navy/75">
              Drop in whatever you've written. A full essay, a rough paragraph, any stage works — Wrex meets you where you are.
            </p>
          </div>

          {/* Tile 2 — White (spans 3 cols, 1 row) */}
          <div
            className="relative overflow-hidden rounded-modal border border-border-base bg-white p-7 shadow-soft transition duration-300 hover:shadow-soft-md hover:-translate-y-1"
            style={{ gridColumn: "4 / 7", gridRow: "1 / 2" }}
          >
            <span className="absolute bottom-4 right-4 text-6xl opacity-[0.07] select-none">🔍</span>
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-navy/5">
              <span className="font-stat text-sm font-bold text-charcoal">02</span>
            </div>
            <h3 className="font-heading mt-5 text-xl font-bold text-navy">
              Wrex reads it
            </h3>
            <p className="mt-2 text-sm leading-7 text-charcoal/70">
              Sentence by sentence: writing patterns, consistency, and how closely it matches your rubric criteria.
            </p>
          </div>

          {/* Tile 3 — Dark navy (spans 3 cols, 1 row) */}
          <div
            className="relative overflow-hidden rounded-modal p-7 transition duration-300 hover:-translate-y-1"
            style={{
              gridColumn: "4 / 7",
              gridRow: "2 / 3",
              background: "#0F172A",
            }}
          >
            <span className="absolute bottom-4 right-4 text-6xl opacity-[0.1] select-none">✅</span>
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10">
              <span className="font-stat text-sm font-bold text-white">03</span>
            </div>
            <h3 className="font-heading mt-5 text-xl font-bold text-white">
              You see what to fix
            </h3>
            <p className="mt-2 text-sm leading-7 text-white/65">
              A clear score, flagged sentences with reasons, and specific tips. Not a grade — a guide for your next revision.
            </p>
          </div>
        </div>

        {/* Mobile responsive override */}
        <style>{`
          @media (max-width: 768px) {
            .bento-grid { grid-template-columns: 1fr !important; }
            .bento-grid > div { grid-column: 1 / -1 !important; grid-row: auto !important; }
          }
        `}</style>

      </div>
    </section>
  );
}


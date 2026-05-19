import { Check } from "lucide-react";

interface FreeVsPaidProps {
  onUpgrade?: () => void;
}

const FREE_ITEMS = [
  "Authenticity score",
  "Sentence highlights",
  "Inline grammar fixes",
  "500 words per check",
];

const PAID_ITEMS = [
  "2,000 words per check",
  "Rubric and assignment matching",
  "Rewrite suggestions in your voice",
  "Saved workspace history",
];

function FeatureList({ items }: { items: string[] }) {
  return (
    <ul className="mt-5 space-y-3">
      {items.map((item) => (
        <li key={item} className="flex gap-2 text-sm leading-6 text-charcoal/70">
          <Check className="mt-1 h-4 w-4 shrink-0 text-success" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function FreeVsPaid({ onUpgrade }: FreeVsPaidProps) {
  return (
    <section id="pricing" className="bg-[#fbfbf8] px-6 py-18 lg:px-10 lg:py-24">
      <div className="mx-auto max-w-5xl">
        <div className="mb-10 max-w-xl">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-accent-dark">
            Free vs paid
          </p>
          <h2 className="text-[1.75rem] font-bold leading-tight tracking-tight text-navy lg:text-[2.25rem]">
            Start free. Upgrade when your drafts get longer.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-charcoal/65">
            The landing page stays simple because the choice is simple: free checks for quick revision,
            paid tools for deeper assignment work.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-modal border border-border-base bg-white p-6 shadow-soft">
            <p className="text-sm font-semibold text-charcoal/55">Free</p>
            <div className="mt-2 flex items-end gap-2">
              <span className="text-4xl font-extrabold tracking-tight text-navy">$0</span>
              <span className="pb-1 text-sm text-charcoal/50">to start</span>
            </div>
            <FeatureList items={FREE_ITEMS} />
            <a
              href="#analyzer"
              className="mt-7 inline-flex rounded-soft border border-navy/15 px-5 py-2.5 text-sm font-bold text-navy transition hover:bg-navy hover:text-white"
            >
              Try free
            </a>
          </div>

          <div className="rounded-modal border border-accent/40 bg-white p-6 shadow-soft">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm font-semibold text-charcoal/55">Paid</p>
              <span className="rounded-full bg-accent/15 px-3 py-1 text-xs font-bold text-navy">
                Student-friendly
              </span>
            </div>
            <div className="mt-2 flex items-end gap-2">
              <span className="text-4xl font-extrabold tracking-tight text-navy">$9</span>
              <span className="pb-1 text-sm text-charcoal/50">/ month</span>
            </div>
            <FeatureList items={PAID_ITEMS} />
            <button
              type="button"
              onClick={onUpgrade}
              className="btn-shine mt-7 rounded-soft bg-gradient-to-br from-accent to-accent-dark px-5 py-2.5 text-sm font-bold text-navy shadow-button transition hover:scale-[1.02] hover:shadow-glow active:scale-[0.97]"
            >
              Upgrade when ready
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

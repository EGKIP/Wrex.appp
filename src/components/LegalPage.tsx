import { Brand } from "./Brand";

type LegalSection = {
  title: string;
  body: readonly string[];
};

type LegalPageProps = {
  title: string;
  effectiveDate: string;
  intro: string;
  sections: readonly LegalSection[];
};

export function LegalPage({ title, effectiveDate, intro, sections }: LegalPageProps) {
  return (
    <main className="flex-1 bg-canvas">
      <section className="mx-auto max-w-4xl px-6 py-14 sm:py-18 lg:px-10">
        <div className="mb-10 flex flex-col gap-6 border-b border-border-base pb-8 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Brand />
            <p className="mt-6 text-xs font-semibold uppercase tracking-widest text-charcoal/40">
              {effectiveDate}
            </p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight text-navy sm:text-5xl">
              {title}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-charcoal/65">
              {intro}
            </p>
          </div>
          <a
            href="/"
            className="inline-flex shrink-0 items-center justify-center rounded-soft border border-navy/15 bg-white px-4 py-2 text-sm font-semibold text-navy shadow-sm transition hover:border-navy/30 hover:bg-navy hover:text-white"
          >
            Back home
          </a>
        </div>

        <div className="space-y-8">
          {sections.map((section) => (
            <section key={section.title} className="border-b border-border-base pb-8 last:border-b-0">
              <h2 className="text-lg font-bold text-navy">{section.title}</h2>
              <div className="mt-3 space-y-3 text-sm leading-7 text-charcoal/65">
                {section.body.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </section>
    </main>
  );
}

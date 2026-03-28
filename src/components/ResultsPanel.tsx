import type { AnalyzeResponse } from "../types";

type ResultsPanelProps = {
  results: AnalyzeResponse | null;
};

function confidenceTone(confidence: AnalyzeResponse["confidence"]) {
  if (confidence === "High") {
    return "bg-accent/30 text-navy";
  }

  if (confidence === "Medium") {
    return "bg-mist text-navy";
  }

  return "bg-white text-charcoal";
}

export function ResultsPanel({ results }: ResultsPanelProps) {
  if (!results) {
    return (
      <aside className="rounded-[2rem] border border-dashed border-navy/15 bg-mist p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-charcoal/45">
          Results
        </p>
        <h3 className="mt-3 text-2xl font-semibold tracking-tight text-navy">
          Smart, calm feedback appears here
        </h3>
        <p className="mt-4 max-w-md text-base leading-7 text-charcoal/75">
          Analyze a passage to view the AI-likelihood score, confidence level,
          highlighted sentences, and practical tips for improving natural flow.
        </p>
      </aside>
    );
  }

  return (
    <aside className="space-y-5">
      <section className="rounded-[2rem] border border-navy/10 bg-white p-6 shadow-soft sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-charcoal/45">
              Detector result
            </p>
            <h3 className="mt-2 text-4xl font-semibold tracking-tight text-navy">
              {results.score}
              <span className="ml-2 text-xl text-charcoal/45">/100</span>
            </h3>
          </div>
          <div
            className={`rounded-full px-4 py-2 text-sm font-semibold ${confidenceTone(results.confidence)}`}
          >
            Confidence: {results.confidence}
          </div>
        </div>
        <p className="mt-5 rounded-soft bg-mist px-5 py-4 text-base leading-7 text-charcoal/85">
          {results.summary}
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <StatCard
            label="Word count"
            value={results.stats.word_count.toString()}
          />
          <StatCard
            label="Sentence count"
            value={results.stats.sentence_count.toString()}
          />
          <StatCard
            label="Avg sentence length"
            value={results.stats.avg_sentence_length.toFixed(1)}
          />
          <StatCard
            label="Vocabulary diversity"
            value={results.stats.vocabulary_diversity.toFixed(2)}
          />
        </div>
      </section>

      <section className="rounded-[2rem] border border-navy/10 bg-white p-6 shadow-soft">
        <h4 className="text-lg font-semibold text-navy">Red flags</h4>
        <div className="mt-4 flex flex-wrap gap-3">
          {results.red_flags.map((flag) => (
            <span
              key={flag}
              className="rounded-full border border-accent/45 bg-accent/20 px-4 py-2 text-sm text-charcoal"
            >
              {flag}
            </span>
          ))}
        </div>
      </section>

      <section className="rounded-[2rem] border border-navy/10 bg-white p-6 shadow-soft">
        <h4 className="text-lg font-semibold text-navy">Flagged sentences</h4>
        <div className="mt-4 space-y-4">
          {results.flagged_sentences.length ? (
            results.flagged_sentences.map((sentence) => (
              <article
                key={`${sentence.index}-${sentence.text}`}
                className="rounded-soft border border-accent/45 bg-accent/18 p-4"
              >
                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm font-semibold text-navy">
                    Sentence {sentence.index + 1}
                  </p>
                  <span className="text-sm text-charcoal/65">
                    Signal {Math.round(sentence.score * 100)}%
                  </span>
                </div>
                <p className="mt-3 text-base leading-7 text-charcoal">
                  {sentence.text}
                </p>
                <p className="mt-3 text-sm text-charcoal/75">{sentence.reason}</p>
              </article>
            ))
          ) : (
            <p className="text-sm text-charcoal/70">
              No single sentence strongly stood out. The overall score is based on
              combined document-level patterns.
            </p>
          )}
        </div>
      </section>

      <section className="rounded-[2rem] border border-navy/10 bg-white p-6 shadow-soft">
        <h4 className="text-lg font-semibold text-navy">Basic writing tips</h4>
        <div className="mt-4 space-y-3">
          {results.basic_tips.map((tip) => (
            <p key={tip} className="rounded-soft bg-mist px-4 py-3 text-sm text-charcoal">
              {tip}
            </p>
          ))}
        </div>
      </section>

      <section className="rounded-[2rem] border border-navy/10 bg-navy p-6 text-white shadow-soft">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/65">
          Pro preview
        </p>
        <h4 className="mt-3 text-2xl font-semibold">{results.pro_prompt.title}</h4>
        <p className="mt-3 max-w-md text-sm leading-7 text-white/80">
          {results.pro_prompt.message}
        </p>
        <button
          type="button"
          className="mt-5 rounded-2xl bg-accent px-5 py-3 text-sm font-semibold text-navy"
        >
          {results.pro_prompt.cta_label}
        </button>
      </section>
    </aside>
  );
}

type StatCardProps = {
  label: string;
  value: string;
};

function StatCard({ label, value }: StatCardProps) {
  return (
    <div className="rounded-soft border border-navy/8 bg-mist px-4 py-4">
      <p className="text-sm text-charcoal/55">{label}</p>
      <p className="mt-2 text-xl font-semibold text-navy">{value}</p>
    </div>
  );
}

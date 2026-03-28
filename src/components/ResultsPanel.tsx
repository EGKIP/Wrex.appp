import type { AnalyzeResponse } from "../types";

type ResultsPanelProps = {
  results: AnalyzeResponse | null;
  loading?: boolean;
};

function confidenceTone(confidence: AnalyzeResponse["confidence"]) {
  if (confidence === "High") return "bg-accent/30 text-navy";
  if (confidence === "Medium") return "bg-mist text-navy";
  return "bg-white/60 text-charcoal";
}

/** Animated circular arc that fills proportionally to the score (0–100). */
function ScoreArc({ score }: { score: number }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const filled = (score / 100) * circumference;
  const color =
    score >= 70 ? "#f59e0b" : score >= 40 ? "#fbbf24" : "#10b981";

  return (
    <div className="relative flex h-36 w-36 items-center justify-center">
      <svg className="-rotate-90" width="144" height="144" viewBox="0 0 144 144">
        <circle cx="72" cy="72" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="10" />
        <circle
          cx="72" cy="72" r={radius} fill="none"
          stroke={color} strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference}`}
          style={{ transition: "stroke-dasharray 0.8s ease" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-3xl font-semibold text-navy">{score}</span>
        <span className="text-xs text-charcoal/50">/ 100</span>
      </div>
    </div>
  );
}

/** Signal strength bar shown per flagged sentence. */
function SignalBar({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color = pct >= 75 ? "bg-amber-400" : pct >= 55 ? "bg-yellow-300" : "bg-emerald-300";
  return (
    <div className="mt-2 flex items-center gap-3">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-navy/10">
        <div
          className={`h-full rounded-full ${color} transition-all duration-700`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="shrink-0 text-xs font-medium text-charcoal/60">{pct}%</span>
    </div>
  );
}

/** Skeleton card shown while analysis is loading. */
function SkeletonPanel() {
  return (
    <aside className="space-y-5 animate-pulse">
      <div className="rounded-[2rem] border border-navy/10 bg-white p-6 shadow-soft sm:p-8">
        <div className="flex items-center gap-6">
          <div className="h-36 w-36 rounded-full bg-navy/8" />
          <div className="flex-1 space-y-3">
            <div className="h-3 w-24 rounded bg-navy/8" />
            <div className="h-6 w-40 rounded bg-navy/8" />
            <div className="h-3 w-32 rounded bg-navy/8" />
          </div>
        </div>
        <div className="mt-6 h-16 rounded-soft bg-mist" />
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 rounded-soft bg-mist" />
          ))}
        </div>
      </div>
      <div className="h-28 rounded-[2rem] border border-navy/10 bg-white shadow-soft" />
      <div className="h-48 rounded-[2rem] border border-navy/10 bg-white shadow-soft" />
    </aside>
  );
}

export function ResultsPanel({ results, loading = false }: ResultsPanelProps) {
  if (loading) return <SkeletonPanel />;

  if (!results) {
    return (
      <aside className="rounded-[2rem] border border-dashed border-navy/15 bg-mist p-8">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-soft">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-navy/60">
            <path d="M9 12h6M9 16h6M9 8h6M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" strokeLinecap="round" />
          </svg>
        </div>
        <h3 className="mt-5 text-2xl font-semibold tracking-tight text-navy">
          Paste your writing, get honest feedback
        </h3>
        <p className="mt-3 max-w-md text-base leading-7 text-charcoal/70">
          Your score, confidence level, flagged sentences, and writing tips will
          appear here — calm, clear, and sentence-by-sentence.
        </p>
        <ul className="mt-5 space-y-2 text-sm text-charcoal/60">
          {["AI-likelihood score with visual indicator", "Flagged sentences with signal strength", "Red flags and actionable writing tips"].map(item => (
            <li key={item} className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              {item}
            </li>
          ))}
        </ul>
      </aside>
    );
  }

  return (
    <aside className="space-y-5">
      {/* Score + summary */}
      <section className="rounded-[2rem] border border-navy/10 bg-white p-6 shadow-soft sm:p-8">
        <div className="flex flex-wrap items-center gap-6">
          <ScoreArc score={results.score} />
          <div className="flex-1">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-charcoal/45">
              AI-likelihood score
            </p>
            <p className="mt-1 text-lg font-semibold text-navy">
              {results.score >= 70 ? "High pattern match" : results.score >= 40 ? "Moderate pattern match" : "Low pattern match"}
            </p>
            <div className={`mt-3 inline-block rounded-full px-4 py-1.5 text-sm font-semibold ${confidenceTone(results.confidence)}`}>
              Confidence: {results.confidence}
            </div>
          </div>
        </div>
        <p className="mt-5 rounded-soft bg-mist px-5 py-4 text-base leading-7 text-charcoal/85">
          {results.summary}
        </p>
        {/* All 8 stats */}
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <StatCard label="Word count" value={results.stats.word_count.toString()} />
          <StatCard label="Sentence count" value={results.stats.sentence_count.toString()} />
          <StatCard label="Avg sentence length" value={`${results.stats.avg_sentence_length.toFixed(1)} words`} />
          <StatCard label="Vocabulary diversity" value={(results.stats.vocabulary_diversity * 100).toFixed(0) + "%"} />
          <StatCard label="Sentence length variance" value={results.stats.sentence_length_variance.toFixed(1)} hint="Low = suspiciously uniform" />
          <StatCard label="Repetition index" value={(results.stats.repetition_index * 100).toFixed(0) + "%"} hint="Higher = more repeated phrasing" />
          <StatCard label="Punctuation diversity" value={results.stats.punctuation_diversity.toFixed(2)} hint="Lower = fewer punctuation types used" />
          <StatCard label="Transition phrases" value={results.stats.transition_phrase_count.toString()} hint="Count of generic openers" />
        </div>
      </section>

      {/* Red flags */}
      <section className="rounded-[2rem] border border-navy/10 bg-white p-6 shadow-soft">
        <h4 className="text-lg font-semibold text-navy">Pattern signals</h4>
        <div className="mt-4 flex flex-wrap gap-3">
          {results.red_flags.map((flag) => (
            <span key={flag} className="rounded-full border border-accent/45 bg-accent/20 px-4 py-2 text-sm text-charcoal">
              {flag}
            </span>
          ))}
        </div>
      </section>

      {/* Flagged sentences with signal bars */}
      <section className="rounded-[2rem] border border-navy/10 bg-white p-6 shadow-soft">
        <h4 className="text-lg font-semibold text-navy">Flagged sentences</h4>
        <div className="mt-4 space-y-4">
          {results.flagged_sentences.length ? (
            results.flagged_sentences.map((sentence) => (
              <article key={`${sentence.index}-${sentence.text}`} className="rounded-soft border border-accent/35 bg-accent/10 p-4">
                <p className="text-sm font-semibold text-navy">Sentence {sentence.index + 1}</p>
                <SignalBar score={sentence.score} />
                <p className="mt-3 text-base leading-7 text-charcoal">{sentence.text}</p>
                <p className="mt-2 text-sm text-charcoal/70">{sentence.reason}</p>
              </article>
            ))
          ) : (
            <p className="text-sm text-charcoal/70">
              No individual sentence strongly stood out. The overall score reflects combined document-level patterns.
            </p>
          )}
        </div>
      </section>

      {/* Writing tips */}
      <section className="rounded-[2rem] border border-navy/10 bg-white p-6 shadow-soft">
        <h4 className="text-lg font-semibold text-navy">Writing tips</h4>
        <div className="mt-4 space-y-3">
          {results.basic_tips.map((tip) => (
            <p key={tip} className="rounded-soft bg-mist px-4 py-3 text-sm leading-6 text-charcoal">
              {tip}
            </p>
          ))}
        </div>
      </section>

      {/* Pro CTA — wired to waitlist */}
      <section className="rounded-[2rem] border border-navy/10 bg-navy p-6 text-white shadow-soft">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/55">
          Pro — coming soon
        </p>
        <h4 className="mt-3 text-2xl font-semibold">{results.pro_prompt.title}</h4>
        <p className="mt-3 max-w-md text-sm leading-7 text-white/75">
          {results.pro_prompt.message}
        </p>
        <a
          href="#waitlist"
          className="mt-5 inline-block rounded-2xl bg-accent px-5 py-3 text-sm font-semibold text-navy transition hover:bg-accent/90"
        >
          {results.pro_prompt.cta_label}
        </a>
      </section>
    </aside>
  );
}

type StatCardProps = {
  label: string;
  value: string;
  hint?: string;
};

function StatCard({ label, value, hint }: StatCardProps) {
  return (
    <div className="rounded-soft border border-navy/8 bg-mist px-4 py-3">
      <p className="text-xs font-medium text-charcoal/50">{label}</p>
      <p className="mt-1 text-xl font-semibold text-navy">{value}</p>
      {hint ? <p className="mt-1 text-xs text-charcoal/45">{hint}</p> : null}
    </div>
  );
}

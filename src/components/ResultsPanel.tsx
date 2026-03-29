import type { AnalyzeResponse, CriterionResult, RubricMatchResult } from "../types";

type ResultsPanelProps = {
  results: AnalyzeResponse | null;
  loading?: boolean;
  isPro?: boolean;
};

function confidenceTone(confidence: AnalyzeResponse["confidence"]) {
  if (confidence === "High") return "bg-danger/10 text-danger border border-danger/20";
  if (confidence === "Medium") return "bg-warning/10 text-warning border border-warning/20";
  return "bg-success/10 text-success border border-success/20";
}

/** Score card gradient background based on AI score */
function scoreGradient(score: number) {
  if (score >= 70) return "from-red-100 to-red-50";
  if (score >= 40) return "from-yellow-100 to-yellow-50";
  return "from-green-100 to-green-50";
}

function scoreColor(score: number) {
  if (score >= 70) return "#EF4444";
  if (score >= 40) return "#F59E0B";
  return "#10B981";
}

function scoreLabel(score: number) {
  if (score >= 70) return "High AI pattern match";
  if (score >= 40) return "Mixed signals";
  return "Looks human";
}

/** Conic-gradient circular score ring */
function ScoreRing({ score }: { score: number }) {
  const color = scoreColor(score);
  // Angle in degrees that the ring fills to
  const deg = Math.round((score / 100) * 360);
  // Conic goes: score-color from 0 → deg, then gray
  const conicBg = `conic-gradient(${color} 0deg, ${color} ${deg}deg, #E2E8F0 ${deg}deg, #E2E8F0 360deg)`;

  return (
    <div
      className="relative flex h-[140px] w-[140px] shrink-0 items-center justify-center rounded-full"
      style={{ background: conicBg, padding: 8 }}
    >
      {/* Inner white circle */}
      <div className="absolute inset-[8px] rounded-full bg-white" />
      {/* Score number on top */}
      <div className="relative z-10 flex flex-col items-center">
        <span className="font-stat text-[2.6rem] font-bold leading-none" style={{ color }}>
          {score}
        </span>
        <span className="font-stat text-[11px] text-charcoal/45">/ 100</span>
      </div>
    </div>
  );
}

/** Signal strength bar shown per flagged sentence. */
function SignalBar({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const barColor = pct >= 75 ? "#EF4444" : pct >= 55 ? "#F59E0B" : "#10B981";
  return (
    <div className="mt-2 flex items-center gap-3">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-border-base">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: barColor }}
        />
      </div>
      <span className="shrink-0 text-xs font-medium text-charcoal/70">{pct}%</span>
    </div>
  );
}

/** Rubric alignment panel shown when rubric_result is present. */
function CoveragePill({ coverage }: { coverage: CriterionResult["coverage"] }) {
  const styles =
    coverage === "strong"
      ? "bg-success/10 text-success border-success/20"
      : coverage === "partial"
        ? "bg-warning/10 text-warning border-warning/20"
        : "bg-danger/10 text-danger border-danger/20";
  const label = coverage === "strong" ? "Covered" : coverage === "partial" ? "Partial" : "Missing";
  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${styles}`}>{label}</span>
  );
}

function RubricPanel({ rubric }: { rubric: RubricMatchResult }) {
  const color =
    rubric.overall_score >= 70 ? "text-success" : rubric.overall_score >= 40 ? "text-warning" : "text-danger";

  return (
    <section className="rounded-modal border border-border-base bg-white p-6 shadow-soft">
      <div className="flex items-center justify-between">
        <h4 className="font-heading text-base font-semibold text-navy">Rubric alignment</h4>
        <span className={`font-stat text-2xl font-bold ${color}`}>{rubric.overall_score}%</span>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-charcoal/65">{rubric.summary}</p>
      <div className="mt-3 flex gap-4 text-xs">
        <span className="font-semibold text-success">{rubric.strong_count} covered</span>
        <span className="font-semibold text-warning">{rubric.partial_count} partial</span>
        <span className="font-semibold text-danger">{rubric.missing_count} missing</span>
      </div>
      <div className="mt-5 space-y-3">
        {rubric.criteria.map((criterion, i) => (
          <div key={i} className="rounded-input border border-border-base bg-mist px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm text-charcoal">{criterion.criterion}</p>
              <CoveragePill coverage={criterion.coverage} />
            </div>
            {criterion.matched_terms.length > 0 && (
              <p className="mt-1.5 text-xs text-charcoal/50">
                Matched: {criterion.matched_terms.slice(0, 6).join(", ")}
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

/** Skeleton card shown while analysis is loading. */
function SkeletonPanel() {
  return (
    <aside className="space-y-5">
      <div className="rounded-modal border border-border-base bg-white p-6 shadow-soft sm:p-8">
        <div className="flex items-center gap-6">
          <div className="skeleton h-[140px] w-[140px] rounded-full" />
          <div className="flex-1 space-y-3">
            <div className="skeleton h-3 w-24 rounded-full" />
            <div className="skeleton h-6 w-40 rounded-full" />
            <div className="skeleton h-3 w-32 rounded-full" />
          </div>
        </div>
        <div className="skeleton mt-6 h-14 rounded-input" />
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton h-16 rounded-input" />
          ))}
        </div>
      </div>
      <div className="skeleton h-24 rounded-modal" />
      <div className="skeleton h-48 rounded-modal" />
    </aside>
  );
}

export function ResultsPanel({ results, loading = false, isPro = false }: ResultsPanelProps) {
  if (loading) return <SkeletonPanel />;

  if (!results) {
    return (
      <aside className="rounded-modal border border-dashed border-border-base bg-white p-8 shadow-soft">
        <div className="flex h-14 w-14 items-center justify-center rounded-input bg-mist">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-charcoal/40">
            <path d="M9 12h6M9 16h6M9 8h6M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" strokeLinecap="round" />
          </svg>
        </div>
        <h3 className="mt-5 text-xl font-bold tracking-tight text-navy">
          Paste something to get started
        </h3>
        <p className="mt-3 max-w-md text-sm leading-7 text-charcoal/65">
          Your score, flagged sentences, and writing tips will appear here.
        </p>
        <ul className="mt-5 space-y-2 text-sm text-charcoal/55">
          {["Rubric alignment score", "Flagged sentences with signal strength", "Actionable writing tips"].map(item => (
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
      {/* Score card */}
      <section className={`rounded-modal bg-gradient-to-br p-6 shadow-card sm:p-8 ${scoreGradient(results.score)}`}>
        <div className="flex flex-wrap items-center gap-6">
          <ScoreRing score={results.score} />
          <div className="flex-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-charcoal/55">
              AI-pattern score
            </p>
            <p className="font-heading mt-1 text-xl font-bold text-navy">
              {scoreLabel(results.score)}
            </p>
            <div className={`mt-3 inline-block rounded-full px-3 py-1 text-xs font-semibold ${confidenceTone(results.confidence)}`}>
              Confidence: {results.confidence}
            </div>
          </div>
        </div>
        <p className="mt-5 rounded-input border border-white/60 bg-white/60 px-4 py-3 text-sm leading-7 text-charcoal">
          {results.summary}
        </p>
        {/* Stats grid */}
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
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

      {/* Pattern signals */}
      {results.red_flags.length > 0 && (
        <section className="rounded-modal border border-border-base bg-white p-6 shadow-soft">
          <h4 className="font-heading text-base font-semibold text-navy">Pattern signals</h4>
          <div className="mt-4 flex flex-wrap gap-2">
            {results.red_flags.map((flag) => (
              <span key={flag} className="rounded-full border border-warning/30 bg-warning/10 px-3 py-1.5 text-xs font-medium text-charcoal">
                {flag}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Flagged sentences */}
      <section className="rounded-modal border border-border-base bg-white p-6 shadow-soft">
        <h4 className="font-heading text-base font-semibold text-navy">Flagged sentences</h4>
        <div className="mt-4 space-y-4">
          {results.flagged_sentences.length ? (
            results.flagged_sentences.map((sentence) => (
              <article
                key={`${sentence.index}-${sentence.text}`}
                className="flagged-pulse rounded-[0_8px_8px_0] border-l-[3px] px-4 py-3"
                style={{
                  borderLeftColor: "#EF4444",
                  background: "linear-gradient(90deg, rgba(239,68,68,0.08) 0%, rgba(239,68,68,0.04) 100%)",
                }}
              >
                <p className="text-xs font-semibold uppercase tracking-wider text-danger">Sentence {sentence.index + 1}</p>
                <SignalBar score={sentence.score} />
                <p className="mt-3 text-sm leading-7 text-charcoal">{sentence.text}</p>
                <p className="mt-1.5 text-xs text-charcoal/55">{sentence.reason}</p>
              </article>
            ))
          ) : (
            <p className="text-sm text-charcoal/65">
              No individual sentences strongly flagged. Score reflects combined document-level patterns.
            </p>
          )}
        </div>
      </section>

      {/* Writing tips */}
      <section className="rounded-modal border border-border-base bg-white p-6 shadow-soft">
        <h4 className="font-heading text-base font-semibold text-navy">Writing tips</h4>
        <div className="mt-4 space-y-3">
          {results.basic_tips.map((tip) => (
            <p key={tip} className="rounded-input bg-mist px-4 py-3 text-sm leading-6 text-charcoal">
              {tip}
            </p>
          ))}
        </div>
      </section>

      {/* Rubric alignment */}
      {results.rubric_result && <RubricPanel rubric={results.rubric_result} />}

      {/* Pro CTA — only shown to free users */}
      {!isPro && (
        <section className="rounded-modal border border-border-base bg-canvas p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-charcoal/45">Pro</p>
          <h4 className="font-heading mt-2 text-base font-semibold text-navy">{results.pro_prompt.title}</h4>
          <p className="mt-2 text-sm leading-6 text-charcoal/65">{results.pro_prompt.message}</p>
          <a
            href="#upgrade"
            className="btn-shine mt-4 inline-block rounded-soft bg-gradient-to-br from-accent to-accent-dark px-5 py-2.5 text-sm font-bold text-navy transition hover:shadow-glow hover:scale-[1.02]"
          >
            {results.pro_prompt.cta_label}
          </a>
        </section>
      )}
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
    <div className="rounded-input border border-white/60 bg-white/60 px-4 py-3">
      <p className="text-xs font-medium text-charcoal/55">{label}</p>
      <p className="font-stat mt-1 text-lg font-bold text-navy">{value}</p>
      {hint ? <p className="mt-1 text-xs text-charcoal/45">{hint}</p> : null}
    </div>
  );
}

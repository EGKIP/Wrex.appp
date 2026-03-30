import { useState } from "react";
import type { AnalyzeResponse, CriterionResult, RubricMatchResult } from "../types";
import { proHumanize } from "../lib/api";

type ResultsPanelProps = {
  results: AnalyzeResponse | null;
  loading?: boolean;
  isPro?: boolean;
  onRubricRewrite?: () => void;
  onUpgrade?: () => void;
  text?: string;
  accessToken?: string | null;
};

// ── Sentence splitter (mirrors backend preprocessor.py logic) ─────────────────

const ABBREVIATIONS = new Set([
  "mr","mrs","ms","dr","prof","sr","jr","vs","etc","approx","dept","est",
  "fig","govt","inc","ltd","max","min","no","orig","pp","pub","qty","ref",
  "rev","st","vol","e.g","i.e","u.s","u.s.a","u.k","jan","feb","mar",
  "apr","jun","jul","aug","sep","oct","nov","dec",
]);

function splitSentences(text: string): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  const splitRe = /([.!?])\s+/g;
  const parts: string[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = splitRe.exec(clean)) !== null) {
    const end = match.index + 1; // position just after the punctuation
    const candidate = clean.slice(last, end).trim();
    const beforePunct = clean.slice(last, match.index);
    const precedingMatch = beforePunct.match(/(\S+)$/);
    const token = precedingMatch ? precedingMatch[1].replace(/[.!?]+$/, "").toLowerCase() : "";
    const isAbbrev = ABBREVIATIONS.has(token);
    const isInitial = token.length === 1 && /[a-z]/i.test(token);
    const isDecimal = /[0-9]\.$/.test(clean.slice(last, match.index + 1));
    if (isAbbrev || isInitial || isDecimal) continue;
    if (candidate) parts.push(candidate);
    last = match.index + match[0].length;
  }
  const tail = clean.slice(last).trim();
  if (tail) parts.push(tail);
  return parts.length ? parts : [clean];
}

// ── Sentence highlight section ────────────────────────────────────────────────

type FlaggedMap = Map<number, { score: number; reason: string }>;

type RewriteState = {
  idx: number;
  rewritten: string;
  summary: string;
} | null;

function SentenceHighlighter({
  text,
  flagged,
  isPro,
  accessToken,
  onUpgrade,
}: {
  text: string;
  flagged: FlaggedMap;
  isPro?: boolean;
  accessToken?: string | null;
  onUpgrade?: () => void;
}) {
  const sentences = splitSentences(text);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [rewriting, setRewriting] = useState(false);
  const [rewrite, setRewrite] = useState<RewriteState>(null);
  const [copied, setCopied] = useState(false);
  const [rewriteError, setRewriteError] = useState("");

  async function handleSentenceClick(sentence: string, idx: number) {
    // Toggle off if already open
    if (activeIdx === idx) {
      setActiveIdx(null);
      setRewrite(null);
      setRewriteError("");
      return;
    }
    setActiveIdx(idx);
    setRewrite(null);
    setRewriteError("");

    if (!isPro || !accessToken) return; // free users: just open the nudge card

    setRewriting(true);
    try {
      const res = await proHumanize(sentence, accessToken);
      setRewrite({ idx, rewritten: res.rewritten, summary: res.changes_summary });
    } catch {
      setRewriteError("Couldn't generate a rewrite right now. Try again.");
    } finally {
      setRewriting(false);
    }
  }

  function handleCopy(txt: string) {
    navigator.clipboard.writeText(txt).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <section className="rounded-modal border border-border-base bg-white p-6 shadow-soft">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-heading text-base font-semibold text-navy">Writing analysis</h4>
        <div className="flex items-center gap-3 text-xs text-charcoal/50">
          <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-400" />Needs polish</span>
          <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-400" />Sounds natural</span>
        </div>
      </div>

      <div className="space-y-1 text-sm text-charcoal leading-8">
        {sentences.map((sentence, i) => {
          const flag = flagged.get(i);
          const isActive = activeIdx === i;

          if (!flag) {
            return (
              <span
                key={i}
                className="rounded px-0.5 transition-colors"
                style={{ borderBottom: "2px solid #6ee7b7" }}
              >
                {sentence}{" "}
              </span>
            );
          }

          return (
            <span key={i} className="inline">
              <button
                type="button"
                onClick={() => handleSentenceClick(sentence, i)}
                title={isPro ? "Click to rewrite this sentence" : "Upgrade to Pro to rewrite"}
                className={`rounded px-0.5 text-left transition-colors hover:bg-amber-100 cursor-pointer ${isActive ? "bg-amber-100" : ""}`}
                style={{ background: isActive ? "rgba(245,158,11,0.15)" : "rgba(245,158,11,0.08)", borderBottom: "2px solid #f59e0b" }}
              >
                {sentence}
              </button>
              {" "}
              {isActive && (
                <span className="block mt-2 mb-3">
                  {!isPro ? (
                    /* Free user nudge */
                    <span className="flex items-start gap-3 rounded-input border border-accent/30 bg-accent/5 px-4 py-3">
                      <span className="text-base">✨</span>
                      <span className="flex-1">
                        <span className="block text-xs font-semibold text-navy">Pro feature</span>
                        <span className="block text-xs text-charcoal/65 mt-0.5">Click to rewrite this sentence with AI — available on Wrex Pro.</span>
                        <button
                          type="button"
                          onClick={onUpgrade}
                          className="mt-2 rounded-soft bg-gradient-to-br from-accent to-accent-dark px-3 py-1 text-xs font-bold text-navy transition hover:opacity-90"
                        >
                          Upgrade to Pro
                        </button>
                      </span>
                      <button type="button" onClick={() => setActiveIdx(null)} className="text-charcoal/30 hover:text-charcoal/60 text-base leading-none">×</button>
                    </span>
                  ) : rewriting ? (
                    /* Loading */
                    <span className="flex items-center gap-2 rounded-input bg-mist px-4 py-3 text-xs text-charcoal/60">
                      <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                      Rewriting…
                    </span>
                  ) : rewriteError ? (
                    /* Error */
                    <span className="flex items-center justify-between rounded-input border border-danger/20 bg-danger/5 px-4 py-3 text-xs text-danger">
                      {rewriteError}
                      <button type="button" onClick={() => { setActiveIdx(null); setRewriteError(""); }} className="ml-3 text-charcoal/40 hover:text-charcoal/70">×</button>
                    </span>
                  ) : rewrite?.idx === i ? (
                    /* Rewrite result */
                    <span className="block rounded-input border border-emerald-200 bg-emerald-50 px-4 py-3">
                      <span className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-emerald-700">✦ Suggested rewrite</span>
                        <button type="button" onClick={() => { setActiveIdx(null); setRewrite(null); }} className="text-charcoal/30 hover:text-charcoal/60 text-base leading-none">×</button>
                      </span>
                      <span className="block text-sm leading-7 text-charcoal">{rewrite.rewritten}</span>
                      {rewrite.summary && (
                        <span className="block mt-2 text-xs text-charcoal/50 italic">{rewrite.summary}</span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleCopy(rewrite.rewritten)}
                        className="mt-3 rounded-soft border border-emerald-300 bg-white px-3 py-1 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                      >
                        {copied ? "Copied!" : "Copy rewrite"}
                      </button>
                    </span>
                  ) : null}
                </span>
              )}
            </span>
          );
        })}
      </div>

      <p className="mt-4 text-xs text-charcoal/40">
        {isPro ? "Click any amber sentence to get an AI rewrite." : "Click any amber sentence to see rewrite options."}
      </p>
    </section>
  );
}

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
  if (score >= 70) return "Needs significant polish";
  if (score >= 40) return "A few areas to strengthen";
  return "Writing sounds natural";
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

function RubricPanel({ rubric, onRubricRewrite }: { rubric: RubricMatchResult; onRubricRewrite?: () => void }) {
  const color =
    rubric.overall_score >= 70 ? "text-success" : rubric.overall_score >= 40 ? "text-warning" : "text-danger";

  return (
    <section className="rounded-modal border border-border-base bg-white p-6 shadow-soft">
      <div className="flex items-center justify-between">
        <h4 className="font-heading text-base font-semibold text-navy">Rubric alignment</h4>
        <span className={`font-stat text-2xl font-bold ${color}`}>{rubric.overall_score}%</span>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-charcoal/65">{rubric.summary}</p>
      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs">
        <span className="font-semibold text-success">{rubric.strong_count} covered</span>
        <span className="font-semibold text-warning">{rubric.partial_count} partial</span>
        <span className="font-semibold text-danger">{rubric.missing_count} missing</span>
        {rubric.missing_count > 0 && onRubricRewrite && (
          <button
            type="button"
            onClick={onRubricRewrite}
            className="ml-auto rounded-soft bg-navy px-3 py-1 text-[11px] font-bold text-white transition hover:bg-navy/80"
          >
            ✨ Rewrite to fix missing
          </button>
        )}
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

export function ResultsPanel({ results, loading = false, isPro = false, onRubricRewrite, onUpgrade, text, accessToken }: ResultsPanelProps) {
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
          Your rubric score, writing tips, and sentence-level feedback will appear here.
        </p>
        <ul className="mt-5 space-y-2 text-sm text-charcoal/55">
          {["Rubric alignment score", "Actionable writing tips", "Sentence-level writing feedback"].map(item => (
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
      {/* Score card — naturalness overview */}
      <section className={`rounded-modal bg-gradient-to-br p-6 shadow-card sm:p-8 ${scoreGradient(results.score)}`}>
        <div className="flex flex-wrap items-center gap-6">
          <ScoreRing score={results.score} />
          <div className="flex-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-charcoal/55">
              Writing naturalness
            </p>
            <p className="font-heading mt-1 text-xl font-bold text-navy">
              {scoreLabel(results.score)}
            </p>
            <div className={`mt-3 inline-block rounded-full px-3 py-1 text-xs font-semibold ${confidenceTone(results.confidence)}`}>
              Signal confidence: {results.confidence}
            </div>
          </div>
        </div>
        <p className="mt-5 rounded-input border border-white/60 bg-white/60 px-4 py-3 text-sm leading-7 text-charcoal">
          {results.summary}
        </p>
      </section>

      {/* Rubric alignment — PRIMARY section */}
      {results.rubric_result && <RubricPanel rubric={results.rubric_result} onRubricRewrite={onRubricRewrite} />}

      {/* Writing tips — actionable first */}
      {results.basic_tips.length > 0 && (
        <section className="rounded-modal border border-border-base bg-white p-6 shadow-soft">
          <h4 className="font-heading text-base font-semibold text-navy">Writing tips</h4>
          <div className="mt-4 space-y-3">
            {results.basic_tips.map((tip) => (
              <p key={tip} className="flex gap-3 rounded-input bg-mist px-4 py-3 text-sm leading-6 text-charcoal">
                <span className="shrink-0 text-accent">✦</span>
                {tip}
              </p>
            ))}
          </div>
        </section>
      )}

      {/* Sentence-level writing analysis — inline highlights */}
      {text && results.flagged_sentences.length > 0 && (() => {
        const flaggedMap: FlaggedMap = new Map(
          results.flagged_sentences.map((s) => [s.index, { score: s.score, reason: s.reason }])
        );
        return <SentenceHighlighter text={text} flagged={flaggedMap} isPro={isPro} accessToken={accessToken} onUpgrade={onUpgrade} />;
      })()}

      {/* Sentences to strengthen — detail view */}
      {results.flagged_sentences.length > 0 && (
        <section className="rounded-modal border border-border-base bg-white p-6 shadow-soft">
          <h4 className="font-heading text-base font-semibold text-navy">Sentences to strengthen</h4>
          <p className="mt-1 text-xs text-charcoal/50">These sentences have patterns that are worth revising for a more natural voice.</p>
          <div className="mt-4 space-y-4">
            {results.flagged_sentences.map((sentence) => (
              <article
                key={`${sentence.index}-${sentence.text}`}
                className="rounded-[0_8px_8px_0] border-l-[3px] border-l-amber-400 bg-amber-50/60 px-4 py-3"
              >
                <p className="text-xs font-semibold uppercase tracking-wider text-amber-600">Sentence {sentence.index + 1}</p>
                <SignalBar score={sentence.score} />
                <p className="mt-3 text-sm leading-7 text-charcoal">{sentence.text}</p>
                <p className="mt-1.5 text-xs text-charcoal/55">{sentence.reason}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Writing patterns — secondary, collapsed-feeling */}
      {results.red_flags.length > 0 && (
        <section className="rounded-modal border border-border-base bg-white p-6 shadow-soft">
          <h4 className="font-heading text-base font-semibold text-navy">Writing patterns detected</h4>
          <p className="mt-1 text-xs text-charcoal/50">These style patterns were found in your text. They're clues, not verdicts.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {results.red_flags.map((flag) => (
              <span key={flag} className="rounded-full border border-border-base bg-mist px-3 py-1.5 text-xs font-medium text-charcoal/70">
                {flag}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Pro CTA — only shown to free users */}
      {!isPro && (
        <section className="rounded-modal border border-accent/20 bg-gradient-to-br from-accent/5 to-accent/10 p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-charcoal/45">Wrex Pro</p>
          <h4 className="font-heading mt-2 text-base font-semibold text-navy">{results.pro_prompt.title}</h4>
          <p className="mt-2 text-sm leading-6 text-charcoal/65">{results.pro_prompt.message}</p>
          <button
            type="button"
            onClick={onUpgrade}
            className="btn-shine mt-4 inline-block rounded-soft bg-gradient-to-br from-accent to-accent-dark px-5 py-2.5 text-sm font-bold text-navy transition hover:shadow-glow hover:scale-[1.02]"
          >
            {results.pro_prompt.cta_label}
          </button>
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

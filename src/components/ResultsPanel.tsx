import { useState } from "react";
import {
  AlertTriangle,
  BarChart2,
  CheckCircle2,
  ScanSearch,
  Sparkles,
  Wand2,
} from "lucide-react";
import type { AnalyzeResponse, CriterionResult, QuotaInfo } from "../types";
import { proHumanize } from "../lib/api";

type ResultsPanelProps = {
  results: AnalyzeResponse | null;
  loading?: boolean;
  isPro?: boolean;
  onRubricRewrite?: () => void;
  text?: string;
  accessToken?: string | null;
  /** Called when the user clicks "Replace in editor" inside a Pro rewrite card */
  onReplaceSentence?: (original: string, replacement: string) => void;
  /** Quota returned by the last analysis — used to show anon signup nudge */
  quota?: QuotaInfo | null;
  /** Open the auth modal — called from the inline anon nudge */
  onAuthRequired?: () => void;
  /** True when the editor text was changed after last analysis (accepted rewrite etc.) */
  resultsStale?: boolean;
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

type FreeGuidance = {
  causes: string[];
  actions: string[];
};

type FlaggedMap = Map<number, {
  score: number;
  reason: string;
  risk_level: "high" | "medium";
  free_guidance?: FreeGuidance | null;
}>;

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
  onReplaceSentence,
}: {
  text: string;
  flagged: FlaggedMap;
  isPro?: boolean;
  accessToken?: string | null;
  onReplaceSentence?: (original: string, replacement: string) => void;
}) {
  const sentences = splitSentences(text);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [rewriting, setRewriting] = useState(false);
  const [rewrite, setRewrite] = useState<RewriteState>(null);
  const [copied, setCopied] = useState(false);
  const [rewriteError, setRewriteError] = useState("");

  async function handleSentenceClick(sentence: string, idx: number) {
    if (activeIdx === idx) {
      setActiveIdx(null);
      setRewrite(null);
      setRewriteError("");
      return;
    }
    setActiveIdx(idx);
    setRewrite(null);
    setRewriteError("");

    // Free users: panel opens showing the reason — no API call needed
    if (!isPro || !accessToken) return;

    // Pro users: auto-fetch a rewrite
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
    <section className="surface-panel rounded-[1.5rem] p-5 sm:p-6">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="font-heading text-base font-semibold text-navy">Sentence analysis</h4>
      </div>

      {/* Legend + hint */}
      <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-input border border-border-base bg-mist/70 px-3 py-2">
        <span className="flex items-center gap-1.5 text-xs text-charcoal/60">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500" />
          <span className="font-semibold text-red-700">Sounds AI-written</span>
          {" — click to see why"}
        </span>
        <span className="flex items-center gap-1.5 text-xs text-charcoal/60">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-400" />
          <span className="font-semibold text-amber-700">Needs your touch</span>
          {" — click to see why"}
        </span>
        <span className="flex items-center gap-1.5 text-xs text-charcoal/60">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-400" />
          <span className="font-semibold text-emerald-700">Authentic</span> — sounds like you
        </span>
      </div>

      {/* All-clear state */}
      {flagged.size === 0 && (
        <div className="flex items-center gap-2.5 rounded-input border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span><strong>All sentences sound authentic.</strong> Your writing reads naturally — no AI patterns detected.</span>
        </div>
      )}

      <div className="space-y-1 text-sm text-charcoal leading-8">
        {sentences.map((sentence, i) => {
          const flag = flagged.get(i);
          const isActive = activeIdx === i;

          if (!flag) {
            return (
              <span
                key={i}
                className="rounded px-0.5"
              >
                {sentence}{" "}
              </span>
            );
          }

          // Three-tier colour system
          const isHigh = flag.risk_level === "high";
          const bgColor = isActive
            ? isHigh ? "rgba(239,68,68,0.20)" : "rgba(245,158,11,0.20)"
            : isHigh ? "rgba(239,68,68,0.12)" : "rgba(245,158,11,0.12)";
          const borderColor = isHigh ? "#ef4444" : "#f59e0b";
          const ringClass = isHigh
            ? isActive ? "ring-2 ring-red-400/60" : "hover:ring-1 hover:ring-red-300"
            : isActive ? "ring-2 ring-amber-400/60" : "hover:ring-1 hover:ring-amber-300";
          const chipClass = isHigh
            ? "border-red-300/70 bg-red-100 text-red-800"
            : "border-amber-300/70 bg-amber-100 text-amber-800";
          const dotClass = isHigh ? "bg-red-500" : "bg-amber-500";

          return (
            <span key={i} className="inline">
              <button
                type="button"
                onClick={() => handleSentenceClick(sentence, i)}
                title="Click to see why this was flagged"
                className={`rounded-sm px-1 py-0.5 text-left cursor-pointer transition-all duration-150 ${ringClass}`}
                style={{
                  background: bgColor,
                  borderBottom: `2.5px solid ${borderColor}`,
                }}
              >
                {sentence}
              </button>
              {" "}
              {isActive && (
                <span className="block mt-2 mb-3">
                  {/* Reason chip */}
                  {flag.reason && (
                    <span className={`mb-2 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${chipClass}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${dotClass}`} />
                      {flag.reason}
                    </span>
                  )}
                  {!isPro ? (
                    <span className="mt-2 block rounded-input border border-border-base bg-mist px-3 py-2 text-xs leading-5 text-charcoal/60">
                      {flag.free_guidance ? (
                        <span className="grid gap-2">
                          {flag.free_guidance.causes.length > 0 && (
                            <span className="block">
                              <span className="font-semibold text-navy">Why it was flagged: </span>
                              {flag.free_guidance.causes.join(" ")}
                            </span>
                          )}
                          {flag.free_guidance.actions.length > 0 && (
                            <span className="block">
                              <span className="font-semibold text-navy">Manual next step: </span>
                              {flag.free_guidance.actions.join(" ")}
                            </span>
                          )}
                        </span>
                      ) : (
                        "Try adding a specific example, class detail, or sentence rhythm that sounds more like you."
                      )}
                    </span>
                  ) : rewriting ? (
                    <span className="flex items-center gap-2 rounded-input bg-mist px-4 py-3 text-xs text-charcoal/60">
                      <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                      Rewriting sentence…
                    </span>
                  ) : rewriteError ? (
                    <span className="flex items-center justify-between rounded-input border border-danger/20 bg-danger/5 px-4 py-3 text-xs text-danger">
                      {rewriteError}
                      <button type="button" onClick={() => { setActiveIdx(null); setRewriteError(""); }} className="ml-3 text-charcoal/40 hover:text-charcoal/70">×</button>
                    </span>
                  ) : rewrite?.idx === i ? (
                    /* Rewrite result */
                    <span className="block rounded-input border border-emerald-300 bg-emerald-50 px-4 py-3">
                      <span className="flex items-center justify-between mb-2">
                        <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700"><Wand2 className="h-3 w-3" />AI suggestion</span>
                        <button type="button" onClick={() => { setActiveIdx(null); setRewrite(null); }} className="text-charcoal/30 hover:text-charcoal/60 text-base leading-none">×</button>
                      </span>
                      <span className="block text-sm leading-7 text-charcoal">{rewrite.rewritten}</span>
                      {rewrite.summary && (
                        <span className="block mt-1.5 text-xs text-charcoal/50 italic">{rewrite.summary}</span>
                      )}
                      <span className="mt-3 flex flex-wrap gap-2">
                        {onReplaceSentence && (
                          <button
                            type="button"
                            onClick={() => {
                              onReplaceSentence(sentence, rewrite.rewritten);
                              setActiveIdx(null);
                              setRewrite(null);
                            }}
                            className="btn-shine inline-flex items-center gap-1.5 rounded-soft bg-gradient-to-br from-emerald-500 to-emerald-600 px-4 py-1.5 text-xs font-bold text-white shadow-sm transition hover:opacity-90"
                          >
                            <CheckCircle2 className="h-3 w-3" /> Accept
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleCopy(rewrite.rewritten)}
                          className="rounded-soft border border-emerald-300 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                        >
                          {copied ? "Copied!" : "Copy"}
                        </button>
                      </span>
                    </span>
                  ) : null}
                </span>
              )}
            </span>
          );
        })}
      </div>

      <p className="mt-4 text-xs text-charcoal/40">
        Click any highlighted sentence to see why it was flagged.{isPro ? " Pro rewrites load automatically." : ""}
      </p>
    </section>
  );
}

function confidenceTone(confidence: AnalyzeResponse["confidence"]) {
  if (confidence === "High") return "bg-danger/10 text-danger border border-danger/20";
  if (confidence === "Medium") return "bg-warning/10 text-warning border border-warning/20";
  return "bg-success/10 text-success border border-success/20";
}

function scoreColor(score: number) {
  if (score >= 70) return "#EF4444";
  if (score >= 40) return "#F59E0B";
  return "#10B981";
}

function scoreLabel(score: number) {
  if (score >= 70) return "Strong rewrite pass recommended";
  if (score >= 40) return "Add more specific voice and detail";
  return "Reads naturally";
}

function aiLikelihoodLabel(score: number) {
  if (score >= 70) return "High voice-signal risk";
  if (score >= 40) return "Moderate voice-signal risk";
  return "Low voice-signal risk";
}

/** Compact dual-score header: AI Risk + optional Rubric Match side-by-side */
function DualScoreCard({ results }: { results: AnalyzeResponse }) {
  const ai = results.score;
  const rubric = results.rubric_result ?? null;
  const aiColor = scoreColor(ai);
  const rubricColor = rubric
    ? rubric.overall_score >= 70 ? "#10B981" : rubric.overall_score >= 40 ? "#F59E0B" : "#EF4444"
    : null;

  return (
    <section className="surface-panel overflow-hidden rounded-[1.5rem] p-0">
      <div className="border-b border-border-base bg-white/70 px-5 py-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-charcoal/40">Analysis snapshot</p>
      </div>
      <div className={`grid gap-0 ${rubric ? "sm:grid-cols-2" : "grid-cols-1"}`}>
        {/* AI Likelihood Score */}
        <div className="p-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-charcoal/45">Voice signal</p>
          <div className="mt-2 flex items-end gap-1 leading-none">
            <p className="font-stat text-[3.1rem] font-bold" style={{ color: aiColor }}>{ai}</p>
            <p className="mb-2 text-lg font-bold" style={{ color: aiColor }}>%</p>
          </div>
          <p className="mt-2 text-sm font-semibold text-navy">{aiLikelihoodLabel(ai)}</p>
          <p className="mt-1 text-xs leading-5 text-charcoal/55">{scoreLabel(ai)}</p>
          <span className={`mt-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${confidenceTone(results.confidence)}`}>
            {results.confidence} confidence
          </span>
        </div>
        {/* Rubric Match — only when a rubric was analyzed */}
        {rubric && (
          <div className="border-t border-border-base p-5 sm:border-l sm:border-t-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-charcoal/45">Rubric match</p>
            <p className="font-stat mt-2 text-[2.8rem] font-bold leading-none" style={{ color: rubricColor! }}>{rubric.overall_score}%</p>
            <p className="mt-2 text-sm font-semibold text-navy">
              {rubric.overall_score >= 70 ? "Strong match" : rubric.overall_score >= 40 ? "Partial match" : "Needs work"}
            </p>
            <div className="mt-2 flex gap-3 text-[10px] font-semibold">
              <span className="text-success">{rubric.strong_count} covered</span>
              <span className="text-danger">{rubric.missing_count} missing</span>
            </div>
          </div>
        )}
      </div>
      {/* One-line summary */}
      <p className="border-t border-border-base bg-mist/45 px-5 py-4 text-sm leading-6 text-charcoal/70">
        {results.summary}
      </p>
    </section>
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

/** Skeleton card shown while analysis is loading. */
function SkeletonPanel() {
  return (
    <aside className="space-y-4">
      {/* Dual score header skeleton */}
      <div className="rounded-modal p-4 shadow-card bg-mist animate-pulse">
        <div className="grid grid-cols-2 gap-4">
          {[0, 1].map((i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <div className="skeleton h-3 w-14 rounded-full" />
              <div className="skeleton h-10 w-10 rounded-full" />
              <div className="skeleton h-3 w-16 rounded-full" />
            </div>
          ))}
        </div>
        <div className="skeleton mt-4 h-10 rounded-input" />
      </div>
      {/* Sentence highlights skeleton */}
      <div className="skeleton h-24 rounded-modal" />
      {/* Tips skeleton */}
      <div className="rounded-modal border border-border-base bg-white p-4 shadow-soft space-y-2">
        <div className="skeleton h-3 w-24 rounded-full" />
        {[0, 1, 2].map((i) => <div key={i} className="skeleton h-8 rounded-input" />)}
      </div>
    </aside>
  );
}

export function ResultsPanel({ results, loading = false, isPro = false, onRubricRewrite, text, accessToken, onReplaceSentence, quota, onAuthRequired, resultsStale = false }: ResultsPanelProps) {
  if (loading) return <SkeletonPanel />;

  if (!results) {
    const features = [
      {
        icon: <BarChart2 className="h-5 w-5 text-accent" />,
        label: "Score",
        desc: "A quick read on how much the draft needs your voice",
      },
      {
        icon: <ScanSearch className="h-5 w-5 text-amber-500" />,
        label: "Sentence highlights",
        desc: "Click a highlighted sentence to see what felt generic",
      },
      {
        icon: <Sparkles className="h-5 w-5 text-emerald-600" />,
        label: "Writing tips",
        desc: "Simple next steps you can use while revising",
      },
    ];

    return (
      <aside className="surface-panel flex flex-col rounded-[1.5rem] p-6 sm:p-8">
        {/* Icon + headline */}
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent/10">
            <ScanSearch className="h-6 w-6 text-accent" />
          </div>
          <div>
            <h3 className="text-lg font-bold tracking-tight text-navy">
              Your analysis will appear here
            </h3>
            <p className="mt-1 text-sm text-charcoal/55">
              Paste your writing on the left, then click <span className="font-semibold text-navy">Analyze my text</span>.
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="my-5 border-t border-border-base" />

        {/* Feature preview grid */}
        <div className="grid gap-3 sm:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.label}
              className="relative flex flex-col gap-1.5 rounded-soft border border-border-base bg-mist/55 p-3.5"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm">
                {f.icon}
              </span>
              <p className="text-xs font-semibold text-navy">{f.label}</p>
              <p className="text-[11px] leading-relaxed text-charcoal/50">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Subtle footer */}
        <p className="mt-5 text-center text-[11px] text-charcoal/35">
          AI score + grammar free forever — no account required.
        </p>
      </aside>
    );
  }

  // Build flagged-sentence map for the inline highlighter
  type FlaggedSentenceWithGuidance = AnalyzeResponse["flagged_sentences"][number] & {
    free_guidance?: FreeGuidance | null;
  };
  const flaggedMap: FlaggedMap = new Map(
    (results.flagged_sentences as FlaggedSentenceWithGuidance[]).map((s) => [
      s.index,
      {
        score: s.score,
        reason: s.reason,
        risk_level: s.risk_level,
        free_guidance: s.free_guidance,
      },
    ])
  );

  return (
    <aside className="space-y-4">
      {resultsStale && (
        <section className="flex items-center gap-3 rounded-input border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span className="flex-1">
            These results are from your previous draft. Re-analyze to update the score.
          </span>
        </section>
      )}

      {/* ── Dual score header (AI Risk + optional Rubric Match) ── */}
      <DualScoreCard results={results} />

      {/* ── Sentence-level highlights — always shown after analysis ── */}
      {text && (
        <SentenceHighlighter
          text={text}
          flagged={flaggedMap}
          isPro={isPro}
          accessToken={accessToken}
          onReplaceSentence={onReplaceSentence}
        />
      )}

      {/* ── Compact rubric criteria (when rubric present) ── */}
      {results.rubric_result && (
        <section className="surface-panel rounded-[1.25rem] p-4">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-sm font-semibold text-navy">Rubric criteria</h4>
            {results.rubric_result.missing_count > 0 && onRubricRewrite && (
              <button
                type="button"
                onClick={onRubricRewrite}
                className="flex items-center gap-1 rounded-soft bg-navy px-2.5 py-1 text-[11px] font-bold text-white transition hover:bg-navy/80"
              >
                <Sparkles className="h-3 w-3" />Fix missing
              </button>
            )}
          </div>
          <p className="mt-1 text-xs text-charcoal/55">{results.rubric_result.summary}</p>
          <div className="mt-3 space-y-2">
            {results.rubric_result.criteria.map((c, i) => (
              <div key={i} className="flex items-start justify-between gap-2 rounded-input border border-border-base bg-mist px-3 py-2">
                <p className="text-xs leading-5 text-charcoal">{c.criterion}</p>
                <CoveragePill coverage={c.coverage} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Writing tips (compact chip list) ── */}
      {results.basic_tips.length > 0 && (
        <section className="surface-panel rounded-[1.25rem] p-4">
          <h4 className="text-sm font-semibold text-navy">Writing tips</h4>
          <div className="mt-3 space-y-2">
            {results.basic_tips.map((tip) => (
              <p key={tip} className="flex gap-2 rounded-input bg-mist px-3 py-2 text-xs leading-5 text-charcoal">
                <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-accent-dark" />{tip}
              </p>
            ))}
          </div>
        </section>
      )}

      {/* ── Pattern flags (compact pill row) ── */}
      {results.red_flags.length > 0 && (
        <section className="surface-panel rounded-[1.25rem] p-4">
          <h4 className="text-sm font-semibold text-navy">Patterns detected</h4>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {results.red_flags.map((flag) => (
              <span key={flag} className="rounded-full border border-border-base bg-mist px-2.5 py-1 text-[11px] font-medium text-charcoal/70">
                {flag}
              </span>
            ))}
          </div>
        </section>
      )}

      {quota && !quota.is_authenticated && (
        <section className="surface-panel flex flex-wrap items-center justify-between gap-3 rounded-[1.25rem] p-4">
          <div>
            <p className="text-sm font-semibold text-navy">
              {quota.remaining} of {quota.limit} free analyses left today
            </p>
            <p className="mt-1 text-xs text-charcoal/55">
              Create an account to save results and keep your writing history.
            </p>
          </div>
          {onAuthRequired && (
            <button
              type="button"
              onClick={onAuthRequired}
              className="rounded-soft bg-navy px-4 py-2 text-xs font-bold text-white transition hover:bg-navy/80"
            >
              Sign up
            </button>
          )}
        </section>
      )}

    </aside>
  );
}

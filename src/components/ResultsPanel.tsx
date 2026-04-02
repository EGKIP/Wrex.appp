import { useState } from "react";
import { Sparkles, Wand2, BarChart2, ScanSearch, ClipboardList, PenLine } from "lucide-react";
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
  /** Called when the user clicks "Replace in editor" inside a Pro rewrite card */
  onReplaceSentence?: (original: string, replacement: string) => void;
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
  onReplaceSentence,
}: {
  text: string;
  flagged: FlaggedMap;
  isPro?: boolean;
  accessToken?: string | null;
  onUpgrade?: () => void;
  onReplaceSentence?: (original: string, replacement: string) => void;
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
      <div className="mb-3 flex items-center justify-between">
        <h4 className="font-heading text-base font-semibold text-navy">Sentence analysis</h4>
      </div>

      {/* Legend + hint */}
      <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-input border border-border-base bg-mist px-3 py-2">
        <span className="flex items-center gap-1.5 text-xs text-charcoal/60">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-400" />
          <span className="font-semibold text-amber-700">Flagged</span> — click to get a rewrite
        </span>
        <span className="flex items-center gap-1.5 text-xs text-charcoal/60">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-400" />
          <span className="font-semibold text-emerald-700">Natural</span> — sounds human
        </span>
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
                className={`rounded-sm px-1 py-0.5 text-left cursor-pointer transition-all duration-150 ${isActive ? "ring-2 ring-amber-400/60" : "hover:ring-1 hover:ring-amber-300"}`}
                style={{
                  background: isActive ? "rgba(245,158,11,0.22)" : "rgba(245,158,11,0.14)",
                  borderBottom: "2.5px solid #f59e0b",
                  textDecoration: isActive ? "line-through" : "none",
                  textDecorationColor: "#f59e0b",
                }}
              >
                {sentence}
              </button>
              {" "}
              {isActive && (
                <span className="block mt-2 mb-3">
                  {/* Reason chip */}
                  {flag.reason && (
                    <span className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-amber-300/70 bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                      {flag.reason}
                    </span>
                  )}
                  {!isPro ? (
                    /* Free user nudge */
                    <span className="flex items-start gap-3 rounded-input border border-accent/30 bg-accent/5 px-4 py-3">
                      <Sparkles className="mt-0.5 h-4 w-4 flex-shrink-0 text-accent" />
                      <span className="flex-1">
                        <span className="block text-xs font-semibold text-navy">Rewrite with AI — Pro feature</span>
                        <span className="block text-xs text-charcoal/65 mt-0.5">Upgrade to Pro to fix flagged sentences with one click.</span>
                        <button type="button" onClick={onUpgrade} className="mt-2 rounded-soft bg-gradient-to-br from-accent to-accent-dark px-3 py-1 text-xs font-bold text-navy transition hover:opacity-90">
                          Upgrade to Pro
                        </button>
                      </span>
                      <button type="button" onClick={() => setActiveIdx(null)} className="text-charcoal/30 hover:text-charcoal/60 text-base leading-none">×</button>
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
                            ✓ Accept
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
        {isPro
          ? "Click any amber-highlighted sentence → review the suggestion → hit ✓ Accept to apply."
          : "Click any amber-highlighted sentence to see rewrite options."}
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

/** Compact dual-score header: AI Risk + optional Rubric Match side-by-side */
function DualScoreCard({ results }: { results: AnalyzeResponse }) {
  const ai = results.score;
  const rubric = results.rubric_result ?? null;
  const aiColor = scoreColor(ai);
  const rubricColor = rubric
    ? rubric.overall_score >= 70 ? "#10B981" : rubric.overall_score >= 40 ? "#F59E0B" : "#EF4444"
    : null;

  return (
    <section className={`rounded-modal bg-gradient-to-br p-4 shadow-card ${scoreGradient(ai)}`}>
      <div className={`grid gap-4 ${rubric ? "grid-cols-2" : "grid-cols-1"}`}>
        {/* AI Risk */}
        <div className="text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest text-charcoal/50">AI Risk</p>
          <p className="font-stat mt-1 text-[2.4rem] font-bold leading-none" style={{ color: aiColor }}>{ai}</p>
          <p className="mt-0.5 text-xs text-charcoal/60">{scoreLabel(ai)}</p>
          <span className={`mt-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${confidenceTone(results.confidence)}`}>
            {results.confidence} signal
          </span>
        </div>
        {/* Rubric Match — only when a rubric was analyzed */}
        {rubric && (
          <div className="border-l border-black/10 pl-4 text-center">
            <p className="text-[10px] font-bold uppercase tracking-widest text-charcoal/50">Rubric Match</p>
            <p className="font-stat mt-1 text-[2.4rem] font-bold leading-none" style={{ color: rubricColor! }}>{rubric.overall_score}%</p>
            <p className="mt-0.5 text-xs text-charcoal/60">
              {rubric.overall_score >= 70 ? "Strong match" : rubric.overall_score >= 40 ? "Partial match" : "Needs work"}
            </p>
            <div className="mt-2 flex justify-center gap-3 text-[10px] font-semibold">
              <span className="text-success">{rubric.strong_count} covered</span>
              <span className="text-danger">{rubric.missing_count} missing</span>
            </div>
          </div>
        )}
      </div>
      {/* One-line summary */}
      <p className="mt-3 rounded-input border border-white/50 bg-white/50 px-3 py-2 text-xs leading-5 text-charcoal">
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
            <Sparkles className="inline h-3 w-3 mr-1 -mt-0.5" />Rewrite to fix missing
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

export function ResultsPanel({ results, loading = false, isPro = false, onRubricRewrite, onUpgrade, text, accessToken, onReplaceSentence }: ResultsPanelProps) {
  if (loading) return <SkeletonPanel />;

  if (!results) {
    const features = [
      {
        icon: <BarChart2 className="h-5 w-5 text-accent" />,
        label: "AI-pattern score",
        desc: "0–100 likelihood based on writing patterns",
      },
      {
        icon: <ScanSearch className="h-5 w-5 text-amber-500" />,
        label: "Sentence flags",
        desc: "Highlights sentences that read AI-written",
      },
      {
        icon: <ClipboardList className="h-5 w-5 text-navy" />,
        label: "Rubric alignment",
        desc: "Maps your draft against assignment criteria",
        pro: true,
      },
      {
        icon: <PenLine className="h-5 w-5 text-emerald-600" />,
        label: "Writing tips",
        desc: "Concrete suggestions to improve your draft",
        pro: true,
      },
    ];

    return (
      <aside className="flex flex-col rounded-modal border border-dashed border-border-base bg-white p-6 shadow-soft sm:p-8">
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
        <div className="grid grid-cols-2 gap-3">
          {features.map((f) => (
            <div
              key={f.label}
              className="relative flex flex-col gap-1.5 rounded-soft border border-border-base bg-mist/60 p-3.5"
            >
              {f.pro && (
                <span className="absolute right-2.5 top-2.5 rounded-full bg-accent/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-navy">
                  Pro
                </span>
              )}
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
          Free for your first analysis — no account required.
        </p>
      </aside>
    );
  }

  // Build flagged-sentence map for the inline highlighter
  const flaggedMap: FlaggedMap = new Map(
    results.flagged_sentences.map((s) => [s.index, { score: s.score, reason: s.reason }])
  );

  return (
    <aside className="space-y-4">
      {/* ── Dual score header (AI Risk + optional Rubric Match) ── */}
      <DualScoreCard results={results} />

      {/* ── Sentence-level highlights (the editor-adjacent view) ── */}
      {text && results.flagged_sentences.length > 0 && (
        <SentenceHighlighter
          text={text}
          flagged={flaggedMap}
          isPro={isPro}
          accessToken={accessToken}
          onUpgrade={onUpgrade}
          onReplaceSentence={onReplaceSentence}
        />
      )}

      {/* ── Compact rubric criteria (when rubric present) ── */}
      {results.rubric_result && (
        <section className="rounded-modal border border-border-base bg-white p-4 shadow-soft">
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
        <section className="rounded-modal border border-border-base bg-white p-4 shadow-soft">
          <h4 className="text-sm font-semibold text-navy">Writing tips</h4>
          <div className="mt-3 space-y-2">
            {results.basic_tips.map((tip) => (
              <p key={tip} className="flex gap-2 rounded-input bg-mist px-3 py-2 text-xs leading-5 text-charcoal">
                <span className="shrink-0 text-accent">✦</span>{tip}
              </p>
            ))}
          </div>
        </section>
      )}

      {/* ── Pattern flags (compact pill row) ── */}
      {results.red_flags.length > 0 && (
        <section className="rounded-modal border border-border-base bg-white p-4 shadow-soft">
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

      {/* ── Pro CTA — free users only ── */}
      {!isPro && (
        <section className="rounded-modal border border-accent/20 bg-gradient-to-br from-accent/5 to-accent/10 p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-charcoal/45">Wrex Pro</p>
          <h4 className="mt-1 text-sm font-semibold text-navy">{results.pro_prompt.title}</h4>
          <p className="mt-1.5 text-xs leading-5 text-charcoal/65">{results.pro_prompt.message}</p>
          <button
            type="button"
            onClick={onUpgrade}
            className="btn-shine mt-3 inline-block rounded-soft bg-gradient-to-br from-accent to-accent-dark px-4 py-2 text-xs font-bold text-navy transition hover:shadow-glow hover:scale-[1.02]"
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

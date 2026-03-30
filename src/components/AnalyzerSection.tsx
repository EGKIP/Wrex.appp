import { useCallback, useEffect, useRef, useState } from "react";
import {
  ApiError,
  analyzeText,
  checkGrammar,
  createCheckoutSession,
  getHistory,
  proHumanize,
  proImprove,
  proRubricRewrite,
} from "../lib/api";
import { useToast } from "../context/toast";
import type {
  AnalyzeResponse,
  GrammarMatch,
  HumanizeResponse,
  ImproveSuggestion,
  QuotaInfo,
  RubricRewriteResponse,
  SubmissionRecord,
} from "../types";
import { HistoryPanel } from "./HistoryPanel";
import { ResultsPanel } from "./ResultsPanel";

const SAMPLE_TEXT = `In today's academic environment, technology has become an increasingly important part of how students learn and communicate. Moreover, it offers convenience and efficiency in many different contexts. However, it is also important to think carefully about how writing can remain personal, specific, and grounded in real understanding.`;

function countWords(text: string) {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

const RUBRIC_TEMPLATES: { label: string; value: string }[] = [
  {
    label: "5-Paragraph Essay",
    value:
      "1. Clear introductory paragraph with a thesis statement\n2. First body paragraph with supporting evidence\n3. Second body paragraph with supporting evidence\n4. Third body paragraph with supporting evidence\n5. Concluding paragraph that restates the thesis",
  },
  {
    label: "Argumentative Essay",
    value:
      "1. Present a clear, debatable claim or thesis\n2. Provide at least two pieces of evidence supporting the argument\n3. Address and refute at least one counterargument\n4. Use credible, cited sources\n5. Conclude with a persuasive summary and call to action",
  },
  {
    label: "Lab Report",
    value:
      "1. State the hypothesis clearly in the introduction\n2. Describe the experimental method in sufficient detail to be reproducible\n3. Present results with appropriate data tables or figures\n4. Discuss results in relation to the hypothesis\n5. Conclude with limitations and suggestions for further research",
  },
  {
    label: "Literary Analysis",
    value:
      "1. Introduce the literary work and author with relevant context\n2. State a focused analytical thesis\n3. Analyze at least two specific literary devices (e.g., symbolism, tone, imagery)\n4. Support claims with direct textual evidence and quotations\n5. Synthesize the analysis in a concluding paragraph",
  },
];

interface AnalyzerSectionProps {
  accessToken?: string | null;
  isPro?: boolean;
  onQuotaUpdate?: (quota: QuotaInfo) => void;
  onAuthRequired?: () => void;
}

export function AnalyzerSection({ accessToken, isPro = false, onQuotaUpdate, onAuthRequired }: AnalyzerSectionProps) {
  const { toast } = useToast();
  const [text, setText] = useState(SAMPLE_TEXT);
  const [rubric, setRubric] = useState("");
  const [showRubric, setShowRubric] = useState(false);
  const [results, setResults] = useState<AnalyzeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const [error, setError] = useState("");
  const [quotaHit, setQuotaHit] = useState<"anon" | "auth" | null>(null);
  const [quota, setQuota] = useState<QuotaInfo | null>(null);
  const [resetCountdown, setResetCountdown] = useState("");
  const [history, setHistory] = useState<SubmissionRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const wordCount = countWords(text);

  // ── Grammar check state ────────────────────────────────────────────────────
  const [grammarMatches, setGrammarMatches] = useState<GrammarMatch[]>([]);
  const [grammarLoading, setGrammarLoading] = useState(false);
  const grammarTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce: run grammar check 900ms after the user stops typing (min 50 chars)
  useEffect(() => {
    if (grammarTimer.current) clearTimeout(grammarTimer.current);
    if (text.trim().length < 50) { setGrammarMatches([]); return; }
    grammarTimer.current = setTimeout(async () => {
      setGrammarLoading(true);
      try {
        const result = await checkGrammar(text);
        setGrammarMatches(result.matches);
      } catch {
        // non-critical — silently skip
      } finally {
        setGrammarLoading(false);
      }
    }, 900);
    return () => { if (grammarTimer.current) clearTimeout(grammarTimer.current); };
  }, [text]);

  // ── Midnight reset countdown ───────────────────────────────────────────────
  // Formats the time remaining until the next local midnight as "Xh Ym"
  useEffect(() => {
    const quotaBlocked = accessToken && !isPro && quota?.remaining === 0;
    if (!quotaBlocked) { setResetCountdown(""); return; }

    function calcCountdown() {
      const now = new Date();
      const midnight = new Date(now);
      midnight.setHours(24, 0, 0, 0);
      const diffSec = Math.floor((midnight.getTime() - now.getTime()) / 1000);
      const h = Math.floor(diffSec / 3600);
      const m = Math.floor((diffSec % 3600) / 60);
      return h > 0 ? `${h}h ${m}m` : `${m}m`;
    }

    setResetCountdown(calcCountdown());
    const id = setInterval(() => setResetCountdown(calcCountdown()), 60_000);
    return () => clearInterval(id);
  }, [accessToken, isPro, quota]);

  // ── Pro AI state ───────────────────────────────────────────────────────────
  const proPanelRef = useRef<HTMLDivElement>(null);
  const [proTab, setProTab] = useState<"improve" | "humanize" | "rubric-rewrite">("improve");
  const [improveResult, setImproveResult] = useState<ImproveSuggestion[] | null>(null);
  const [humanizeResult, setHumanizeResult] = useState<HumanizeResponse | null>(null);
  const [rubricRewriteResult, setRubricRewriteResult] = useState<RubricRewriteResponse | null>(null);
  const [proLoading, setProLoading] = useState(false);
  const [proError, setProError] = useState("");

  const switchProTab = useCallback((tab: "improve" | "humanize" | "rubric-rewrite") => {
    setProTab(tab);
    setImproveResult(null);
    setHumanizeResult(null);
    setRubricRewriteResult(null);
    setProError("");
  }, []);

  const runProImprove = useCallback(async () => {
    if (!accessToken) return;
    setProLoading(true); setProError("");
    try {
      const res = await proImprove(text, rubric || undefined, accessToken);
      setImproveResult(res.suggestions);
    } catch (e) {
      setProError(e instanceof Error ? e.message : "Something went wrong.");
    } finally { setProLoading(false); }
  }, [accessToken, text, rubric]);

  const runProHumanize = useCallback(async () => {
    if (!accessToken) return;
    setProLoading(true); setProError("");
    try {
      const res = await proHumanize(text, accessToken);
      setHumanizeResult(res);
    } catch (e) {
      setProError(e instanceof Error ? e.message : "Something went wrong.");
    } finally { setProLoading(false); }
  }, [accessToken, text]);

  const runProRubricRewrite = useCallback(async () => {
    if (!accessToken) return;
    setProLoading(true); setProError("");
    try {
      const res = await proRubricRewrite(text, rubric, accessToken);
      setRubricRewriteResult(res);
    } catch (e) {
      setProError(e instanceof Error ? e.message : "Something went wrong.");
    } finally { setProLoading(false); }
  }, [accessToken, text, rubric]);

  /** Called from ResultsPanel rubric nudge button — scroll to Pro panel + switch tab */
  const handleRubricRewriteNudge = useCallback(() => {
    switchProTab("rubric-rewrite");
    setTimeout(() => {
      proPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }, [switchProTab]);

  async function fetchHistory() {
    if (!accessToken) return;
    setHistoryLoading(true);
    try {
      const data = await getHistory(accessToken);
      setHistory(data.submissions);
    } catch {
      // non-critical — just skip
    } finally {
      setHistoryLoading(false);
    }
  }

  // Load history when the user logs in (accessToken changes)
  useEffect(() => {
    if (accessToken) {
      void fetchHistory();
    } else {
      setHistory([]);
      setQuota(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  async function onAnalyze() {
    setLoading(true);
    setError("");
    setQuotaHit(null);

    try {
      const response = await analyzeText(
        text,
        showRubric && rubric.trim() ? rubric : undefined,
        accessToken,
      );
      setResults(response);
      if (response.quota) {
        onQuotaUpdate?.(response.quota);
        setQuota(response.quota);
      }

      // Toast on successful analysis save
      if (accessToken) {
        toast("Analysis saved to your history ✓", "success");
        void fetchHistory();
      }

      // If anon and limit reached, nudge them to sign up next time
      if (response.quota && response.quota.remaining === 0 && !response.quota.is_authenticated) {
        onAuthRequired?.();
      }
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 429) {
        setQuotaHit(accessToken ? "auth" : "anon");
      } else {
        const msg =
          requestError instanceof Error
            ? requestError.message
            : "Unable to analyze this text right now.";
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  function loadFromHistory(textPreview: string, rubricPreview: string | null) {
    setText(textPreview);
    if (rubricPreview) {
      setRubric(rubricPreview);
      setShowRubric(true);
    }
    setResults(null);
    window.scrollTo({ top: document.getElementById("analyzer")?.offsetTop ?? 0, behavior: "smooth" });
  }

  async function handleUpgrade() {
    if (!accessToken) { onAuthRequired?.(); return; }
    setUpgrading(true);
    try {
      const { url } = await createCheckoutSession(accessToken);
      window.location.href = url;
    } catch {
      toast("Could not start checkout. Please try again.", "error");
      setUpgrading(false);
    }
  }

  return (
    <section id="analyzer" className="bg-mist px-6 py-16 lg:px-10 lg:py-20">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto mb-10 max-w-xl text-center">
          <h2 className="text-[1.75rem] font-bold tracking-tight text-navy lg:text-[2.25rem]">
            Try it now
          </h2>
          <p className="mt-2 text-sm text-charcoal/60">
            Free — no account needed for your first analysis.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          {/* Input card */}
          <div className="rounded-modal border border-border-base bg-white p-6 shadow-soft sm:p-8">
            {/* Draft input */}
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-navy">Your writing</p>
              <button
                type="button"
                onClick={() => setText("")}
                className="text-xs text-charcoal/45 transition hover:text-charcoal hover:underline"
              >
                Clear
              </button>
            </div>

            <textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="Paste your text here to analyze..."
              className="mt-3 min-h-[300px] w-full rounded-input border border-border-base bg-white px-4 py-3 text-base leading-7 text-charcoal placeholder:text-charcoal/30 outline-none transition focus:border-accent focus:ring-[3px] focus:ring-accent/15"
            />
            <div className="mt-2 flex items-center justify-between text-xs text-charcoal/40">
              <span>{wordCount} words</span>
              {grammarLoading && <span className="animate-pulse">Checking grammar…</span>}
              {!grammarLoading && grammarMatches.length > 0 && (
                <span>
                  <span className="font-semibold text-danger">
                    {grammarMatches.filter((m) => m.match_type === "error").length} errors
                  </span>
                  {" · "}
                  <span className="font-semibold text-warning">
                    {grammarMatches.filter((m) => m.match_type === "suggestion").length} suggestions
                  </span>
                </span>
              )}
            </div>

            {/* Grammar matches list */}
            {grammarMatches.length > 0 && (
              <div className="mt-3">
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-widest text-charcoal/40">
                  Grammar &amp; spelling
                </p>
                <div className="max-h-[200px] space-y-2 overflow-y-auto rounded-input border border-border-base bg-mist p-3">
                {grammarMatches.slice(0, 12).map((m, i) => (
                  <div key={i} className="flex items-start gap-2.5 text-sm">
                    <span
                      className="mt-1 h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: m.match_type === "error" ? "#EF4444" : "#F59E0B" }}
                    />
                    <div className="min-w-0">
                      <p className="leading-snug text-charcoal">{m.message}</p>
                      {m.replacements.length > 0 && (
                        <p className="mt-0.5 text-xs text-charcoal/50">
                          Suggest:{" "}
                          {m.replacements.slice(0, 3).map((r, ri) => (
                            <span key={ri} className="mr-1 rounded bg-white px-1 py-0.5 font-mono text-[11px] text-navy shadow-sm">
                              {r}
                            </span>
                          ))}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                {grammarMatches.length > 12 && (
                  <p className="pt-1 text-center text-xs text-charcoal/40">
                    +{grammarMatches.length - 12} more issues
                  </p>
                )}
              </div>
              </div>
            )}

            {/* Rubric toggle */}
            <div className="mt-5 border-t border-border-base pt-5">
              <button
                type="button"
                onClick={() => setShowRubric((v) => !v)}
                className="flex items-center gap-2 text-sm font-medium text-charcoal/70 transition hover:text-navy"
              >
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition ${
                    showRubric ? "border-accent bg-accent" : "border-border-base"
                  }`}
                >
                  {showRubric && (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M2 5l2 2 4-4" stroke="#0F172A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
                Add rubric or assignment brief
              </button>
              {showRubric && (
                <div className="mt-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs text-charcoal/50">
                      Paste your marking criteria — one requirement per line.
                    </p>
                    <select
                      value=""
                      onChange={(e) => { if (e.target.value) setRubric(e.target.value); }}
                      className="rounded border border-border-base bg-white px-2 py-1 text-xs text-charcoal/70 outline-none transition focus:border-accent focus:ring-[2px] focus:ring-accent/15 cursor-pointer"
                    >
                      <option value="">Load template…</option>
                      {RUBRIC_TEMPLATES.map((t) => (
                        <option key={t.label} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                  <textarea
                    value={rubric}
                    onChange={(e) => setRubric(e.target.value)}
                    placeholder={"1. Discuss the causes of the French Revolution\n2. Analyze the social impact\n3. Evaluate economic factors"}
                    rows={5}
                    className="w-full rounded-input border border-border-base bg-mist px-4 py-3 text-sm leading-7 text-charcoal outline-none transition placeholder:text-charcoal/30 focus:border-accent focus:ring-[3px] focus:ring-accent/15"
                  />
                </div>
              )}
            </div>

            {quotaHit === "anon" && (
              <div className="mt-4 rounded-input border border-accent/40 bg-accent/10 px-4 py-3 text-sm">
                <p className="font-semibold text-navy">You've used your free analysis for today.</p>
                <p className="mt-1 text-charcoal/70">
                  Create a free account to get 3 analyses per day.
                </p>
                <button
                  type="button"
                  onClick={onAuthRequired}
                  className="mt-3 rounded-soft bg-navy px-4 py-2 text-xs font-bold text-white transition hover:bg-navy/80"
                >
                  Sign up free →
                </button>
              </div>
            )}
            {quotaHit === "auth" && !isPro && (
              <div className="mt-4 rounded-input border border-accent/40 bg-accent/10 px-4 py-3 text-sm">
                <p className="font-semibold text-navy">You've used all 3 analyses for today.</p>
                <p className="mt-1 text-charcoal/70">
                  Upgrade to <strong>Wrex Pro</strong> for unlimited analyses, priority processing, and more.
                </p>
                <button
                  type="button"
                  onClick={handleUpgrade}
                  disabled={upgrading}
                  className="btn-shine mt-3 flex items-center gap-2 rounded-soft bg-gradient-to-br from-accent to-accent-dark px-5 py-2 text-xs font-bold text-navy shadow-button transition hover:shadow-glow hover:scale-[1.02] active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {upgrading ? (
                    <>
                      <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                      </svg>
                      Redirecting…
                    </>
                  ) : (
                    <>👑 Upgrade to Pro — $9/month</>
                  )}
                </button>
              </div>
            )}
            {error ? (
              <p className="mt-4 rounded-input border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
                {error}
              </p>
            ) : null}

            {/* Hard quota block — logged-in free user, 0 remaining */}
            {accessToken && !isPro && quota?.remaining === 0 ? (
              <div className="mt-6">
                <button
                  type="button"
                  disabled
                  className="flex cursor-not-allowed items-center gap-2 rounded-soft bg-charcoal/10 px-8 py-3.5 text-base font-bold text-charcoal/40"
                >
                  <svg className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
                  </svg>
                  Limit reached
                </button>
                <p className="mt-2 text-xs text-charcoal/50 tabular-nums">
                  Resets in <span className="font-semibold text-charcoal/70">{resetCountdown}</span>
                  {" · "}
                  <button
                    type="button"
                    onClick={handleUpgrade}
                    disabled={upgrading}
                    className="font-semibold text-accent underline-offset-2 hover:underline disabled:opacity-50"
                  >
                    {upgrading ? "Redirecting…" : "Upgrade for unlimited →"}
                  </button>
                </p>
              </div>
            ) : (
              <div className="mt-6 flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={onAnalyze}
                  disabled={loading || text.trim().length < 10}
                  className="btn-shine flex items-center gap-2 rounded-soft bg-gradient-to-br from-accent to-accent-dark px-8 py-3.5 text-base font-bold text-navy shadow-button transition hover:shadow-glow hover:scale-[1.02] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {loading ? (
                    <>
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                      </svg>
                      Analyzing…
                    </>
                  ) : (
                    "Analyze my text"
                  )}
                </button>

                {/* Usage counter — logged-in free users only */}
                {accessToken && !isPro && quota && (
                  <span className={`text-xs font-medium tabular-nums ${
                    quota.remaining === 1 ? "text-warning" : "text-charcoal/50"
                  }`}>
                    {quota.used} / {quota.limit} analyses used today
                    <span className="ml-1 text-charcoal/35">· {quota.remaining} left</span>
                  </span>
                )}
              </div>
            )}
          </div>

          <ResultsPanel results={results} loading={loading} isPro={isPro} onRubricRewrite={handleRubricRewriteNudge} />
        </div>

        {/* Pro AI panel — shown below grid when results exist */}
        {results && (
          <div ref={proPanelRef} className="mt-8 rounded-modal border border-border-base bg-white p-6 shadow-soft sm:p-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">👑</span>
                <h3 className="font-heading text-base font-semibold text-navy">Pro writing tools</h3>
              </div>
              {/* Tab switcher */}
              {isPro && (
                <div className="flex rounded-input border border-border-base text-sm">
                  {(["improve", "humanize", "rubric-rewrite"] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => switchProTab(tab)}
                      className={`px-4 py-1.5 font-medium transition first:rounded-l-input last:rounded-r-input ${
                        proTab === tab
                          ? "bg-navy text-white"
                          : "text-charcoal/60 hover:bg-mist"
                      }`}
                    >
                      {tab === "rubric-rewrite" ? "Rewrite" : tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {!isPro ? (
              /* Locked state for free users */
              <div className="mt-5 rounded-input border border-dashed border-accent/40 bg-accent/5 p-5 text-center">
                <p className="text-sm font-semibold text-navy">Unlock AI-powered rewrites</p>
                <p className="mt-2 text-sm text-charcoal/65">
                  Pro members can get sentence-level improvement suggestions and full humanized rewrites
                  aligned to their rubric — powered by GPT-4o mini.
                </p>
                <button
                  type="button"
                  onClick={handleUpgrade}
                  disabled={upgrading}
                  className="btn-shine mt-4 inline-flex items-center gap-2 rounded-soft bg-gradient-to-br from-accent to-accent-dark px-6 py-2.5 text-sm font-bold text-navy shadow-button transition hover:shadow-glow hover:scale-[1.02] active:scale-[0.97] disabled:opacity-50"
                >
                  {upgrading ? "Redirecting…" : "👑 Upgrade to Pro — $9/month"}
                </button>
              </div>
            ) : (
              /* Pro content */
              <div className="mt-5">
                {proTab === "improve" && (
                  <>
                    <p className="mb-4 text-sm text-charcoal/65">
                      Get sentence-level suggestions to strengthen your writing and better address your rubric.
                    </p>
                    {!improveResult && (
                      <button
                        type="button"
                        onClick={runProImprove}
                        disabled={proLoading}
                        className="btn-shine flex items-center gap-2 rounded-soft bg-gradient-to-br from-accent to-accent-dark px-5 py-2.5 text-sm font-bold text-navy shadow-button transition hover:shadow-glow hover:scale-[1.02] active:scale-[0.97] disabled:opacity-40"
                      >
                        {proLoading ? (
                          <><svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/></svg>Analyzing…</>
                        ) : "✨ Get improvement suggestions"}
                      </button>
                    )}
                    {improveResult && (
                      <div className="space-y-4">
                        {improveResult.map((s, i) => (
                          <div key={i} className="rounded-input border border-border-base bg-mist p-4">
                            <p className="text-xs font-semibold uppercase tracking-wider text-charcoal/45">Original</p>
                            <p className="mt-1 text-sm leading-6 text-charcoal">{s.sentence}</p>
                            <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-warning">Issue</p>
                            <p className="mt-1 text-sm leading-6 text-charcoal/70">{s.issue}</p>
                            <div className="mt-3 flex items-start justify-between gap-3">
                              <p className="text-xs font-semibold uppercase tracking-wider text-success">Rewrite</p>
                              <button
                                type="button"
                                onClick={() => void navigator.clipboard.writeText(s.rewrite)}
                                className="shrink-0 rounded bg-white px-2 py-0.5 text-[11px] font-medium text-charcoal/50 shadow-sm transition hover:text-navy hover:shadow"
                              >
                                Copy
                              </button>
                            </div>
                            <p className="mt-1 text-sm leading-6 text-charcoal">{s.rewrite}</p>
                          </div>
                        ))}
                        <button type="button" onClick={() => setImproveResult(null)} className="text-xs text-charcoal/40 hover:underline">
                          Run again
                        </button>
                      </div>
                    )}
                  </>
                )}

                {proTab === "humanize" && (
                  <>
                    <p className="mb-4 text-sm text-charcoal/65">
                      Rewrite your text to sound more natural and varied — reducing detectable AI patterns.
                    </p>
                    {!humanizeResult && (
                      <button
                        type="button"
                        onClick={runProHumanize}
                        disabled={proLoading}
                        className="btn-shine flex items-center gap-2 rounded-soft bg-gradient-to-br from-accent to-accent-dark px-5 py-2.5 text-sm font-bold text-navy shadow-button transition hover:shadow-glow hover:scale-[1.02] active:scale-[0.97] disabled:opacity-40"
                      >
                        {proLoading ? (
                          <><svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/></svg>Rewriting…</>
                        ) : "✨ Humanize my text"}
                      </button>
                    )}
                    {humanizeResult && (
                      <div className="space-y-4">
                        <div className="rounded-input border border-success/30 bg-success/5 p-4">
                          <p className="text-xs font-semibold uppercase tracking-wider text-success">Changes made</p>
                          <p className="mt-1 text-sm text-charcoal/70">{humanizeResult.changes_summary}</p>
                        </div>
                        <div className="rounded-input border border-border-base bg-mist p-4">
                          <div className="mb-2 flex items-center justify-between gap-3">
                            <p className="text-xs font-semibold uppercase tracking-wider text-charcoal/45">Rewritten text</p>
                            <button
                              type="button"
                              onClick={() => {
                                setText(humanizeResult.rewritten);
                                setHumanizeResult(null);
                                setResults(null);
                                window.scrollTo({ top: document.getElementById("analyzer")?.offsetTop ?? 0, behavior: "smooth" });
                                toast("Text updated — re-analyze to see your new score ✓", "success");
                              }}
                              className="shrink-0 rounded-soft bg-navy px-3 py-1 text-xs font-bold text-white transition hover:bg-navy/80"
                            >
                              Use this text ↑
                            </button>
                          </div>
                          <p className="whitespace-pre-wrap text-sm leading-7 text-charcoal">{humanizeResult.rewritten}</p>
                        </div>
                        <button type="button" onClick={() => setHumanizeResult(null)} className="text-xs text-charcoal/40 hover:underline">
                          Run again
                        </button>
                      </div>
                    )}
                  </>
                )}

                {proTab === "rubric-rewrite" && (
                  <>
                    {/* Guard: no rubric entered */}
                    {(!showRubric || !rubric.trim()) ? (
                      <div className="rounded-input border border-dashed border-border-base bg-mist p-5 text-center">
                        <p className="text-sm font-semibold text-navy">No rubric added yet</p>
                        <p className="mt-2 text-sm text-charcoal/65">
                          Add your assignment criteria above to use the rubric rewrite feature.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setShowRubric(true);
                            window.scrollTo({ top: document.getElementById("analyzer")?.offsetTop ?? 0, behavior: "smooth" });
                          }}
                          className="mt-3 rounded-soft bg-navy px-4 py-2 text-xs font-bold text-white transition hover:bg-navy/80"
                        >
                          Add rubric ↑
                        </button>
                      </div>
                    ) : (
                      <>
                        <p className="mb-4 text-sm text-charcoal/65">
                          Rewrite your entire essay so it explicitly addresses every criterion in your rubric — keeps your voice, hits all the marks.
                        </p>
                        {!rubricRewriteResult && (
                          <button
                            type="button"
                            onClick={runProRubricRewrite}
                            disabled={proLoading}
                            className="btn-shine flex items-center gap-2 rounded-soft bg-gradient-to-br from-accent to-accent-dark px-5 py-2.5 text-sm font-bold text-navy shadow-button transition hover:shadow-glow hover:scale-[1.02] active:scale-[0.97] disabled:opacity-40"
                          >
                            {proLoading ? (
                              <><svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/></svg>Rewriting…</>
                            ) : "✨ Rewrite to rubric"}
                          </button>
                        )}
                        {rubricRewriteResult && (
                          <div className="space-y-4">
                            {/* Criteria addressed pills */}
                            {rubricRewriteResult.criteria_addressed.length > 0 && (
                              <div className="rounded-input border border-success/30 bg-success/5 p-4">
                                <p className="text-xs font-semibold uppercase tracking-wider text-success">Criteria addressed</p>
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {rubricRewriteResult.criteria_addressed.map((c, i) => (
                                    <span key={i} className="rounded-full border border-success/20 bg-success/10 px-3 py-1 text-xs font-medium text-success">
                                      ✓ {c}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                            {/* Rewritten text + Use this text button */}
                            <div className="rounded-input border border-border-base bg-mist p-4">
                              <div className="mb-2 flex items-center justify-between gap-3">
                                <p className="text-xs font-semibold uppercase tracking-wider text-charcoal/45">Rewritten text</p>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setText(rubricRewriteResult.rewritten);
                                    setRubricRewriteResult(null);
                                    setResults(null);
                                    window.scrollTo({ top: document.getElementById("analyzer")?.offsetTop ?? 0, behavior: "smooth" });
                                    toast("Text updated — re-analyze to see your new score ✓", "success");
                                  }}
                                  className="shrink-0 rounded-soft bg-navy px-3 py-1 text-xs font-bold text-white transition hover:bg-navy/80"
                                >
                                  Use this text ↑
                                </button>
                              </div>
                              <p className="whitespace-pre-wrap text-sm leading-7 text-charcoal">{rubricRewriteResult.rewritten}</p>
                            </div>
                            <button type="button" onClick={() => setRubricRewriteResult(null)} className="text-xs text-charcoal/40 hover:underline">
                              Run again
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </>
                )}

                {proError && (
                  <p className="mt-4 rounded-input border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
                    {proError}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* History panel — shown whenever user is logged in */}
        {accessToken && (
          <HistoryPanel
            submissions={history}
            accessToken={accessToken}
            loading={historyLoading}
            onSelect={loadFromHistory}
            onRefresh={fetchHistory}
          />
        )}
      </div>
    </section>
  );
}

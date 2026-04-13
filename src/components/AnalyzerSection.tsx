import { useCallback, useEffect, useRef, useState } from "react";
import { Crown, Sparkles, Users, FileText } from "lucide-react";
import {
  ApiError,
  analyzeText,
  checkGrammar,
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

/** Pre-computed result for SAMPLE_TEXT — served instantly, zero API cost. */
const CACHED_SAMPLE_RESULT: AnalyzeResponse = {
  score: 46,
  confidence: "Medium",
  summary: "This text shows some patterns commonly associated with AI-assisted writing.",
  stats: {
    word_count: 47,
    sentence_count: 3,
    avg_sentence_length: 15.7,
    sentence_length_variance: 17.6,
    vocabulary_diversity: 0.85,
    repetition_index: 0.15,
    punctuation_diversity: 0.17,
    transition_phrase_count: 2,
  },
  red_flags: [
    "Sentence lengths are unusually consistent.",
    "Multiple sentences open with generic transitions.",
  ],
  flagged_sentences: [
    {
      index: 2,
      text: "However, it is also important to think carefully about how writing can remain personal, specific, and grounded in real understanding.",
      score: 0.35,
      reason: "Moderate AI-pattern signal — generic transition opener.",
      risk_level: "medium",
    },
    {
      index: 1,
      text: "Moreover, it offers convenience and efficiency in many different contexts.",
      score: 0.34,
      reason: "Moderate AI-pattern signal — generic transition opener.",
      risk_level: "medium",
    },
  ],
  basic_tips: [
    "Your sentence lengths are very uniform (variance 18). Deliberately mix short punchy sentences with longer ones to sound more natural.",
  ],
  pro_prompt: {
    title: "Improve this writing with Pro",
    message: "Get deeper rewrite suggestions, gap detection, and humanizing support with Pro.",
    cta_label: "Explore Pro",
  },
  rubric_result: null,
  quota: null,
};

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

const TONE_OPTIONS: { value: string; label: string; emoji: string; desc: string }[] = [
  { value: "natural",    label: "Natural",    emoji: "✦", desc: "Human, varied, natural flow" },
  { value: "narrative",  label: "Narrative",  emoji: "📖", desc: "Story-driven, first-person" },
  { value: "speech",     label: "Speech",     emoji: "🎙️", desc: "Conversational and punchy" },
  { value: "academic",   label: "Academic",   emoji: "🎓", desc: "Formal, structured, hedged" },
  { value: "persuasive", label: "Persuasive", emoji: "⚡", desc: "Argument-forward, rhetorical" },
];

interface AnalyzerSectionProps {
  accessToken?: string | null;
  isPro?: boolean;
  onQuotaUpdate?: (quota: QuotaInfo) => void;
  onAuthRequired?: () => void;
  /** Called when the user clicks any "Upgrade" button — parent opens the checkout modal */
  onUpgrade?: () => void;
  /** When true, fills the viewport (workspace mode — no landing page padding/heading) */
  workspace?: boolean;
  /** External history — when provided, AnalyzerSection skips its own fetch (workspace mode) */
  externalHistory?: SubmissionRecord[];
  externalHistoryLoading?: boolean;
  /** Called after a successful analysis so the parent can refresh history */
  onAnalyzed?: () => void;
  /** When set, loads this text+rubric into the editor (from sidebar history click) */
  loadRequest?: { text: string; rubric: string | null; autoAnalyze?: boolean } | null;
  onLoadRequestConsumed?: () => void;
  /**
   * Landing-page only: called when a logged-in user hits Analyze so the parent
   * can switch to workspace and auto-run the analysis there.
   */
  onSwitchToWorkspace?: (text: string, rubric: string | null) => void;
}

export function AnalyzerSection({ accessToken, isPro = false, onQuotaUpdate, onAuthRequired, onUpgrade, workspace = false, externalHistory, externalHistoryLoading, onAnalyzed, loadRequest, onLoadRequestConsumed, onSwitchToWorkspace }: AnalyzerSectionProps) {
  const { toast } = useToast();
  const [text, setText] = useState(() => workspace ? "" : SAMPLE_TEXT);
  const [rubric, setRubric] = useState("");
  const [showRubric, setShowRubric] = useState(false);
  const [results, setResults] = useState<AnalyzeResponse | null>(null);
  const [resultsStale, setResultsStale] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // In workspace mode, history is managed by the parent (App.tsx) and passed in as props.
  // In landing page mode, we manage it locally.
  const [internalHistory, setInternalHistory] = useState<SubmissionRecord[]>([]);
  const [internalHistoryLoading, setInternalHistoryLoading] = useState(false);
  const history = workspace && externalHistory !== undefined ? externalHistory : internalHistory;
  const historyLoading = workspace && externalHistoryLoading !== undefined ? externalHistoryLoading : internalHistoryLoading;

  const wordCount = countWords(text);
  const readingTime = wordCount > 0 ? Math.max(1, Math.round(wordCount / 200)) : 0;

  // ── Word limits ────────────────────────────────────────────────────────────
  const FREE_LIMIT = 500;
  const PRO_LIMIT = 2000;
  const wordLimit = isPro ? PRO_LIMIT : FREE_LIMIT;
  const wordLimitExceeded = wordCount > wordLimit;
  // Warning zone: last 20% of the limit
  const wordLimitWarning = !wordLimitExceeded && wordCount >= wordLimit * 0.8;

  // ── Textarea auto-grow ─────────────────────────────────────────────────────
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [text]);

  // ── Grammar check state ────────────────────────────────────────────────────
  const [grammarMatches, setGrammarMatches] = useState<GrammarMatch[]>([]);
  const [grammarLoading, setGrammarLoading] = useState(false);
  const grammarTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep a fresh ref to onAnalyze so Cmd+Enter always calls the latest closure
  const onAnalyzeRef = useRef<() => Promise<void>>(async () => {});

  // Load history item into editor when parent sends a loadRequest
  useEffect(() => {
    if (!loadRequest) return;
    setText(loadRequest.text);
    if (loadRequest.rubric) {
      setRubric(loadRequest.rubric);
      setShowRubric(true);
    }
    setResults(null);
    onLoadRequestConsumed?.();
    // Auto-analyze after a short delay so React commits the text state first
    if (loadRequest.autoAnalyze) {
      setTimeout(() => onAnalyzeRef.current(), 80);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadRequest]);

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

  // ── Cmd+Enter / Ctrl+Enter shortcut ───────────────────────────────────────
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        onAnalyzeRef.current();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // ── Replace a single sentence in the editor ───────────────────────────────
  function handleReplaceSentence(original: string, replacement: string) {
    setText((prev) => {
      // Replace only the first occurrence so we don't clobber duplicate sentences
      const idx = prev.indexOf(original);
      if (idx === -1) return prev;
      return prev.slice(0, idx) + replacement + prev.slice(idx + original.length);
    });
    setResultsStale(true); // keep results visible; stale banner prompts re-analyze
    toast("Sentence replaced — re-analyze to see your new score ✓", "success");
  }

  // ── Apply a grammar/spelling fix inline ───────────────────────────────────
  function applyGrammarFix(match: GrammarMatch, replacement: string) {
    setText((prev) => prev.slice(0, match.offset) + replacement + prev.slice(match.offset + match.length));
    setGrammarMatches((prev) => prev.filter((m) => m !== match));
  }

  // ── Tone state (Pro) ───────────────────────────────────────────────────────
  const [tone, setTone] = useState<string>("natural");

  // ── Pro AI state ───────────────────────────────────────────────────────────
  const proPanelRef = useRef<HTMLDivElement>(null);
  const [proTab, setProTab] = useState<"improve" | "humanize" | "rubric-rewrite">("improve");
  const [improveResult, setImproveResult] = useState<ImproveSuggestion[] | null>(null);
  const [humanizeResult, setHumanizeResult] = useState<HumanizeResponse | null>(null);
  const [rubricRewriteResult, setRubricRewriteResult] = useState<RubricRewriteResponse | null>(null);
  const [proLoading, setProLoading] = useState(false);
  const [proError, setProError] = useState("");
  // Collapsed on mobile by default, always open on lg+
  const [proCollapsed, setProCollapsed] = useState(() => window.innerWidth < 1024);

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
      const res = await proHumanize(text, accessToken, tone);
      setHumanizeResult(res);
    } catch (e) {
      setProError(e instanceof Error ? e.message : "Something went wrong.");
    } finally { setProLoading(false); }
  }, [accessToken, text, tone]);

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
    // In workspace mode, delegate to parent
    if (workspace && onAnalyzed) { onAnalyzed(); return; }
    setInternalHistoryLoading(true);
    try {
      const data = await getHistory(accessToken);
      setInternalHistory(data.submissions);
    } catch {
      // non-critical — just skip
    } finally {
      setInternalHistoryLoading(false);
    }
  }

  // Load history when the user logs in (accessToken changes) — only for landing page mode
  useEffect(() => {
    if (workspace) return; // parent handles this in workspace mode
    if (accessToken) {
      void fetchHistory();
    } else {
      setInternalHistory([]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  // Keep the ref in sync with the latest closure every render (used by Cmd+Enter)
  useEffect(() => {
    onAnalyzeRef.current = onAnalyze;
  });

  async function onAnalyze() {
    // ── Logged-in user on landing page → hand off to workspace ───────────────
    // Switch to workspace view and auto-analyze there for a better experience.
    if (!workspace && accessToken && onSwitchToWorkspace) {
      onSwitchToWorkspace(text, showRubric && rubric.trim() ? rubric : null);
      return;
    }

    setLoading(true);
    setError("");

    // ── Demo cache: serve instantly when visitor hasn't changed the sample text ──
    const isSampleUnchanged = !workspace && text.trim() === SAMPLE_TEXT.trim() && !rubric.trim();
    if (isSampleUnchanged) {
      await new Promise((r) => setTimeout(r, 320));
      setResults(CACHED_SAMPLE_RESULT);
      setResultsStale(false);
      setLoading(false);
      return;
    }

    try {
      const response = await analyzeText(
        text,
        showRubric && rubric.trim() ? rubric : undefined,
        accessToken,
      );
      setResults(response);
      setResultsStale(false);
      if (response.quota) onQuotaUpdate?.(response.quota);

      // Toast + history refresh on successful save
      if (accessToken) {
        toast("Analysis saved to your history ✓", "success");
        if (workspace && onAnalyzed) {
          onAnalyzed();
        } else {
          void fetchHistory();
        }
      }
    } catch (requestError) {
      const msg =
        requestError instanceof Error
          ? requestError.message
          : "Unable to analyze this text right now.";
      setError(msg);
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

  function handleUpgrade() {
    if (!accessToken) { onAuthRequired?.(); return; }
    if (onUpgrade) {
      onUpgrade();
    } else {
      // Fallback: shouldn't be reached, but just in case
      toast("Upgrade is not available right now.", "error");
    }
  }

  return (
    <section
      id="analyzer"
      className={
        workspace
          ? "bg-mist px-4 py-6 lg:px-6 lg:py-8"
          : "bg-mist px-6 py-16 lg:px-10 lg:py-20"
      }
    >
      <div className="mx-auto w-full max-w-3xl">
        {!workspace && (
          <div className="mb-8 text-center">
            <h2 className="text-[1.75rem] font-bold tracking-tight text-navy lg:text-[2.25rem]">
              Try it now — free
            </h2>
            <p className="mt-2 text-sm text-charcoal/60">
              Paste your writing below. See your authenticity score instantly.
            </p>
          </div>
        )}

        {/* Vertical single-column layout */}
        <div className="flex flex-col gap-4">

          {/* ── Editor card ─────────────────────────────────────────────────── */}
          <div className={`rounded-modal border border-border-base bg-white shadow-soft ${workspace ? "p-4 sm:p-5" : "p-5 sm:p-6"}`}>
            {/* Header row */}
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
              ref={textareaRef}
              value={text}
              onChange={(event) => { setText(event.target.value); }}
              placeholder="Paste your text here to analyze..."
              className={`mt-3 w-full rounded-input border border-border-base bg-white px-4 py-3 text-base leading-7 text-charcoal placeholder:text-charcoal/30 outline-none transition focus:border-accent focus:ring-[3px] focus:ring-accent/15 resize-none overflow-hidden ${workspace ? "min-h-[420px]" : "min-h-[300px]"}`}
            />
            <div className="mt-2 flex items-center justify-between text-xs text-charcoal/40">
              <span className={
                wordLimitExceeded ? "font-semibold text-danger" :
                wordLimitWarning  ? "font-semibold text-warning" :
                "text-charcoal/40"
              }>
                {wordCount} / {wordLimit} words
                {!wordLimitExceeded && readingTime > 0 && <> · ~{readingTime} min read</>}
                {wordLimitExceeded && <> — {isPro ? "Pro" : "Free"} limit reached</>}
              </span>
              {loading && <span className="animate-pulse text-accent">Scoring…</span>}
              {!loading && grammarLoading && <span className="animate-pulse">Checking grammar…</span>}
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

            {/* Grammar & Spelling — Accept / Copy cards */}
            {grammarMatches.length > 0 && (
              <div className="mt-3">
                <div className="mb-1.5 flex items-center gap-2">
                  <p className="text-xs font-semibold uppercase tracking-widest text-charcoal/40">
                    Grammar &amp; spelling
                  </p>
                  <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
                    {grammarMatches.length}
                  </span>
                </div>
                <div className="max-h-[300px] space-y-1.5 overflow-y-auto">
                  {grammarMatches.slice(0, 15).map((m, i) => {
                    const errorText = text.slice(m.offset, m.offset + m.length);
                    const topFix = m.replacements[0] ?? null;
                    return (
                      <div
                        key={i}
                        className="flex items-center gap-2 rounded-soft border border-border-base bg-white px-3 py-2 shadow-sm"
                      >
                        {/* Dot */}
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: m.match_type === "error" ? "#EF4444" : "#F59E0B" }}
                        />
                        {/* Text */}
                        <div className="min-w-0 flex-1 text-xs leading-5">
                          {errorText && topFix ? (
                            <span>
                              <span className="font-mono text-danger line-through opacity-70">{errorText}</span>
                              <span className="mx-1 text-charcoal/35">→</span>
                              <span className="font-mono font-semibold text-navy">{topFix}</span>
                              <span className="ml-1.5 text-charcoal/45">· {m.message}</span>
                            </span>
                          ) : (
                            <span className="text-charcoal">{m.message}</span>
                          )}
                        </div>
                        {/* Actions */}
                        <div className="flex shrink-0 gap-1">
                          {topFix && (
                            <button
                              type="button"
                              onClick={() => applyGrammarFix(m, topFix)}
                              className="rounded-soft bg-emerald-500 px-2.5 py-1 text-[11px] font-bold text-white transition hover:bg-emerald-600 active:scale-95"
                              title="Apply this fix in the editor"
                            >
                              ✓ Accept
                            </button>
                          )}
                          {topFix && (
                            <button
                              type="button"
                              onClick={() => navigator.clipboard.writeText(topFix)}
                              className="rounded-soft border border-border-base bg-mist px-2 py-1 text-[11px] text-charcoal/60 transition hover:bg-white hover:text-charcoal active:scale-95"
                              title="Copy the suggestion"
                            >
                              Copy
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {grammarMatches.length > 15 && (
                    <p className="pt-1 text-center text-xs text-charcoal/40">
                      +{grammarMatches.length - 15} more issues
                    </p>
                  )}
                </div>
              </div>
            )}



            {/* ── Rubric section ───────────────────────────────────────────── */}
            <div className="mt-4">
              {isPro ? (
                /* Pro: full rubric input */
                <>
                  {!showRubric && rubric.trim() ? (
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                        <FileText className="h-3 w-3" />Rubric active
                      </span>
                      <button type="button" onClick={() => setShowRubric(true)} className="text-xs text-charcoal/50 hover:text-navy hover:underline">Edit</button>
                      <button type="button" onClick={() => { setRubric(""); setShowRubric(false); }} className="text-xs text-charcoal/40 hover:text-danger">Remove</button>
                    </div>
                  ) : !showRubric ? (
                    <button
                      type="button"
                      onClick={() => setShowRubric(true)}
                      className="flex items-center gap-2 rounded-input border border-dashed border-accent/40 bg-accent/4 px-3 py-2 text-xs text-charcoal/60 transition hover:border-accent hover:text-navy"
                    >
                      <FileText className="h-3.5 w-3.5 text-accent" />
                      + Add rubric / assignment brief
                    </button>
                  ) : (
                    <div className="rounded-input border border-accent/30 bg-accent/5 p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-xs font-semibold text-navy">
                          <FileText className="h-3.5 w-3.5 text-accent" />Rubric / assignment brief
                        </span>
                        <div className="flex items-center gap-2">
                          <select
                            value=""
                            onChange={(e) => { if (e.target.value) setRubric(e.target.value); }}
                            className="rounded border border-border-base bg-white px-2 py-0.5 text-xs text-charcoal/70 outline-none transition focus:border-accent cursor-pointer"
                          >
                            <option value="">Load template…</option>
                            {RUBRIC_TEMPLATES.map((t) => (
                              <option key={t.label} value={t.value}>{t.label}</option>
                            ))}
                          </select>
                          <button type="button" onClick={() => setShowRubric(false)} className="text-charcoal/40 hover:text-charcoal text-sm">×</button>
                        </div>
                      </div>
                      <textarea
                        value={rubric}
                        onChange={(e) => setRubric(e.target.value)}
                        placeholder={"1. Discuss the causes of the French Revolution\n2. Analyze the social impact\n3. Evaluate economic factors"}
                        rows={4}
                        className="w-full rounded-input border border-border-base bg-white px-3 py-2.5 text-sm leading-6 text-charcoal outline-none transition placeholder:text-charcoal/30 focus:border-accent focus:ring-[3px] focus:ring-accent/15"
                      />
                      <div className="mt-2 flex items-center justify-between">
                        <p className="text-[11px] text-charcoal/45">One criterion per line. Wrex checks each one after analysis.</p>
                        <button type="button" onClick={() => setShowRubric(false)} className="rounded-soft bg-accent px-3 py-1 text-xs font-bold text-navy transition hover:bg-accent-dark">
                          {rubric.trim() ? "Save & close" : "Close"}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                /* Non-Pro: locked rubric row */
                <button
                  type="button"
                  onClick={handleUpgrade}
                  className="flex items-center gap-2 rounded-input border border-dashed border-charcoal/15 bg-mist px-3 py-2 text-xs text-charcoal/40 transition hover:border-accent/40 hover:text-charcoal/60"
                >
                  <Crown className="h-3.5 w-3.5 text-accent-dark" />
                  Add rubric &amp; check criteria — <span className="font-semibold text-accent-dark">Pro feature</span>
                </button>
              )}
            </div>

            {/* ── Word limit wall ─────────────────────────────────────────── */}
            {wordLimitExceeded && !isPro && (
              <div className="mt-4 flex items-center gap-3 rounded-input border border-amber-300 bg-amber-50 px-4 py-3">
                <Crown className="h-4 w-4 shrink-0 text-amber-600" />
                <span className="flex-1 text-xs text-amber-800">
                  <strong>{wordCount - FREE_LIMIT} words over the free limit.</strong>{" "}
                  Pro gives you 2,000 words.{" "}
                  <button type="button" onClick={handleUpgrade} className="font-bold underline hover:no-underline">Upgrade — $9/mo</button>
                  {" or "}
                  <button type="button" onClick={() => setText(text.trim().split(/\s+/).slice(0, FREE_LIMIT).join(" "))} className="underline hover:no-underline">trim to {FREE_LIMIT} words</button>
                </span>
              </div>
            )}

            {error && (
              <p className="mt-4 rounded-input border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
                {error}
              </p>
            )}

            {/* ── Analyze button ───────────────────────────────────────────── */}
            <div className="mt-5 flex items-center gap-4">
              <button
                type="button"
                onClick={onAnalyze}
                disabled={loading || text.trim().length < 10 || wordLimitExceeded}
                title={wordLimitExceeded ? `${isPro ? "Pro" : "Free"} limit: ${wordLimit} words` : undefined}
                className="btn-shine flex items-center gap-2 rounded-soft bg-gradient-to-br from-accent to-accent-dark px-8 py-3 text-base font-bold text-navy shadow-button transition hover:shadow-glow hover:scale-[1.02] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40"
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
                  "Analyze"
                )}
              </button>
              <p className="text-[11px] text-charcoal/35 select-none">
                <kbd className="rounded border border-border-base bg-mist px-1 py-0.5 font-mono text-[10px] text-charcoal/50">⌘</kbd>
                {" + "}
                <kbd className="rounded border border-border-base bg-mist px-1 py-0.5 font-mono text-[10px] text-charcoal/50">↵</kbd>
              </p>
            </div>
          </div>{/* end editor card */}

          {/* ── Editing mode banner ──────────────────────────────────────────── */}
          {results && resultsStale && (
            <div className="flex items-center gap-3 rounded-input border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <span className="flex-1">✏️ You've made changes — re-analyze to see your updated score.</span>
              <button
                type="button"
                onClick={onAnalyze}
                disabled={loading}
                className="shrink-0 inline-flex items-center gap-1.5 rounded-soft bg-amber-400 px-3 py-1.5 text-xs font-bold text-navy transition hover:bg-amber-500 disabled:opacity-50"
              >
                Re-analyze ↑
              </button>
            </div>
          )}

          {/* ── Results panel (below editor) ─────────────────────────────────── */}
          {(results || loading) && (
            <ResultsPanel
              results={results}
              loading={loading}
              isPro={isPro}
              onRubricRewrite={handleRubricRewriteNudge}
              onUpgrade={handleUpgrade}
              text={text}
              accessToken={accessToken}
              onReplaceSentence={handleReplaceSentence}
              quota={null}
              onAuthRequired={onAuthRequired}
              resultsStale={false}
            />
          )}

          {/* ── Pro AI panel ─────────────────────────────────────────────── */}
          {results && (
          <div ref={proPanelRef} className="rounded-modal border border-border-base bg-white p-5 shadow-soft sm:p-6">
            {/* Header row — tappable on mobile to collapse/expand */}
            <div
              className="flex cursor-pointer items-center justify-between lg:cursor-default"
              onClick={() => setProCollapsed((v) => !v)}
            >
              <div className="flex items-center gap-2">
                <Crown className="h-4 w-4 text-accent" />
                <h3 className="font-heading text-base font-semibold text-navy">Pro writing tools</h3>
              </div>
              <div className="flex items-center gap-3">
                {/* Tab switcher — only when expanded AND pro */}
                {isPro && !proCollapsed && (
                  <div
                    className="flex rounded-input border border-border-base text-sm"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {(["improve", "humanize", "rubric-rewrite"] as const).map((tab) => {
                      const labels: Record<string, { short: string; full: string }> = {
                        improve: { short: "✦", full: "Improve" },
                        humanize: { short: "~", full: "Humanize" },
                        "rubric-rewrite": { short: "✎", full: "Rewrite" },
                      };
                      return (
                        <button
                          key={tab}
                          type="button"
                          onClick={() => switchProTab(tab)}
                          className={`px-3 py-1.5 font-medium transition first:rounded-l-input last:rounded-r-input sm:px-4 ${
                            proTab === tab ? "bg-navy text-white" : "text-charcoal/60 hover:bg-mist"
                          }`}
                        >
                          <span className="sm:hidden">{labels[tab].short}</span>
                          <span className="hidden sm:inline">{labels[tab].full}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
                {/* Chevron — only on mobile */}
                <svg
                  className={`h-4 w-4 shrink-0 text-charcoal/40 transition-transform lg:hidden ${proCollapsed ? "" : "rotate-180"}`}
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
            </div>

            {/* Collapsible body — hidden on mobile when collapsed */}
            {!proCollapsed && (!isPro ? (
              /* ── Locked state for free users ─────────────────────────────── */
              <div className="mt-5 overflow-hidden rounded-modal border border-accent/25 bg-gradient-to-br from-accent/6 to-accent/3">
                {/* Feature preview grid */}
                <div className="grid grid-cols-2 gap-px bg-accent/15">
                  {[
                    { icon: <Sparkles className="h-4 w-4 text-accent-dark" />, label: "Make it yours", sub: "Rewrite any sentence in your voice" },
                    { icon: <FileText className="h-4 w-4 text-accent-dark" />, label: "Voice transform", sub: "Natural, Academic, Speech & more" },
                    { icon: <Crown className="h-4 w-4 text-accent-dark" />, label: "Tone templates", sub: "5 distinct writing voices" },
                    { icon: <Users className="h-4 w-4 text-accent-dark" />, label: "Rubric alignment", sub: "Rewrite to hit every criterion" },
                  ].map(({ icon, label, sub }) => (
                    <div key={label} className="flex items-start gap-2.5 bg-white/60 px-3.5 py-3">
                      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/15">{icon}</div>
                      <div>
                        <p className="text-xs font-semibold text-navy">{label}</p>
                        <p className="text-[11px] text-charcoal/55">{sub}</p>
                      </div>
                    </div>
                  ))}
                </div>
                {/* CTA footer */}
                <div className="flex items-center justify-between px-4 py-3.5">
                  <p className="text-xs text-charcoal/55">
                    From <span className="font-bold text-navy">$9 / month</span> · cancel anytime
                  </p>
                  <button
                    type="button"
                    onClick={handleUpgrade}
                    className="btn-shine inline-flex items-center gap-1.5 rounded-soft bg-gradient-to-br from-accent to-accent-dark px-5 py-2 text-xs font-bold text-navy shadow-button transition hover:shadow-glow hover:scale-[1.02] active:scale-[0.97]"
                  >
                    <Crown className="h-3.5 w-3.5" />Upgrade to Pro
                  </button>
                </div>
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
                        ) : <span className="flex items-center gap-2"><Sparkles className="h-3.5 w-3.5" />Get improvement suggestions</span>}
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
                              <div className="flex shrink-0 gap-2">
                                <button
                                  type="button"
                                  onClick={() => void navigator.clipboard.writeText(s.rewrite)}
                                  className="rounded bg-white px-2 py-0.5 text-[11px] font-medium text-charcoal/50 shadow-sm transition hover:text-navy hover:shadow"
                                >
                                  Copy
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleReplaceSentence(s.sentence, s.rewrite);
                                    toast("Sentence accepted ✓", "success");
                                  }}
                                  className="btn-shine rounded-soft bg-gradient-to-br from-emerald-500 to-emerald-600 px-2.5 py-0.5 text-[11px] font-bold text-white shadow-sm transition hover:opacity-90"
                                >
                                  ✓ Accept
                                </button>
                              </div>
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
                    <p className="mb-3 text-sm text-charcoal/65">
                      Rewrite your text in a chosen voice — make it sound like you.
                    </p>

                    {/* ── Tone picker ───────────────────────────────────── */}
                    <div className="mb-4">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-charcoal/45">Tone</p>
                      <div className="flex flex-wrap gap-2">
                        {TONE_OPTIONS.map((t) => (
                          <button
                            key={t.value}
                            type="button"
                            title={t.desc}
                            onClick={() => { setTone(t.value); setHumanizeResult(null); }}
                            className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition ${
                              tone === t.value
                                ? "border-accent bg-accent/15 text-navy"
                                : "border-border-base bg-white text-charcoal/60 hover:border-accent/60 hover:text-navy"
                            }`}
                          >
                            <span>{t.emoji}</span>
                            {t.label}
                          </button>
                        ))}
                      </div>
                      {/* Tone description */}
                      <p className="mt-1.5 text-[11px] text-charcoal/40">
                        {TONE_OPTIONS.find((t) => t.value === tone)?.desc}
                      </p>
                    </div>

                    {!humanizeResult && (
                      <button
                        type="button"
                        onClick={runProHumanize}
                        disabled={proLoading}
                        className="btn-shine flex items-center gap-2 rounded-soft bg-gradient-to-br from-accent to-accent-dark px-5 py-2.5 text-sm font-bold text-navy shadow-button transition hover:shadow-glow hover:scale-[1.02] active:scale-[0.97] disabled:opacity-40"
                      >
                        {proLoading ? (
                          <><svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/></svg>Rewriting…</>
                        ) : (
                          <span className="flex items-center gap-2">
                            <Users className="h-3.5 w-3.5" />
                            Rewrite as {TONE_OPTIONS.find((t) => t.value === tone)?.label}
                          </span>
                        )}
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
                                setResultsStale(true);
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
                            ) : <span className="flex items-center gap-2"><FileText className="h-3.5 w-3.5" />Rewrite to rubric</span>}
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
                                    setResultsStale(true);
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
            ))}
          </div>
        )}

          {/* ── History panel — landing page only ───────────────────────── */}
          {!workspace && accessToken && (
            <HistoryPanel
              submissions={history}
              accessToken={accessToken}
              loading={historyLoading}
              onSelect={loadFromHistory}
              onRefresh={fetchHistory}
            />
          )}
        </div>{/* end vertical stack */}
      </div>
    </section>
  );
}

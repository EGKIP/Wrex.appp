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
  loadRequest?: { text: string; rubric: string | null } | null;
  onLoadRequestConsumed?: () => void;
}

export function AnalyzerSection({ accessToken, isPro = false, onQuotaUpdate, onAuthRequired, onUpgrade, workspace = false, externalHistory, externalHistoryLoading, onAnalyzed, loadRequest, onLoadRequestConsumed }: AnalyzerSectionProps) {
  const { toast } = useToast();
  const [text, setText] = useState(() => workspace ? "" : SAMPLE_TEXT);
  const [rubric, setRubric] = useState("");
  const [showRubric, setShowRubric] = useState(false);
  const [results, setResults] = useState<AnalyzeResponse | null>(null);
  const [resultsStale, setResultsStale] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [quotaHit, setQuotaHit] = useState<"anon" | "auth" | null>(null);
  const [quota, setQuota] = useState<QuotaInfo | null>(null);
  const [resetCountdown, setResetCountdown] = useState("");
  // In workspace mode, history is managed by the parent (App.tsx) and passed in as props.
  // In landing page mode, we manage it locally.
  const [internalHistory, setInternalHistory] = useState<SubmissionRecord[]>([]);
  const [internalHistoryLoading, setInternalHistoryLoading] = useState(false);
  const history = workspace && externalHistory !== undefined ? externalHistory : internalHistory;
  const historyLoading = workspace && externalHistoryLoading !== undefined ? externalHistoryLoading : internalHistoryLoading;
  const [showRubricNudge, setShowRubricNudge] = useState(false);

  // ── Resizable split panel ──────────────────────────────────────────────────
  const containerRef = useRef<HTMLDivElement>(null);
  const [splitRatio, setSplitRatio] = useState(workspace ? 0.58 : 0.52);
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartRatio = useRef(0);

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

  // ── Rubric nudge — shown once per session after 2 s ──────────────────────
  useEffect(() => {
    if (sessionStorage.getItem("wrex_rubric_nudge_seen")) return;
    const show = setTimeout(() => setShowRubricNudge(true), 2000);
    const hide = setTimeout(() => {
      setShowRubricNudge(false);
      sessionStorage.setItem("wrex_rubric_nudge_seen", "1");
    }, 10000);
    return () => { clearTimeout(show); clearTimeout(hide); };
  }, []);

  function dismissNudge() {
    setShowRubricNudge(false);
    sessionStorage.setItem("wrex_rubric_nudge_seen", "1");
  }

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

  // ── Drag-to-resize split panel ─────────────────────────────────────────────
  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!isDragging.current || !containerRef.current) return;
      const w = containerRef.current.offsetWidth;
      const delta = e.clientX - dragStartX.current;
      setSplitRatio(Math.min(0.80, Math.max(0.28, dragStartRatio.current + delta / w)));
    }
    function onUp() {
      isDragging.current = false;
      document.body.style.cursor = "";
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
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
      setQuota(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  // Keep the ref in sync with the latest closure every render (used by Cmd+Enter)
  useEffect(() => {
    onAnalyzeRef.current = onAnalyze;
  });

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
      setResultsStale(false);
      // Expand right panel so results are front-and-centre; editor shrinks to a reference column
      setSplitRatio(workspace ? 0.32 : 0.36);
      if (response.quota) {
        onQuotaUpdate?.(response.quota);
        setQuota(response.quota);
      }

      // Toast + history refresh on successful save
      if (accessToken) {
        toast("Analysis saved to your history ✓", "success");
        if (workspace && onAnalyzed) {
          onAnalyzed(); // parent refreshes history in workspace mode
        } else {
          void fetchHistory();
        }
      }

      // Anon trial done — inline nudge in ResultsPanel handles sign-up; no modal here
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
      <div className="mx-auto w-full max-w-7xl">
        {!workspace && (
          <div className="mx-auto mb-10 max-w-xl text-center">
            <h2 className="text-[1.75rem] font-bold tracking-tight text-navy lg:text-[2.25rem]">
              Try it now
            </h2>
            <p className="mt-2 text-sm text-charcoal/60">
              Free — no account needed for your first analysis.
            </p>
          </div>
        )}

        {/* Two-column layout — stacked on mobile, draggable side-by-side on lg+ */}
        <div ref={containerRef} className="flex flex-col gap-6 lg:flex-row lg:gap-0 lg:items-start">
          {/* Left column — editor */}
          <div
            className="w-full lg:flex-shrink-0"
            style={{ flexBasis: `${splitRatio * 100}%` }}
          >
          <div className={`rounded-modal border border-border-base bg-white shadow-soft ${workspace ? "p-4 sm:p-5" : "p-6 sm:p-8"}`}>
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



            {/* ── Rubric section (below textarea) ─────────────────────────── */}
            <div className="mt-4">
              {/* Collapsed: rubric has content */}
              {!showRubric && rubric.trim() && (
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                    <FileText className="h-3 w-3" />
                    Rubric active
                  </span>
                  <button type="button" onClick={() => setShowRubric(true)} className="text-xs text-charcoal/50 transition hover:text-navy hover:underline">Edit</button>
                  <button type="button" onClick={() => { setRubric(""); setShowRubric(false); }} className="text-xs text-charcoal/40 transition hover:text-danger" aria-label="Remove rubric">Remove</button>
                </div>
              )}

              {/* Collapsed: no rubric → inline nudge banner */}
              {!showRubric && !rubric.trim() && (
                <div className="flex items-center gap-3 rounded-input border border-dashed border-accent/30 bg-accent/4 px-3 py-2.5">
                  <Sparkles className="h-3.5 w-3.5 shrink-0 text-accent" />
                  <p className="flex-1 text-xs text-charcoal/60">
                    <span className="font-semibold text-navy">Got a rubric?</span> Add it and Wrex checks every criterion — then rewrites to hit them all.
                  </p>
                  <button
                    type="button"
                    onClick={() => { setShowRubric(true); dismissNudge(); }}
                    className="shrink-0 inline-flex items-center gap-1 rounded-full border border-accent/40 bg-white px-3 py-1 text-xs font-semibold text-navy transition hover:border-accent hover:shadow-soft"
                  >
                    <FileText className="h-3 w-3" />+ Add rubric
                  </button>
                </div>
              )}

              {/* Expanded rubric textarea */}
              {showRubric && (
                <div className="rounded-input border border-accent/30 bg-accent/5 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-navy">
                      <FileText className="h-3.5 w-3.5 text-accent" />
                      Rubric / assignment brief
                    </span>
                    <div className="flex items-center gap-2">
                      <select
                        value=""
                        onChange={(e) => { if (e.target.value) setRubric(e.target.value); }}
                        className="rounded border border-border-base bg-white px-2 py-0.5 text-xs text-charcoal/70 outline-none transition focus:border-accent focus:ring-[2px] focus:ring-accent/15 cursor-pointer"
                      >
                        <option value="">Load template…</option>
                        {RUBRIC_TEMPLATES.map((t) => (
                          <option key={t.label} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                      <button type="button" onClick={() => setShowRubric(false)} className="rounded-full p-0.5 text-charcoal/40 transition hover:text-charcoal" aria-label="Collapse rubric">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3.5 3.5l7 7M10.5 3.5l-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                      </button>
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
                    <p className="text-[11px] text-charcoal/45">One criterion per line. Wrex checks each one.</p>
                    <button type="button" onClick={() => setShowRubric(false)} className="rounded-soft bg-accent px-3 py-1 text-xs font-bold text-navy transition hover:bg-accent-dark">
                      {rubric.trim() ? "Save & close" : "Close"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* ── Quota wall: anonymous hit limit ─────────────────────────── */}
            {quotaHit === "anon" && (
              <div className="mt-4 overflow-hidden rounded-modal border border-accent/30 bg-gradient-to-br from-accent/8 to-accent/4 shadow-soft">
                <div className="flex items-start gap-3 px-4 py-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/20">
                    <Crown className="h-4 w-4 text-accent-dark" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-navy">Free analysis used for today</p>
                    <p className="mt-0.5 text-xs text-charcoal/65">
                      Create a free account to unlock <strong>3 analyses/day</strong> — no credit card needed.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={onAuthRequired}
                        className="btn-shine inline-flex items-center gap-1.5 rounded-soft bg-gradient-to-br from-accent to-accent-dark px-4 py-2 text-xs font-bold text-navy shadow-button transition hover:shadow-glow hover:scale-[1.02] active:scale-[0.97]"
                      >
                        <Sparkles className="h-3 w-3" />Sign up free
                      </button>
                      <button
                        type="button"
                        onClick={handleUpgrade}
                        className="inline-flex items-center gap-1.5 rounded-soft border border-accent/40 bg-white px-4 py-2 text-xs font-semibold text-navy transition hover:border-accent hover:shadow-soft"
                      >
                        <Crown className="h-3 w-3 text-accent-dark" />Go Pro — $9/mo
                      </button>
                    </div>
                  </div>
                </div>
                {/* Pro benefits strip */}
                <div className="flex items-center gap-4 border-t border-accent/15 bg-white/50 px-4 py-2.5 text-[11px] text-charcoal/55">
                  {["3 → ∞ analyses", "4× word limit", "Tone templates", "AI rewrites"].map((b) => (
                    <span key={b} className="flex items-center gap-1"><span className="text-accent font-bold">✓</span>{b}</span>
                  ))}
                </div>
              </div>
            )}

            {/* ── Quota wall: logged-in free user hit daily limit ──────────── */}
            {quotaHit === "auth" && !isPro && (
              <div className="mt-4 overflow-hidden rounded-modal border border-accent/30 bg-gradient-to-br from-accent/8 to-accent/4 shadow-soft">
                <div className="flex items-start gap-3 px-4 py-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/20">
                    <Crown className="h-4 w-4 text-accent-dark" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-navy">Daily limit reached (3 / 3)</p>
                    <p className="mt-0.5 text-xs text-charcoal/65">
                      Upgrade to Pro for <strong>unlimited analyses</strong>, 4× word limit, and tone rewrites.
                    </p>
                    <button
                      type="button"
                      onClick={handleUpgrade}
                      className="btn-shine mt-3 inline-flex items-center gap-1.5 rounded-soft bg-gradient-to-br from-accent to-accent-dark px-5 py-2 text-xs font-bold text-navy shadow-button transition hover:shadow-glow hover:scale-[1.02] active:scale-[0.97]"
                    >
                      <Crown className="h-3.5 w-3.5" />Upgrade to Pro — $9/month
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-4 border-t border-accent/15 bg-white/50 px-4 py-2.5 text-[11px] text-charcoal/55">
                  {["Unlimited analyses", "2,000 words", "5 tone templates", "GPT-4o rewrites"].map((b) => (
                    <span key={b} className="flex items-center gap-1"><span className="text-accent font-bold">✓</span>{b}</span>
                  ))}
                </div>
              </div>
            )}
            {error ? (
              <p className="mt-4 rounded-input border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
                {error}
              </p>
            ) : null}

            {/* ── Word limit wall ─────────────────────────────────────────── */}
            {wordLimitExceeded && !isPro && (
              <div className="mt-4 overflow-hidden rounded-modal border border-amber-300 bg-amber-50 shadow-soft">
                <div className="flex items-start gap-3 px-4 py-3.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-200">
                    <Crown className="h-3.5 w-3.5 text-amber-700" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-navy">
                      {wordCount - FREE_LIMIT} words over the free limit
                    </p>
                    <p className="mt-0.5 text-xs text-charcoal/65">
                      Pro gives you <strong>{PRO_LIMIT.toLocaleString()} words</strong> — that's 4× more space to write.
                    </p>
                    <div className="mt-2.5 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={handleUpgrade}
                        className="btn-shine inline-flex items-center gap-1.5 rounded-soft bg-gradient-to-br from-accent to-accent-dark px-4 py-1.5 text-xs font-bold text-navy shadow-button transition hover:shadow-glow hover:scale-[1.02]"
                      >
                        <Crown className="h-3 w-3" />Upgrade — $9/mo
                      </button>
                      <button
                        type="button"
                        onClick={() => setText(text.trim().split(/\s+/).slice(0, FREE_LIMIT).join(" "))}
                        className="inline-flex items-center rounded-soft border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-charcoal/60 transition hover:text-charcoal"
                      >
                        Trim to {FREE_LIMIT} words
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Hard quota block — 0 analyses left ──────────────────────── */}
            {accessToken && !isPro && quota?.remaining === 0 ? (
              <div className="mt-6 overflow-hidden rounded-modal border border-accent/30 bg-gradient-to-br from-accent/8 to-accent/4 px-4 py-4 shadow-soft">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-navy">0 analyses left today</p>
                    <p className="mt-0.5 text-xs text-charcoal/55 tabular-nums">
                      Resets in <span className="font-semibold text-charcoal/75">{resetCountdown}</span>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleUpgrade}
                    className="btn-shine shrink-0 inline-flex items-center gap-1.5 rounded-soft bg-gradient-to-br from-accent to-accent-dark px-4 py-2 text-xs font-bold text-navy shadow-button transition hover:shadow-glow hover:scale-[1.02]"
                  >
                    <Crown className="h-3.5 w-3.5" />Go Pro
                  </button>
                </div>
                {/* Disabled analyze button below */}
                <button
                  type="button"
                  disabled
                  className="mt-3 flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-soft bg-charcoal/10 py-3 text-sm font-bold text-charcoal/35"
                >
                  <svg className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
                  </svg>
                  Analyze locked — limit reached
                </button>
              </div>
            ) : (
              <div className="mt-6 space-y-2">
                <div className="flex flex-wrap items-center gap-4">
                  <button
                    type="button"
                    onClick={onAnalyze}
                    disabled={loading || text.trim().length < 10 || wordLimitExceeded}
                    title={wordLimitExceeded ? `${isPro ? "Pro" : "Free"} limit: ${wordLimit} words` : undefined}
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
                <p className="text-[11px] text-charcoal/35 select-none">
                  <kbd className="rounded border border-border-base bg-mist px-1 py-0.5 font-mono text-[10px] text-charcoal/50">⌘</kbd>
                  {" + "}
                  <kbd className="rounded border border-border-base bg-mist px-1 py-0.5 font-mono text-[10px] text-charcoal/50">↵</kbd>
                  {" to analyze"}
                </p>
              </div>
            )}
          </div>
          </div>{/* end left column wrapper */}

          {/* Drag handle — desktop only */}
          <div
            className="hidden lg:flex w-5 shrink-0 self-stretch cursor-col-resize items-center justify-center group select-none"
            onMouseDown={(e) => {
              e.preventDefault();
              isDragging.current = true;
              dragStartX.current = e.clientX;
              dragStartRatio.current = splitRatio;
              document.body.style.cursor = "col-resize";
            }}
          >
            <div className="h-16 w-0.5 rounded-full bg-border-base transition-colors group-hover:bg-accent/50" />
          </div>

          {/* Right column — sticky in workspace mode */}
          <div className={`flex-1 min-w-0 ${workspace ? "sticky top-6" : ""}`}>
            <ResultsPanel results={results} loading={loading} isPro={isPro} onRubricRewrite={handleRubricRewriteNudge} onUpgrade={handleUpgrade} text={text} accessToken={accessToken} onReplaceSentence={handleReplaceSentence} quota={quota} onAuthRequired={onAuthRequired} resultsStale={resultsStale} />
          </div>
        </div>{/* end flex split */}

        {/* Pro AI panel */}
        {results && (
          <div ref={proPanelRef} className="mt-8 rounded-modal border border-border-base bg-white p-6 shadow-soft sm:p-8">
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
                    { icon: <Sparkles className="h-4 w-4 text-accent-dark" />, label: "Sentence rewrites", sub: "Fix flagged sentences one-by-one" },
                    { icon: <FileText className="h-4 w-4 text-accent-dark" />, label: "Full humanize", sub: "Natural, Academic, Speech & more" },
                    { icon: <Crown className="h-4 w-4 text-accent-dark" />, label: "Tone templates", sub: "5 distinct writing voices" },
                    { icon: <Users className="h-4 w-4 text-accent-dark" />, label: "Rubric alignment", sub: "Rewrite to match your rubric" },
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
                      Rewrite your text in a chosen voice — reducing detectable AI patterns.
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

        {/* History panel — only on landing page; workspace shows it in the sidebar */}
        {!workspace && accessToken && (
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

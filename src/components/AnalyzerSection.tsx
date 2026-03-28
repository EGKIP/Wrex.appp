import { useState } from "react";
import { analyzeText } from "../lib/api";
import type { AnalyzeResponse } from "../types";
import { ResultsPanel } from "./ResultsPanel";

const SAMPLE_TEXT = `In today's academic environment, technology has become an increasingly important part of how students learn and communicate. Moreover, it offers convenience and efficiency in many different contexts. However, it is also important to think carefully about how writing can remain personal, specific, and grounded in real understanding.`;

function countWords(text: string) {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

export function AnalyzerSection() {
  const [text, setText] = useState(SAMPLE_TEXT);
  const [rubric, setRubric] = useState("");
  const [showRubric, setShowRubric] = useState(false);
  const [results, setResults] = useState<AnalyzeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const wordCount = countWords(text);

  async function onAnalyze() {
    setLoading(true);
    setError("");

    try {
      const response = await analyzeText(text, showRubric && rubric.trim() ? rubric : undefined);
      setResults(response);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to analyze this text right now.",
      );
    } finally {
      setLoading(false);
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
            <div className="mt-2 flex items-center text-xs text-charcoal/40">
              <span>{wordCount} words</span>
            </div>

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
                  <p className="mb-2 text-xs text-charcoal/50">
                    Paste your marking criteria — one requirement per line.
                  </p>
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

            {error ? (
              <p className="mt-4 rounded-input border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
                {error}
              </p>
            ) : null}

            <div className="mt-6">
              <button
                type="button"
                onClick={onAnalyze}
                disabled={loading}
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
            </div>
          </div>

          <ResultsPanel results={results} loading={loading} />
        </div>
      </div>
    </section>
  );
}

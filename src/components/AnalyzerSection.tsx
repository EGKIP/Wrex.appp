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
    <section
      id="analyzer"
      className="relative px-6 py-16 lg:px-10 lg:py-20"
      style={{
        background: "#0F172A",
        borderRadius: "48px 48px 0 0",
        marginTop: "0",
      }}
    >
      {/* Top accent line */}
      <div
        className="absolute left-1/2 top-0 h-[2px] w-[50%] -translate-x-1/2"
        style={{ background: "linear-gradient(90deg, transparent, #FBBF24, transparent)" }}
      />

      <div className="mx-auto max-w-7xl">
        <div className="mx-auto mb-10 max-w-xl text-center">
          <h2 className="font-heading text-[1.75rem] font-bold tracking-tight text-white lg:text-[2.25rem]">
            Try it now
          </h2>
          <p className="mt-2 text-sm text-white/50">
            Free — no account needed for your first analysis.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          {/* Input card */}
          <div className="rounded-modal border border-white/10 bg-white/[0.04] p-6 backdrop-blur-sm sm:p-8">
            {/* Draft input */}
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-white/80">Your writing</p>
              <button
                type="button"
                onClick={() => setText("")}
                className="text-xs text-white/40 transition hover:text-white/70 hover:underline"
              >
                Clear
              </button>
            </div>

            <div className="gradient-border-wrap mt-3">
              <textarea
                value={text}
                onChange={(event) => setText(event.target.value)}
                placeholder="Paste your text here to analyze..."
                className="min-h-[300px] w-full bg-[#0F172A] px-4 py-3 text-base leading-7 text-white/90 placeholder:text-white/25 focus:outline-none focus:ring-0"
              />
            </div>
            <div className="mt-2 flex items-center text-xs text-white/35">
              <span>{wordCount} words</span>
            </div>

            {/* Rubric toggle */}
            <div className="mt-5 border-t border-white/10 pt-5">
              <button
                type="button"
                onClick={() => setShowRubric((v) => !v)}
                className="flex items-center gap-2 text-sm font-medium text-white/70 transition hover:text-white"
              >
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition ${
                    showRubric ? "border-accent bg-accent" : "border-white/30"
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
                  <p className="mb-2 text-xs text-white/40">
                    Paste your marking criteria — one requirement per line.
                  </p>
                  <textarea
                    value={rubric}
                    onChange={(e) => setRubric(e.target.value)}
                    placeholder={"1. Discuss the causes of the French Revolution\n2. Analyze the social impact\n3. Evaluate economic factors"}
                    rows={5}
                    className="w-full rounded-input border border-white/15 bg-white/5 px-4 py-3 text-sm leading-7 text-white/85 outline-none transition placeholder:text-white/25 focus:border-accent/50 focus:ring-[3px] focus:ring-accent/10"
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

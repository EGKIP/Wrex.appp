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
  const [results, setResults] = useState<AnalyzeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const wordCount = countWords(text);
  const characterCount = text.length;

  async function onAnalyze() {
    setLoading(true);
    setError("");

    try {
      const response = await analyzeText(text);
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
    <section id="analyzer" className="mx-auto max-w-7xl px-6 py-16 lg:px-10 lg:py-20">
      <div className="mx-auto mb-10 max-w-xl text-center">
        <h2 className="text-3xl font-semibold tracking-tight text-navy">Try it now</h2>
        <p className="mt-2 text-sm text-charcoal/55">
          Free — no account needed for your first analysis.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-[2rem] border border-navy/10 bg-white p-6 shadow-soft sm:p-8">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-charcoal/50">Your writing</p>
            <button
              type="button"
              onClick={() => setText("")}
              className="text-xs text-charcoal/40 transition hover:text-navy"
            >
              Clear
            </button>
          </div>
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Paste your draft here…"
            className="mt-3 min-h-[320px] w-full rounded-soft border border-navy/10 bg-mist px-5 py-4 text-base leading-7 text-charcoal outline-none transition placeholder:text-charcoal/35 focus:border-accent focus:ring-2 focus:ring-accent/40"
          />
          <div className="mt-2 flex items-center justify-between text-xs text-charcoal/40">
            <span>{wordCount} words</span>
            <span>For study use only</span>
          </div>
          {error ? (
            <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-charcoal">
              {error}
            </p>
          ) : null}
          <div className="mt-5">
            <button
              type="button"
              onClick={onAnalyze}
              disabled={loading}
              className="flex items-center gap-2 rounded-2xl bg-navy px-6 py-3 text-sm font-semibold text-white transition hover:bg-navy/95 disabled:cursor-not-allowed disabled:bg-navy/60"
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
                "Analyze my writing"
              )}
            </button>
          </div>
        </div>
        <ResultsPanel results={results} loading={loading} />
      </div>
    </section>
  );
}

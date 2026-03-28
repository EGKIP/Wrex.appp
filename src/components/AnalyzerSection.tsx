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
    <section id="analyzer" className="mx-auto max-w-7xl px-6 py-10 lg:px-10 lg:py-16">
      <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-[2rem] border border-navy/10 bg-white p-6 shadow-soft sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-charcoal/45">
                Free detector
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-navy">
                Review writing for AI-associated patterns
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setText("")}
              className="text-sm text-charcoal/55 transition hover:text-navy"
            >
              Clear
            </button>
          </div>
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Paste writing here to review sentence patterns, consistency, and phrasing."
            className="mt-6 min-h-[320px] w-full rounded-soft border border-navy/10 bg-mist px-5 py-4 text-base leading-7 text-charcoal outline-none transition placeholder:text-charcoal/35 focus:border-accent focus:ring-2 focus:ring-accent/40"
          />
          <div className="mt-4 flex flex-wrap items-center justify-between gap-4 text-sm text-charcoal/65">
            <div className="flex flex-wrap gap-4">
              <span>{wordCount} words</span>
              <span>{characterCount} characters</span>
            </div>
            <p>Results are probabilistic and for educational use.</p>
          </div>
          {error ? (
            <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-charcoal">
              {error}
            </p>
          ) : null}
          <div className="mt-6 flex flex-wrap items-center gap-4">
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
                "Analyze Writing"
              )}
            </button>
            <p className="max-w-sm text-sm text-charcoal/65">
              Rubric alignment and humanizing guidance coming in Pro.{" "}
              <a href="#waitlist" className="font-medium text-navy underline underline-offset-2">
                Join the waitlist.
              </a>
            </p>
          </div>
        </div>
        <ResultsPanel results={results} loading={loading} />
      </div>
    </section>
  );
}

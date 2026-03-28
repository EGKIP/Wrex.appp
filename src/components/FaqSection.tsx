import { useState } from "react";

const FAQS = [
  {
    q: "Is it free?",
    a: "Yes. Your first analysis is completely free — no account, no credit card. Create a free account to get 3 analyses per day, every day.",
  },
  {
    q: "How does Wrex actually analyze my writing?",
    a: "Wrex uses pattern recognition trained on large language model outputs to score your writing sentence by sentence. It looks at sentence length variance, vocabulary diversity, repetition patterns, and phrasing consistency — the same signals that AI detectors flag. It does not send your writing to a third party for grading.",
  },
  {
    q: "What is rubric alignment?",
    a: "Rubric alignment lets you paste your assignment brief or marking criteria alongside your draft. Wrex then maps each criterion to your writing and shows you which points you've covered, which are thin, and which are missing entirely — before you submit. This is a Pro feature, coming soon.",
  },
  {
    q: "Will this get me in trouble?",
    a: "No. Wrex results are for your personal study use only. They are probabilistic indicators, not proof of anything. They carry no academic weight and are not admissible as evidence of AI use. Wrex is a revision tool, not a reporting tool.",
  },
  {
    q: "What's the difference between free and Pro?",
    a: "Free gives you AI pattern detection, sentence-level flags, and writing tips — 3 times per day. Pro adds rubric alignment, gap detection, paragraph-level rewrite suggestions, and humanizing support. Pro is $8/month for students, $12/month otherwise.",
  },
  {
    q: "Does Wrex store my writing?",
    a: "Your writing is analyzed in the moment and not stored permanently. We do not use your submissions to train models or share them with third parties.",
  },
];

export function FaqSection() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section id="faq" className="mx-auto max-w-7xl px-6 py-16 lg:px-10 lg:py-20">
      <div className="mx-auto max-w-2xl">
        <h2 className="text-3xl font-semibold tracking-tight text-navy">
          Questions
        </h2>
        <p className="mt-2 text-sm text-charcoal/55">
          Everything you'd want to know before you paste anything.
        </p>

        <div className="mt-10 divide-y divide-navy/8">
          {FAQS.map((faq, i) => (
            <div key={faq.q} className="py-5">
              <button
                type="button"
                onClick={() => setOpen(open === i ? null : i)}
                className="flex w-full items-center justify-between gap-4 text-left"
              >
                <span className="text-base font-medium text-navy">{faq.q}</span>
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  className={`shrink-0 text-charcoal/40 transition-transform ${open === i ? "rotate-180" : ""}`}
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
              {open === i && (
                <p className="mt-3 max-w-xl text-sm leading-7 text-charcoal/70">
                  {faq.a}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}


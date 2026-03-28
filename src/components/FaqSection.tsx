import { useState } from "react";

const FAQS = [
  {
    q: "Is it free?",
    a: "Yes. Your first analysis is completely free — no account, no credit card. Create a free account to get 3 analyses per day, every day.",
  },
  {
    q: "How does Wrex analyze my writing?",
    a: "Wrex reads your draft sentence by sentence — looking at how consistent your sentence lengths are, how varied your vocabulary is, how often you repeat phrases, and which transition words you use. It's the same kind of pattern scan your reader would do intuitively. Nothing is sent to a third party.",
  },
  {
    q: "What is rubric alignment?",
    a: "Paste your assignment brief or marking criteria alongside your draft and Wrex maps each requirement to what you've written. You see which points are covered, which are thin, and which you missed — before you submit.",
  },
  {
    q: "Will my school see this?",
    a: "No. Wrex is a private revision tool. It has no connection to your school, your submission portal, or your professor. Nothing you paste here is shared with anyone.",
  },
  {
    q: "What's the difference between free and Pro?",
    a: "Free gives you AI-pattern detection, sentence-level flags, rubric alignment, and writing tips — 3 times per day. Pro adds deeper gap detection, paragraph-level rewrite suggestions, and humanizing support. Pro is $8/month for students.",
  },
  {
    q: "Does Wrex store my writing?",
    a: "Your writing is analyzed in the moment and not stored permanently. We do not use your submissions to train models or share them with third parties.",
  },
];

export function FaqSection() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section id="faq" className="bg-white px-6 py-16 lg:px-10 lg:py-20">
      <div className="mx-auto max-w-2xl">
        <h2 className="text-[1.75rem] font-bold tracking-tight text-navy lg:text-[2rem]">
          Questions
        </h2>
        <p className="mt-2 text-sm text-charcoal/65">
          Everything you'd want to know before you paste anything.
        </p>

        <div className="mt-10 divide-y divide-border-base">
          {FAQS.map((faq, i) => (
            <div key={faq.q} className="py-5">
              <button
                type="button"
                onClick={() => setOpen(open === i ? null : i)}
                className="flex w-full items-center justify-between gap-4 text-left transition hover:text-navy"
              >
                <span className="text-base font-semibold text-navy">{faq.q}</span>
                <svg
                  width="18" height="18" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                  className={`shrink-0 text-charcoal/40 transition-transform ${open === i ? "rotate-180" : ""}`}
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
              {open === i && (
                <p className="mt-3 max-w-xl text-sm leading-7 text-charcoal/75">
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


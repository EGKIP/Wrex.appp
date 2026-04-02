import { useEffect, useRef, useState } from "react";

const FAQS = [
  {
    q: "Is it free?",
    a: "Yes. You get 1 analysis free without any account. Create a free account to get 3 analyses per day, every day — no credit card needed.",
  },
  {
    q: "How does Wrex analyze my writing?",
    a: "Wrex reads your draft sentence by sentence — checking sentence-length consistency, vocabulary variety, phrase repetition, and transition word patterns. It's the same intuitive scan a careful reader would do. Your text is processed securely and never shared with third parties.",
  },
  {
    q: "What is rubric alignment?",
    a: "Paste your assignment brief or marking criteria alongside your draft and Wrex maps each requirement to what you've written. You see which points are well-covered, which are thin, and which you've missed — before you submit.",
  },
  {
    q: "Will my school see this?",
    a: "No. Wrex is a private revision tool. It has no connection to your school, submission portal, or professor. Nothing you paste here is ever shared with anyone.",
  },
  {
    q: "What's the difference between free and Pro?",
    a: "Free gives you AI-pattern detection, sentence-level flags, rubric alignment, and writing tips — up to 500 words, 3 times per day. Pro unlocks sentence-by-sentence rewrites, full humanize with 5 tone templates, deeper rubric gap detection, 2,000 words per analysis, and unlimited daily analyses — for $9/month.",
  },
  {
    q: "Does Wrex store my writing?",
    a: "Logged-in users get a history panel showing past analyses so you can reload previous drafts. We do not use your submissions to train AI models or share them with third parties.",
  },
  {
    q: "Can I use it on my phone?",
    a: "Yes — Wrex is fully responsive. The editor, results panel, and Pro tools all work on mobile. We recommend landscape mode for the best editing experience on smaller screens.",
  },
];

export function FaqSection() {
  const [open, setOpen] = useState<number | null>(null);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const els = sectionRef.current?.querySelectorAll<HTMLElement>(".scroll-reveal");
    if (!els?.length) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in-view"); obs.unobserve(e.target); } });
      },
      { threshold: 0.08 }
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return (
    <section id="faq" className="bg-white px-6 py-16 lg:px-10 lg:py-20" ref={sectionRef}>
      <div className="mx-auto max-w-2xl">
        <div className="scroll-reveal">
          <h2 className="text-[1.75rem] font-bold tracking-tight text-navy lg:text-[2.25rem]">
            Questions
          </h2>
          <p className="mt-3 text-base text-charcoal/65">
            Everything you'd want to know before you paste anything.
          </p>
        </div>

        <div className="mt-10 divide-y divide-border-base">
          {FAQS.map((faq, i) => (
            <div key={faq.q} className="scroll-reveal py-5" data-delay={String(Math.min(i + 1, 4)) as "1" | "2" | "3" | "4"}>
              <button
                type="button"
                onClick={() => setOpen(open === i ? null : i)}
                className="flex w-full items-center justify-between gap-4 text-left transition hover:text-navy"
              >
                <span className="text-base font-semibold text-navy">{faq.q}</span>
                <svg
                  width="18" height="18" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                  className={`shrink-0 text-charcoal/40 transition-transform duration-300 ${open === i ? "rotate-180" : ""}`}
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
              {/* Smooth accordion using CSS grid */}
              <div className={`faq-body ${open === i ? "open" : ""}`}>
                <div>
                  <p className="pt-3 max-w-xl text-sm leading-7 text-charcoal/75">
                    {faq.a}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}


import { ClipboardList, ScanSearch, PenLine, Wand2 } from "lucide-react";

const features = [
  {
    Icon: ClipboardList,
    title: "Rubric alignment",
    desc: "Paste your assignment brief. Wrex maps every criterion to your draft and flags the gaps.",
  },
  {
    Icon: ScanSearch,
    title: "Gap detection",
    desc: "See exactly which rubric points are missing, weak, or well-covered — at a glance.",
  },
  {
    Icon: PenLine,
    title: "Paragraph rewrites",
    desc: "Get targeted rewrites for sections that don't meet the rubric, not generic suggestions.",
  },
  {
    Icon: Wand2,
    title: "Humanizing support",
    desc: "Strengthen natural phrasing in sentences flagged as likely AI-generated.",
  },
];

export function ProPreview() {
  return (
    <section
      id="pro-preview"
      className="mx-auto max-w-7xl px-6 py-10 lg:px-10 lg:py-16"
    >
      <div className="rounded-[2rem] border border-navy/10 bg-mist p-8 shadow-soft lg:p-10">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-xl">
            <h2 className="text-3xl font-semibold tracking-tight text-navy">
              Pro — built around your rubric.
            </h2>
            <p className="mt-3 text-base leading-7 text-charcoal/70">
              The free tier checks patterns. Pro takes your actual assignment
              criteria and tells you exactly what your draft is missing.
            </p>
            <a
              href="#waitlist"
              className="mt-5 inline-block rounded-2xl bg-navy px-5 py-3 text-sm font-semibold text-white transition hover:bg-navy/90"
            >
              Get early access
            </a>
          </div>
          <div className="rounded-soft border border-white/80 bg-white px-5 py-5 text-sm text-charcoal shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-widest text-charcoal/45">
              Pricing
            </p>
            <p className="mt-3 text-2xl font-semibold text-navy">$8/month</p>
            <p className="text-sm text-charcoal/55">Student</p>
            <p className="mt-3 text-base font-medium text-charcoal/70">$12/month</p>
            <p className="text-sm text-charcoal/55">Regular</p>
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(({ Icon, title, desc }) => (
            <div
              key={title}
              className="rounded-soft border border-navy/10 bg-white p-5"
            >
              <Icon className="h-5 w-5 text-accent mb-3" />
              <p className="text-sm font-semibold text-navy">{title}</p>
              <p className="mt-2 text-sm leading-6 text-charcoal/65">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

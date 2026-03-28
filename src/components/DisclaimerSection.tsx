export function DisclaimerSection() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-6 lg:px-10">
      <div className="rounded-[2rem] border border-navy/10 bg-mist p-6 lg:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-charcoal/45">
          Study-use disclaimer
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <DisclaimerCard text="For study and educational use." />
          <DisclaimerCard text="Results are probabilistic, not definitive." />
          <DisclaimerCard text="This should not be used as the sole basis for academic penalty." />
        </div>
      </div>
    </section>
  );
}

function DisclaimerCard({ text }: { text: string }) {
  return (
    <div className="rounded-soft bg-white px-4 py-4 text-sm leading-7 text-charcoal">
      {text}
    </div>
  );
}

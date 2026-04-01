import { Brand } from "./Brand";

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-border-base bg-mist">
      <div className="mx-auto max-w-7xl px-6 py-12 lg:px-10">
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
          {/* Brand + tagline */}
          <div className="max-w-xs">
            <Brand />
            <p className="mt-3 text-sm leading-6 text-charcoal/55">
              Write to your rubric. Every time.<br />
              A private revision tool for students.
            </p>
          </div>

          {/* Link columns */}
          <div className="flex flex-wrap gap-x-12 gap-y-8 text-sm">
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-charcoal/40">Product</p>
              <div className="flex flex-col gap-2.5 text-charcoal/65">
                <a href="#how-it-works" className="transition hover:text-navy">How it works</a>
                <a href="#analyzer" className="transition hover:text-navy">Try it free</a>
                <a href="#pricing" className="transition hover:text-navy">Pricing</a>
                <a href="#faq" className="transition hover:text-navy">FAQ</a>
              </div>
            </div>
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-charcoal/40">Support</p>
              <div className="flex flex-col gap-2.5 text-charcoal/65">
                <a href="mailto:hello@wrex.app" className="transition hover:text-navy">Contact us</a>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-border-base pt-6 flex flex-col gap-1 text-xs text-charcoal/45 md:flex-row md:justify-between">
          <p>© {year} Wrex.app. For revision and self-review purposes only.</p>
          <p>Not affiliated with any school, university, or AI detection service.</p>
        </div>
      </div>
    </footer>
  );
}

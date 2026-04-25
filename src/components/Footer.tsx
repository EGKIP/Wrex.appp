import { Brand } from "./Brand";

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-border-base bg-canvas">
      <div className="mx-auto max-w-7xl px-6 py-14 lg:px-10">
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
          {/* Brand + tagline */}
          <div className="max-w-[280px]">
            <Brand />
            <p className="mt-3 text-sm leading-6 text-charcoal/55">
              Write with confidence. Sound like you.<br />
              A private revision tool built for students.
            </p>
            <a
              href="mailto:support@wrex.app"
              className="mt-4 inline-block text-xs font-medium text-charcoal/45 underline-offset-4 transition hover:text-navy hover:underline"
            >
              support@wrex.app
            </a>
          </div>

          {/* Nav links — two focused columns */}
          <div className="flex flex-wrap gap-x-14 gap-y-8 text-sm">
            <div>
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-charcoal/35">Product</p>
              <div className="flex flex-col gap-2.5 text-charcoal/60">
                <a href="#how-it-works" className="transition hover:text-navy">How it works</a>
                <a href="#analyzer" className="transition hover:text-navy">Try it free</a>
                <a href="#faq" className="transition hover:text-navy">FAQ</a>
              </div>
            </div>
            <div>
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-charcoal/35">Legal</p>
              <div className="flex flex-col gap-2.5 text-charcoal/60">
                <a href="/privacy" className="transition hover:text-navy">Privacy policy</a>
                <a href="/terms" className="transition hover:text-navy">Terms of service</a>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-border-base pt-6 flex flex-col gap-1.5 text-[11px] text-charcoal/40 md:flex-row md:justify-between">
          <p>© {year} Wrex.app — for revision and self-review only.</p>
          <p>Not affiliated with any school, university, or AI detection service.</p>
        </div>
      </div>
    </footer>
  );
}

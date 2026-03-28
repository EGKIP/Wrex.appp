export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-border-base bg-mist">
      <div className="mx-auto max-w-7xl px-6 py-12 lg:px-10">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          {/* Brand */}
          <div className="max-w-xs">
            <p className="text-base font-bold text-navy">Wrex.app</p>
            <p className="mt-2 text-sm leading-6 text-charcoal/60">
              Write to your rubric. Every time.
            </p>
          </div>

          {/* Links */}
          <div className="flex flex-wrap gap-x-8 gap-y-3 text-sm text-charcoal/65">
            <a href="#how-it-works" className="transition hover:text-navy">How it works</a>
            <a href="#analyzer" className="transition hover:text-navy">Try it</a>
            <a href="#faq" className="transition hover:text-navy">FAQ</a>
            <a href="#faq" className="transition hover:text-navy">Plans</a>
            <a href="mailto:hello@wrex.app" className="transition hover:text-navy">Contact</a>
          </div>
        </div>

        <div className="mt-10 border-t border-border-base pt-6 text-xs text-charcoal/50">
          <p>© {year} Wrex.app. For revision and self-review purposes only.</p>
        </div>
      </div>
    </footer>
  );
}

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-navy/8 bg-mist">
      <div className="mx-auto max-w-7xl px-6 py-12 lg:px-10">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          {/* Brand */}
          <div className="max-w-xs">
            <p className="font-semibold text-navy">Wrex.app</p>
            <p className="mt-2 text-sm leading-6 text-charcoal/55">
              AI writing analysis built for students. For personal study use only.
            </p>
          </div>

          {/* Links */}
          <div className="flex flex-wrap gap-x-10 gap-y-3 text-sm text-charcoal/55">
            <a href="#how-it-works" className="transition hover:text-navy">How it works</a>
            <a href="#analyzer" className="transition hover:text-navy">Try it</a>
            <a href="#faq" className="transition hover:text-navy">FAQ</a>
            <a href="#faq" className="transition hover:text-navy">Plans</a>
            <a href="mailto:hello@wrex.app" className="transition hover:text-navy">Contact</a>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-1 border-t border-navy/8 pt-6 text-xs text-charcoal/40 md:flex-row md:justify-between">
          <p>© {year} Wrex.app. All rights reserved.</p>
          <p>Results are probabilistic indicators — not proof, not academic evidence.</p>
        </div>
      </div>
    </footer>
  );
}

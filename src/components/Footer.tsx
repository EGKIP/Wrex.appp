export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="mx-auto max-w-7xl px-6 pb-10 pt-6 text-sm text-charcoal/60 lg:px-10">
      <div className="border-t border-navy/8 pt-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          {/* Left — brand + mission */}
          <div className="max-w-sm">
            <p className="font-semibold text-navy">Wrex.app</p>
            <p className="mt-2 leading-6">
              Educational AI writing analysis for students. Results are
              probabilistic indicators — not proof, not accusations, not
              disciplinary evidence.
            </p>
          </div>
          {/* Right — links */}
          <div className="flex flex-wrap gap-x-8 gap-y-3">
            <a href="#analyzer" className="transition hover:text-navy">Detector</a>
            <a href="#waitlist" className="transition hover:text-navy">Waitlist</a>
            <a href="mailto:hello@wrex.app" className="transition hover:text-navy">Contact</a>
          </div>
        </div>
        <div className="mt-8 flex flex-col gap-2 border-t border-navy/5 pt-6 text-xs text-charcoal/45 md:flex-row md:justify-between">
          <p>© {year} Wrex.app. All rights reserved.</p>
          <p>Results are for personal study use only and carry no academic weight.</p>
        </div>
      </div>
    </footer>
  );
}

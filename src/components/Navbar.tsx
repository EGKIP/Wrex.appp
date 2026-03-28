import { Brand } from "./Brand";

export function Navbar() {
  return (
    <header className="sticky top-0 z-20 border-b border-navy/5 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-10">
        <Brand />
        <nav className="hidden items-center gap-8 text-sm text-charcoal/80 md:flex">
          <a href="#analyzer" className="transition hover:text-navy">
            Detector
          </a>
          <a href="#pro-preview" className="transition hover:text-navy">
            Pro Preview
          </a>
          <a href="#waitlist" className="transition hover:text-navy">
            Waitlist
          </a>
        </nav>
      </div>
    </header>
  );
}

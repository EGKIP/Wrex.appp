import { useEffect, useState } from "react";
import { Brand } from "./Brand";

const NAV_LINKS = [
  { label: "How it works", href: "#how-it-works" },
  { label: "Try it", href: "#analyzer" },
  { label: "FAQ", href: "#faq" },
];

export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [active, setActive] = useState("");

  useEffect(() => {
    const sections = ["how-it-works", "analyzer", "faq"];
    const observers = sections.map((id) => {
      const el = document.getElementById(id);
      if (!el) return null;
      const observer = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActive(`#${id}`); },
        { threshold: 0.3 },
      );
      observer.observe(el);
      return observer;
    });
    return () => observers.forEach((o) => o?.disconnect());
  }, []);

  return (
    <header className="sticky top-0 z-20 border-b border-navy/5 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-10">
        <Brand />

        {/* Desktop nav */}
        <nav className="hidden items-center gap-8 text-sm md:flex">
          {NAV_LINKS.map(({ label, href }) => (
            <a
              key={href}
              href={href}
              className={`transition ${active === href ? "font-semibold text-navy" : "text-charcoal/60 hover:text-navy"}`}
            >
              {label}
            </a>
          ))}
          <a
            href="#analyzer"
            className="rounded-2xl bg-navy px-4 py-2 text-sm font-semibold text-white transition hover:bg-navy/90"
          >
            Sign in
          </a>
        </nav>

        {/* Mobile hamburger */}
        <button
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-navy/10 text-navy md:hidden"
          aria-label="Toggle menu"
        >
          {menuOpen ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="border-t border-navy/5 bg-white px-6 pb-6 pt-4 md:hidden">
          <nav className="flex flex-col gap-4 text-sm">
            {NAV_LINKS.map(({ label, href }) => (
              <a
                key={href}
                href={href}
                onClick={() => setMenuOpen(false)}
                className="text-charcoal/70 transition hover:text-navy"
              >
                {label}
              </a>
            ))}
            <a
              href="#analyzer"
              onClick={() => setMenuOpen(false)}
              className="mt-1 rounded-2xl bg-navy px-4 py-3 text-center text-sm font-semibold text-white"
            >
              Sign in
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}

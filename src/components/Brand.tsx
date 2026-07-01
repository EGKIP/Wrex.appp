type BrandProps = {
  logoSrc?: string;
  /** When provided, the logo becomes a clickable button */
  onClick?: () => void;
};

export function Brand({ logoSrc = "/logo.svg", onClick }: BrandProps) {
  const inner = (
    <>
      <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-[1rem] border border-white/70 bg-white/85 shadow-[0_10px_30px_-22px_rgba(15,23,42,0.65)]">
        <img
          src={logoSrc}
          alt="Wrex logo"
          className="h-full w-full object-contain"
        />
      </div>
      <div className="leading-none">
        <p className="font-heading text-[1.15rem] text-navy">Wrex</p>
        <p className="mt-1 text-[0.62rem] font-semibold uppercase tracking-[0.28em] text-charcoal/42">
          writing workspace
        </p>
      </div>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="flex items-center gap-3 rounded-xl px-1 py-0.5 transition duration-300 hover:-translate-y-0.5 hover:opacity-95"
        title="Go to home"
      >
        {inner}
      </button>
    );
  }

  return <div className="flex items-center gap-3">{inner}</div>;
}

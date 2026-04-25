type BrandProps = {
  logoSrc?: string;
  /** When provided, the logo becomes a clickable button */
  onClick?: () => void;
};

export function Brand({ logoSrc = "/logo.svg", onClick }: BrandProps) {
  const inner = (
    <>
      {/* Logo mark — the highlight-W icon */}
      <div className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-lg">
        <img
          src={logoSrc}
          alt="Wrex logo"
          className="h-full w-full object-contain"
        />
      </div>
      {/* Wordmark — "Wrex" bold + ".app" lighter */}
      <p className="text-[14px] font-bold tracking-tight text-navy leading-none">
        Wrex<span className="font-normal text-charcoal/40 text-[12px]">.app</span>
      </p>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="flex items-center gap-2 rounded-lg px-1 py-0.5 transition-opacity hover:opacity-75"
        title="Go to home"
      >
        {inner}
      </button>
    );
  }

  return <div className="flex items-center gap-2">{inner}</div>;
}

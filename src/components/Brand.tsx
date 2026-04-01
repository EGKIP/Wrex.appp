type BrandProps = {
  logoSrc?: string;
  /** When provided, the logo becomes a clickable button */
  onClick?: () => void;
};

export function Brand({ logoSrc = "/logo.png", onClick }: BrandProps) {
  const inner = (
    <>
      <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl border border-navy/10 bg-mist">
        <img
          src={logoSrc}
          alt="Wrex.app logo"
          className="h-full w-full object-contain"
          onError={(event) => {
            event.currentTarget.style.display = "none";
            const fallback = event.currentTarget.nextElementSibling as HTMLElement | null;
            if (fallback) fallback.style.display = "flex";
          }}
        />
        <span className="hidden h-full w-full items-center justify-center bg-navy text-sm font-semibold text-white">
          WX
        </span>
      </div>
      <div>
        <p className="text-base font-semibold tracking-tight text-navy">Wrex.app</p>
      </div>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="flex items-center gap-3 rounded-lg px-1 py-0.5 transition-opacity hover:opacity-75"
        title="Go to home"
      >
        {inner}
      </button>
    );
  }

  return <div className="flex items-center gap-3">{inner}</div>;
}

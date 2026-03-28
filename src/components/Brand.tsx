type BrandProps = {
  logoSrc?: string;
};

export function Brand({ logoSrc = "/logo.png" }: BrandProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl border border-navy/10 bg-mist">
        <img
          src={logoSrc}
          alt="Wrex.app logo"
          className="h-full w-full object-contain"
          onError={(event) => {
            event.currentTarget.style.display = "none";
            const fallback = event.currentTarget.nextElementSibling as HTMLElement | null;
            if (fallback) {
              fallback.style.display = "flex";
            }
          }}
        />
        <span className="hidden h-full w-full items-center justify-center bg-navy text-sm font-semibold text-white">
          WX
        </span>
      </div>
      <div>
        <p className="text-base font-semibold tracking-tight text-navy">Wrex.app</p>
        <p className="text-sm text-charcoal/70">Educational AI text analysis</p>
      </div>
    </div>
  );
}

import type { HTMLAttributes } from "react";
import { cn } from "../../lib/cn";

type SurfaceTone = "default" | "muted" | "accent";

export interface SurfaceProps extends HTMLAttributes<HTMLDivElement> {
  tone?: SurfaceTone;
  padding?: "none" | "sm" | "md" | "lg";
}

const toneClasses: Record<SurfaceTone, string> = {
  default: "border-border-base bg-white",
  muted: "border-border-base/80 bg-mist",
  accent: "border-accent/45 bg-parchment",
};

const paddingClasses = {
  none: "",
  sm: "p-3",
  md: "p-5",
  lg: "p-7",
};

export function Surface({ className, tone = "default", padding = "md", ...props }: SurfaceProps) {
  return (
    <div
      className={cn(
        "rounded-card border shadow-soft",
        toneClasses[tone],
        paddingClasses[padding],
        className,
      )}
      {...props}
    />
  );
}

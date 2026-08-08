import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "../../lib/cn";

export interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: ReactNode;
  error?: string;
}

export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(
  { className, id, label, hint, error, "aria-describedby": ariaDescribedBy, ...props },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const helpId = `${inputId}-help`;

  return (
    <div>
      <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-ink">
        {label}
      </label>
      <input
        ref={ref}
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={cn(ariaDescribedBy, Boolean(hint || error) && helpId) || undefined}
        className={cn(
          "min-h-11 w-full rounded-input border bg-white px-3.5 text-sm text-ink outline-none transition placeholder:text-taupe focus:border-accent-dark focus:ring-[3px] focus:ring-accent/20",
          error ? "border-danger/60" : "border-border-base",
          className,
        )}
        {...props}
      />
      {(hint || error) && (
        <div id={helpId} className={cn("mt-1.5 text-xs leading-5", error ? "text-danger" : "text-charcoal/70")}>
          {error ?? hint}
        </div>
      )}
    </div>
  );
});

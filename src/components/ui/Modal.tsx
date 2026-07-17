import { useEffect, useRef } from "react";
import type { PropsWithChildren } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

type ModalProps = PropsWithChildren<{
  open: boolean;
  /** Omit to make the modal non-dismissible (no backdrop click / Escape). */
  onClose?: () => void;
  /** Accessible name for the dialog. */
  ariaLabel: string;
  /** Extra classes for the panel (width, padding, positioning tweaks). */
  className?: string;
  /** Vertical alignment — checkout/auth are centered, profile hangs below the nav. */
  align?: "center" | "top";
}>;

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

/**
 * Accessible modal shell shared by every dialog:
 * dialog semantics, Escape to close, backdrop click, focus trap,
 * focus restore, body scroll lock, and a calm entrance/exit animation.
 */
export function Modal({ open, onClose, ariaLabel, className = "", align = "center", children }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!open) return;

    previousFocus.current = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    // Focus the first focusable element (or the panel) once mounted
    const raf = requestAnimationFrame(() => {
      const panel = panelRef.current;
      if (!panel) return;
      const first = panel.querySelector<HTMLElement>(FOCUSABLE);
      (first ?? panel).focus();
    });

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && onClose) {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      // Simple focus trap — cycle within the panel
      const panel = panelRef.current;
      if (!panel) return;
      const focusables = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (focusables.length === 0) return;
      const firstEl = focusables[0];
      const lastEl = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
      previousFocus.current?.focus?.();
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className={`fixed inset-0 z-50 flex justify-center bg-navy/40 px-4 backdrop-blur-sm ${
            align === "top" ? "items-start pt-20" : "items-center"
          }`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.18 }}
          onClick={onClose ? (e) => { if (e.target === e.currentTarget) onClose(); } : undefined}
        >
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={ariaLabel}
            tabIndex={-1}
            className={`max-h-[calc(100vh-4rem)] w-full overflow-y-auto rounded-modal bg-white shadow-2xl outline-none ${className}`}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.97 }}
            animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: reduceMotion ? 0 : 0.26, ease: [0.22, 1, 0.36, 1] }}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

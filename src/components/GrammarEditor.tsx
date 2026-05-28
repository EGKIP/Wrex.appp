import { useEffect, useRef, useState } from "react";
import type { GrammarMatch } from "../types";

interface GrammarEditorProps {
  value: string;
  onChange: (text: string) => void;
  grammarMatches: GrammarMatch[];
  grammarLoading: boolean;
  onApplyFix: (match: GrammarMatch, replacement: string) => void;
  placeholder?: string;
  minHeight?: string;
  /** Increment this value to programmatically focus the textarea (e.g. after loading history) */
  focusKey?: number;
}

/** Escape HTML special chars so user text renders safely in the backdrop div. */
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Build the backdrop innerHTML: plain text with <mark> spans underlined
 * in red (error) or amber (suggestion) for each grammar match.
 * The backdrop uses `color: transparent` so only underlines are visible.
 */
function buildBackdropHtml(text: string, matches: GrammarMatch[]): string {
  if (matches.length === 0) return esc(text).replace(/\n/g, "<br>") + " ";
  const sorted = [...matches].sort((a, b) => a.offset - b.offset);
  let html = "";
  let cursor = 0;
  for (const m of sorted) {
    if (m.offset < cursor) continue; // skip overlapping
    html += esc(text.slice(cursor, m.offset)).replace(/\n/g, "<br>");
    const color = m.match_type === "error" ? "#EF4444" : "#F59E0B";
    const span = esc(text.slice(m.offset, m.offset + m.length)).replace(/\n/g, "<br>");
    html += `<mark style="background:transparent;border-bottom:2.5px solid ${color};padding:0;color:inherit">${span}</mark>`;
    cursor = m.offset + m.length;
  }
  html += esc(text.slice(cursor)).replace(/\n/g, "<br>") + " ";
  return html;
}

function uniqueReplacements(replacements: string[]): string[] {
  return Array.from(new Set(replacements.map((replacement) => replacement.trim()).filter(Boolean))).slice(0, 5);
}

export function GrammarEditor({
  value,
  onChange,
  grammarMatches,
  grammarLoading,
  onApplyFix,
  placeholder = "Paste your text here…",
  minHeight = "300px",
  focusKey,
}: GrammarEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const [activeMatch, setActiveMatch] = useState<GrammarMatch | null>(null);
  const activeReplacements = activeMatch ? uniqueReplacements(activeMatch.replacements) : [];
  const activeText = activeMatch ? value.slice(activeMatch.offset, activeMatch.offset + activeMatch.length) : "";

  // Focus the textarea when focusKey changes (e.g. after loading from history)
  useEffect(() => {
    if (focusKey !== undefined && focusKey > 0) {
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }, [focusKey]);

  // Auto-grow
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  useEffect(() => {
    if (!activeMatch) return;
    const stillPresent = grammarMatches.some(
      (match) =>
        match.offset === activeMatch.offset &&
        match.length === activeMatch.length &&
        match.rule_id === activeMatch.rule_id,
    );
    if (!stillPresent) setActiveMatch(null);
  }, [activeMatch, grammarMatches]);

  // Sync backdrop scroll when user scrolls in textarea (rare with auto-grow but safe)
  function syncScroll() {
    if (backdropRef.current && textareaRef.current) {
      backdropRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  }

  function detectMatch() {
    const ta = textareaRef.current;
    if (!ta) return;
    const pos = ta.selectionStart;
    const found = grammarMatches.find((m) => pos >= m.offset && pos < m.offset + m.length);
    setActiveMatch(found ?? null);
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    onChange(e.target.value);
    setActiveMatch(null);
  }

  function applyFix(match: GrammarMatch, replacement: string) {
    onApplyFix(match, replacement);
    setActiveMatch(null);
  }

  /** Shared CSS for both backdrop and textarea — must be identical for alignment. */
  const sharedStyle: React.CSSProperties = {
    fontFamily: "inherit",
    fontSize: "1rem",
    lineHeight: "1.75rem",
    padding: "12px 16px",
    border: "1px solid transparent",
    whiteSpace: "pre-wrap",
    wordWrap: "break-word",
    overflowWrap: "break-word",
    boxSizing: "border-box",
    width: "100%",
  };

  return (
    <div className="relative rounded-input border border-border-base bg-white transition focus-within:border-accent focus-within:ring-[3px] focus-within:ring-accent/15">
      {/* Backdrop — identical layout, transparent text, colored underlines */}
      <div
        ref={backdropRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden rounded-input"
        style={{ ...sharedStyle, border: "1px solid transparent", color: "transparent" }}
        dangerouslySetInnerHTML={{ __html: buildBackdropHtml(value, grammarMatches) }}
      />
      {/* Actual textarea — transparent bg so backdrop underlines show through */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onClick={detectMatch}
        onKeyUp={detectMatch}
        onMouseUp={detectMatch}
        onScroll={syncScroll}
        placeholder={placeholder}
        style={{ ...sharedStyle, background: "transparent", caretColor: "#1e293b", minHeight, color: "inherit", resize: "none", outline: "none" }}
        className="relative z-10 w-full text-charcoal placeholder:text-charcoal/30"
      />
      {/* Inline fix popover — appears below the textarea when cursor is on an error */}
      {activeMatch && (
        <div className="rounded-b-input border-t border-border-base bg-white px-3 py-3 text-xs shadow-[0_-8px_30px_-28px_rgba(15,23,42,0.75)]">
          <div className="flex items-start gap-2">
            <span
              className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: activeMatch.match_type === "error" ? "#EF4444" : "#F59E0B" }}
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="font-mono text-danger line-through opacity-70">{activeText}</span>
                <span className="rounded-full bg-mist px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-charcoal/45">
                  {activeMatch.match_type === "error" ? "Grammar" : "Suggestion"}
                </span>
              </div>
              <p className="mt-1 text-charcoal/60">{activeMatch.message}</p>

              {activeReplacements.length > 0 ? (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-semibold text-charcoal/45">Replace with</span>
                  {activeReplacements.map((replacement) => (
                    <button
                      key={replacement}
                      type="button"
                      onClick={() => applyFix(activeMatch, replacement)}
                      className="rounded-soft border border-emerald-200 bg-emerald-50 px-2.5 py-1 font-mono text-[12px] font-semibold text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-100 active:scale-[0.98]"
                    >
                      {replacement}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="mt-2 rounded-input bg-mist px-3 py-2 text-[11px] leading-5 text-charcoal/55">
                  No automatic replacement for this one. Edit the underlined text directly.
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setActiveMatch(null)}
              aria-label="Close grammar suggestion"
              className="shrink-0 text-base leading-none text-charcoal/30 hover:text-charcoal"
            >
              ×
            </button>
          </div>
        </div>
      )}
      {/* Grammar loading indicator */}
      {grammarLoading && (
        <div className="flex items-center gap-1.5 border-t border-border-base bg-white px-3 py-1.5 text-[11px] text-charcoal/40 rounded-b-input">
          <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/></svg>
          Checking grammar…
        </div>
      )}
    </div>
  );
}

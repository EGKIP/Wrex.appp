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

export function GrammarEditor({
  value,
  onChange,
  grammarMatches,
  grammarLoading,
  onApplyFix,
  placeholder = "Paste your text here…",
  minHeight = "300px",
}: GrammarEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const [activeMatch, setActiveMatch] = useState<GrammarMatch | null>(null);

  // Auto-grow
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

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
    const found = grammarMatches.find((m) => pos >= m.offset && pos <= m.offset + m.length);
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
        onScroll={syncScroll}
        placeholder={placeholder}
        style={{ ...sharedStyle, background: "transparent", caretColor: "#1e293b", minHeight, color: "inherit", resize: "none", outline: "none" }}
        className="relative z-10 w-full text-charcoal placeholder:text-charcoal/30"
      />
      {/* Inline fix popover — appears below the textarea when cursor is on an error */}
      {activeMatch && (
        <div className="flex items-center gap-2 border-t border-border-base bg-white px-3 py-2 text-xs rounded-b-input">
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: activeMatch.match_type === "error" ? "#EF4444" : "#F59E0B" }} />
          <span className="font-mono text-danger line-through opacity-60">{value.slice(activeMatch.offset, activeMatch.offset + activeMatch.length)}</span>
          {activeMatch.replacements[0] && <>
            <span className="text-charcoal/35">→</span>
            <span className="font-mono font-semibold text-navy">{activeMatch.replacements[0]}</span>
          </>}
          <span className="flex-1 text-charcoal/50 truncate">{activeMatch.message}</span>
          {activeMatch.replacements[0] && (
            <button type="button" onClick={() => applyFix(activeMatch, activeMatch.replacements[0])} className="shrink-0 rounded-soft bg-emerald-500 px-3 py-1 font-bold text-white transition hover:bg-emerald-600 active:scale-95">
              ✓ Fix
            </button>
          )}
          <button type="button" onClick={() => setActiveMatch(null)} className="shrink-0 text-charcoal/30 hover:text-charcoal leading-none text-base">×</button>
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

import { useState } from "react";
import { deleteHistoryItem } from "../lib/api";
import type { SubmissionRecord } from "../types";

interface HistoryPanelProps {
  submissions: SubmissionRecord[];
  accessToken: string;
  onSelect: (text_preview: string, rubric_preview: string | null) => void;
  onRefresh: () => void;
}

function scoreBadgeClass(score: number): string {
  if (score >= 70) return "bg-red-100 text-red-700";
  if (score >= 40) return "bg-amber-100 text-amber-700";
  return "bg-emerald-100 text-emerald-700";
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function HistoryPanel({
  submissions,
  accessToken,
  onSelect,
  onRefresh,
}: HistoryPanelProps) {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setDeleting(id);
    try {
      await deleteHistoryItem(id, accessToken);
      onRefresh();
    } catch {
      // silent — item will still show until refresh
    } finally {
      setDeleting(null);
    }
  }

  if (submissions.length === 0) return null;

  return (
    <div className="mt-6 rounded-modal border border-charcoal/10 bg-white shadow-float">
      {/* Header / toggle */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
      >
        <span className="font-semibold text-navy text-sm">
          Past submissions
          <span className="ml-2 rounded-full bg-accent/15 px-2 py-0.5 text-xs font-bold text-navy">
            {submissions.length}
          </span>
        </span>
        <span className="text-charcoal/40 text-xs">{open ? "▲ hide" : "▼ show"}</span>
      </button>

      {open && (
        <ul className="divide-y divide-charcoal/8 border-t border-charcoal/10">
          {submissions.map((s) => (
            <li
              key={s.id}
              onClick={() => onSelect(s.text_preview, s.rubric_preview)}
              className="group flex cursor-pointer items-start gap-4 px-5 py-3.5 transition hover:bg-mist"
            >
              {/* Score badge */}
              <span
                className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${scoreBadgeClass(s.score)}`}
              >
                {s.score}
              </span>

              {/* Text + meta */}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-charcoal/80">{s.text_preview}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-charcoal/45">
                  <span>{s.word_count} words</span>
                  <span>·</span>
                  <span>{s.confidence} confidence</span>
                  {s.rubric_score !== null && (
                    <>
                      <span>·</span>
                      <span className="rounded bg-navy/8 px-1.5 py-0.5 text-navy font-medium">
                        Rubric {s.rubric_score}%
                      </span>
                    </>
                  )}
                  <span>·</span>
                  <span>{formatDate(s.created_at)}</span>
                </div>
              </div>

              {/* Delete */}
              <button
                onClick={(e) => handleDelete(s.id, e)}
                disabled={deleting === s.id}
                className="ml-2 shrink-0 rounded p-1 text-charcoal/30 opacity-0 transition hover:bg-red-50 hover:text-red-500 group-hover:opacity-100 disabled:opacity-50"
                title="Delete"
              >
                {deleting === s.id ? "…" : "✕"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}


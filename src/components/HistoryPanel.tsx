import { useState } from "react";
import { deleteHistoryItem } from "../lib/api";
import { useToast } from "../context/toast";
import type { SubmissionRecord } from "../types";

interface HistoryPanelProps {
  submissions: SubmissionRecord[];
  accessToken: string;
  loading?: boolean;
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
  loading = false,
  onSelect,
  onRefresh,
}: HistoryPanelProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setDeleting(id);
    try {
      await deleteHistoryItem(id, accessToken);
      toast("Submission deleted", "info");
      onRefresh();
    } catch {
      toast("Could not delete — please try again", "error");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="mt-6 rounded-modal border border-charcoal/10 bg-white shadow-float">
      {/* Header / toggle */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
      >
        <span className="font-semibold text-navy text-sm">
          Past submissions
          {!loading && submissions.length > 0 && (
            <span className="ml-2 rounded-full bg-accent/15 px-2 py-0.5 text-xs font-bold text-navy">
              {submissions.length}
            </span>
          )}
        </span>
        {loading ? (
          <svg className="h-3.5 w-3.5 animate-spin text-charcoal/40" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
        ) : (
          <span className="text-charcoal/40 text-xs">{open ? "▲ hide" : "▼ show"}</span>
        )}
      </button>

      {open && !loading && submissions.length === 0 && (
        <p className="border-t border-charcoal/10 px-5 py-6 text-sm text-charcoal/45 text-center">
          No submissions yet. Run an analysis to start your history.
        </p>
      )}
      {open && !loading && submissions.length > 0 && (
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


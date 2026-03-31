import { History, Settings, X, Trash2 } from "lucide-react";
import { deleteHistoryItem } from "../lib/api";
import { useToast } from "../context/toast";
import type { SubmissionRecord } from "../types";

interface WorkspaceSidebarProps {
  historyOpen: boolean;
  onHistoryToggle: () => void;
  onSettingsOpen: () => void;
  submissions: SubmissionRecord[];
  historyLoading: boolean;
  accessToken: string;
  onSelectHistory: (text: string, rubric: string | null) => void;
  onRefreshHistory: () => void;
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

export function WorkspaceSidebar({
  historyOpen,
  onHistoryToggle,
  onSettingsOpen,
  submissions,
  historyLoading,
  accessToken,
  onSelectHistory,
  onRefreshHistory,
}: WorkspaceSidebarProps) {
  const { toast } = useToast();

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    try {
      await deleteHistoryItem(id, accessToken);
      toast("Submission deleted", "info");
      onRefreshHistory();
    } catch {
      toast("Could not delete — please try again", "error");
    }
  }

  return (
    <>
      {/* Icon rail */}
      <aside className="flex w-14 flex-col items-center gap-2 border-r border-charcoal/8 bg-white pt-4 pb-4">
        <button
          type="button"
          onClick={onHistoryToggle}
          title="Past submissions"
          className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${
            historyOpen
              ? "bg-navy text-white"
              : "text-charcoal/50 hover:bg-mist hover:text-navy"
          }`}
        >
          <History className="h-5 w-5" />
        </button>

        <button
          type="button"
          onClick={onSettingsOpen}
          title="Settings"
          className="flex h-10 w-10 items-center justify-center rounded-xl text-charcoal/50 transition-colors hover:bg-mist hover:text-navy"
        >
          <Settings className="h-5 w-5" />
        </button>
      </aside>

      {/* Slide-in history panel */}
      {historyOpen && (
        <div className="fixed inset-y-0 left-14 z-30 flex w-80 flex-col border-r border-charcoal/10 bg-white shadow-xl" style={{ top: "56px" }}>
          {/* Header */}
          <div className="flex items-center justify-between border-b border-charcoal/10 px-4 py-3">
            <span className="text-sm font-semibold text-navy">
              Past submissions
              {!historyLoading && submissions.length > 0 && (
                <span className="ml-2 rounded-full bg-accent/15 px-2 py-0.5 text-xs font-bold text-navy">
                  {submissions.length}
                </span>
              )}
            </span>
            <button
              type="button"
              onClick={onHistoryToggle}
              className="rounded p-1 text-charcoal/40 hover:bg-mist hover:text-charcoal"
              aria-label="Close history"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto">
            {historyLoading && (
              <div className="flex items-center justify-center py-12">
                <svg className="h-5 w-5 animate-spin text-charcoal/30" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
              </div>
            )}
            {!historyLoading && submissions.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-charcoal/40">
                No submissions yet. Run an analysis to start your history.
              </p>
            )}
            {!historyLoading && submissions.length > 0 && (
              <ul className="divide-y divide-charcoal/8">
                {submissions.map((s) => (
                  <li
                    key={s.id}
                    onClick={() => { onSelectHistory(s.text_preview, s.rubric_preview); onHistoryToggle(); }}
                    className="group flex cursor-pointer items-start gap-3 px-4 py-3 transition hover:bg-mist"
                  >
                    <span className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${scoreBadgeClass(s.score)}`}>
                      {s.score}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-charcoal/80">{s.text_preview}</p>
                      <p className="mt-0.5 text-xs text-charcoal/40">{formatDate(s.created_at)} · {s.word_count}w</p>
                    </div>
                    <button
                      onClick={(e) => handleDelete(s.id, e)}
                      className="shrink-0 rounded p-1 text-charcoal/20 opacity-0 transition hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Overlay backdrop — click to close */}
      {historyOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/10"
          style={{ top: "56px", left: "56px" }}
          onClick={onHistoryToggle}
          aria-hidden="true"
        />
      )}
    </>
  );
}


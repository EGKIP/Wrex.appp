import { useMemo, useState } from "react";
import type { MouseEvent } from "react";
import { ChevronLeft, HelpCircle, History, Home, Search, Settings, Trash2, X } from "lucide-react";
import { deleteHistoryItem } from "../lib/api";
import { useToast } from "../context/toast";
import type { SubmissionRecord } from "../types";

interface WorkspaceSidebarProps {
  historyOpen: boolean;
  onHistoryToggle: () => void;
  onSettingsOpen: () => void;
  onGoHome?: () => void;
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

function getSubmissionText(submission: SubmissionRecord): string {
  return submission.full_text?.trim() || submission.text_preview;
}

function getSubmissionRubric(submission: SubmissionRecord): string | null {
  return submission.rubric ?? submission.rubric_preview;
}

export function WorkspaceSidebar({
  historyOpen,
  onHistoryToggle,
  onSettingsOpen,
  onGoHome,
  submissions,
  historyLoading,
  accessToken,
  onSelectHistory,
  onRefreshHistory,
}: WorkspaceSidebarProps) {
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const recentSubmissions = submissions.slice(0, 5);
  const averageScore = submissions.length
    ? Math.round(submissions.reduce((total, submission) => total + submission.score, 0) / submissions.length)
    : null;
  const bestScore = submissions.length
    ? Math.min(...submissions.map((submission) => submission.score))
    : null;

  const filteredSubmissions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return submissions;

    return submissions.filter((submission) => {
      const searchable = [
        submission.text_preview,
        submission.full_text,
        submission.rubric_preview,
        submission.rubric,
        submission.confidence,
        formatDate(submission.created_at),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(normalizedQuery);
    });
  }, [query, submissions]);

  async function handleDelete(id: string, e: MouseEvent) {
    e.stopPropagation();
    try {
      await deleteHistoryItem(id, accessToken);
      toast("Submission deleted", "info");
      onRefreshHistory();
    } catch {
      toast("Could not delete — please try again", "error");
    }
  }

  const historyContent = (
    <>
      <div className="flex items-center justify-between border-b border-charcoal/10 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-navy">
            History
            {!historyLoading && submissions.length > 0 && (
              <span className="ml-2 rounded-full bg-accent/20 px-2 py-0.5 text-xs font-bold text-navy">
                {submissions.length}
              </span>
            )}
          </p>
          <p className="mt-0.5 text-[11px] text-charcoal/40">Recent checks stay beside your editor.</p>
        </div>
        <button
          type="button"
          onClick={onHistoryToggle}
          className="rounded-lg p-1.5 text-charcoal/40 transition hover:bg-mist hover:text-charcoal"
          aria-label="Collapse history"
        >
          <X className="h-4 w-4 sm:hidden" />
          <ChevronLeft className="hidden h-4 w-4 sm:block" />
        </button>
      </div>

      {!historyLoading && submissions.length > 0 && (
        <div className="grid grid-cols-3 gap-2 border-b border-charcoal/8 px-3 py-3">
          <div className="rounded-xl bg-mist px-2 py-2 text-center">
            <p className="text-sm font-extrabold text-navy">{averageScore}%</p>
            <p className="text-[10px] uppercase tracking-wide text-charcoal/40">Average</p>
          </div>
          <div className="rounded-xl bg-mist px-2 py-2 text-center">
            <p className="text-sm font-extrabold text-navy">{bestScore}%</p>
            <p className="text-[10px] uppercase tracking-wide text-charcoal/40">Best</p>
          </div>
          <div className="rounded-xl bg-accent/15 px-2 py-2 text-center">
            <p className="text-sm font-extrabold text-navy">{submissions.length}</p>
            <p className="text-[10px] uppercase tracking-wide text-charcoal/45">Saved</p>
          </div>
        </div>
      )}

      <div className="border-b border-charcoal/8 px-3 py-3">
        <label className="flex items-center gap-2 rounded-lg border border-charcoal/10 bg-mist/60 px-2.5 py-2 text-charcoal/45 focus-within:border-accent/60 focus-within:bg-white">
          <Search className="h-3.5 w-3.5 shrink-0" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search history"
            className="min-w-0 flex-1 bg-transparent text-sm text-charcoal outline-none placeholder:text-charcoal/35"
          />
        </label>
      </div>

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
          <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
            <History className="h-8 w-8 text-charcoal/20" />
            <p className="text-sm text-charcoal/45">No submissions yet.</p>
            <p className="text-xs leading-5 text-charcoal/35">Run an analysis and this panel will become your writing trail.</p>
          </div>
        )}
        {!historyLoading && submissions.length > 0 && filteredSubmissions.length === 0 && (
          <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
            <Search className="h-8 w-8 text-charcoal/20" />
            <p className="text-sm text-charcoal/40">No matching submissions.</p>
          </div>
        )}
        {!historyLoading && filteredSubmissions.length > 0 && (
          <ul className="divide-y divide-charcoal/6">
            {filteredSubmissions.map((s) => (
              <li
                key={s.id}
                onClick={() => {
                  onSelectHistory(getSubmissionText(s), getSubmissionRubric(s));
                  if (window.innerWidth < 640) onHistoryToggle();
                }}
                className="group flex cursor-pointer items-start gap-3 px-4 py-3.5 transition-colors hover:bg-mist"
              >
                <span className={`mt-0.5 shrink-0 rounded-md px-2 py-0.5 text-xs font-bold tabular-nums ${scoreBadgeClass(s.score)}`}>
                  {s.score}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm leading-snug text-charcoal/80">{s.text_preview}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-charcoal/40">
                    <span>{formatDate(s.created_at)}</span>
                    <span>·</span>
                    <span>{s.word_count}w</span>
                    {s.rubric_score !== null && (
                      <>
                        <span>·</span>
                        <span className="font-semibold text-navy/65">Rubric {s.rubric_score}%</span>
                      </>
                    )}
                  </div>
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
    </>
  );

  return (
    <>
      <aside className="hidden w-16 shrink-0 flex-col items-center border-r border-charcoal/8 bg-white px-2 py-3 sm:flex">
        <div className="flex flex-col items-center gap-1">
          {onGoHome && (
            <button
              type="button"
              onClick={onGoHome}
              title="Back to home"
              className="flex h-10 w-10 items-center justify-center rounded-xl text-charcoal/40 transition-colors hover:bg-mist hover:text-navy"
            >
              <Home className="h-5 w-5" />
            </button>
          )}
          <button
            type="button"
            onClick={onHistoryToggle}
            title={historyOpen ? "Collapse history" : "Open history"}
            className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${
              historyOpen
                ? "bg-navy text-white"
                : "text-charcoal/50 hover:bg-mist hover:text-navy"
            }`}
          >
            {historyOpen ? <ChevronLeft className="h-5 w-5" /> : <History className="h-5 w-5" />}
          </button>
        </div>

        <div className="mt-4 flex w-full flex-col items-center gap-2">
          <p className="text-[9px] font-bold uppercase tracking-wider text-charcoal/25 [writing-mode:vertical-rl]">
            Recent
          </p>
          {historyLoading ? (
            <span className="h-7 w-7 animate-pulse rounded-full bg-mist" />
          ) : recentSubmissions.length > 0 ? (
            recentSubmissions.map((submission) => (
              <button
                key={submission.id}
                type="button"
                onClick={() => onSelectHistory(getSubmissionText(submission), getSubmissionRubric(submission))}
                title={`${submission.score}% · ${submission.text_preview}`}
                className={`flex h-8 w-8 items-center justify-center rounded-lg text-[10px] font-extrabold tabular-nums transition hover:scale-105 ${scoreBadgeClass(submission.score)}`}
              >
                {submission.score}
              </button>
            ))
          ) : (
            <span className="h-8 w-8 rounded-lg border border-dashed border-charcoal/12" />
          )}
        </div>

        <div className="flex-1" />

        <div className="flex flex-col items-center gap-1">
          <a
            href="mailto:support@wrex.app"
            title="Support"
            className="flex h-10 w-10 items-center justify-center rounded-xl text-charcoal/40 transition-colors hover:bg-mist hover:text-navy"
          >
            <HelpCircle className="h-5 w-5" />
          </a>
          <button
            type="button"
            onClick={onSettingsOpen}
            title="Settings & account"
            className="flex h-10 w-10 items-center justify-center rounded-xl text-charcoal/50 transition-colors hover:bg-mist hover:text-navy"
          >
            <Settings className="h-5 w-5" />
          </button>
        </div>
      </aside>

      <aside
        className={`hidden shrink-0 overflow-hidden border-r border-charcoal/10 bg-white transition-[width] duration-300 ease-out sm:flex sm:flex-col ${
          historyOpen ? "w-80" : "w-0"
        }`}
        aria-hidden={!historyOpen}
      >
        <div className="flex h-full w-80 flex-col">{historyContent}</div>
      </aside>

      <div
        className={`fixed inset-y-0 left-0 z-30 flex w-[min(22rem,calc(100vw-2rem))] flex-col border-r border-charcoal/10 bg-white shadow-2xl transition-transform duration-200 ease-out will-change-transform sm:hidden ${
          historyOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ top: "56px" }}
      >
        {historyContent}
      </div>

      <div
        className={`fixed inset-y-0 left-0 right-0 z-20 transition-opacity duration-200 sm:hidden ${
          historyOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        style={{ top: "56px", background: "rgba(0,0,0,0.12)" }}
        onClick={onHistoryToggle}
        aria-hidden="true"
      />
    </>
  );
}

import { useState } from "react";
import { deleteHistoryItem } from "../lib/api";
import { useToast } from "../context/toast";
import type { SubmissionRecord } from "../types";

// ─── Sparkline ──────────────────────────────────────────────────────────────
const W = 300;
const H = 56;
const PAD = 6;

function Sparkline({ data }: { data: number[] }) {
  if (data.length < 2) return null;
  const pts = data.slice(-10); // last 10
  const minV = Math.min(...pts);
  const maxV = Math.max(...pts);
  const range = maxV - minV || 1;

  const x = (i: number) => PAD + (i / (pts.length - 1)) * (W - PAD * 2);
  // invert Y: lower score (less AI) is visually higher (better)
  const y = (v: number) => PAD + ((v - minV) / range) * (H - PAD * 2);

  const polyline = pts.map((v, i) => `${x(i)},${y(v)}`).join(" ");
  const avg = pts.reduce((a, b) => a + b, 0) / pts.length;
  const strokeColor = avg >= 70 ? "#ef4444" : avg >= 40 ? "#f59e0b" : "#10b981";

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none" aria-hidden>
      {/* Zone bands */}
      <rect x="0" y="0" width={W} height={H * 0.4} fill="#fef2f2" opacity="0.5" />
      <rect x="0" y={H * 0.4} width={W} height={H * 0.3} fill="#fffbeb" opacity="0.5" />
      <rect x="0" y={H * 0.7} width={W} height={H * 0.3} fill="#f0fdf4" opacity="0.5" />
      {/* Line */}
      <polyline points={polyline} fill="none" stroke={strokeColor} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {/* Dots */}
      {pts.map((v, i) => (
        <circle key={i} cx={x(i)} cy={y(v)} r="3" fill={strokeColor} />
      ))}
    </svg>
  );
}

// ─── Stats bar ───────────────────────────────────────────────────────────────
function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 rounded-lg bg-mist px-3 py-2">
      <span className="text-xs font-bold text-navy">{value}</span>
      <span className="text-[10px] text-charcoal/45 uppercase tracking-wide">{label}</span>
    </div>
  );
}

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
        <>
          {/* Stats bar */}
          <div className="border-t border-charcoal/10 px-5 py-3 flex gap-2">
            <StatPill
              label="Avg Score"
              value={`${Math.round(submissions.reduce((a, s) => a + s.score, 0) / submissions.length)}%`}
            />
            <StatPill label="Total Scans" value={String(submissions.length)} />
            <StatPill
              label="Best Score"
              value={`${Math.min(...submissions.map((s) => s.score))}%`}
            />
          </div>

          {/* Sparkline — score trend */}
          {submissions.length >= 2 && (
            <div className="px-5 pb-3">
              <p className="mb-1 text-[10px] uppercase tracking-wide text-charcoal/35">
                Score trend (oldest → newest)
              </p>
              <div className="overflow-hidden rounded-lg border border-charcoal/8">
                <Sparkline data={[...submissions].reverse().map((s) => s.score)} />
              </div>
            </div>
          )}

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
        </>
      )}
    </div>
  );
}


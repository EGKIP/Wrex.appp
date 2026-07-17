/**
 * Shared score semantics — lower is better (less AI-signal).
 *   < 40   green  · reads naturally
 *   40–69  amber  · needs the writer's touch
 *   ≥ 70   red    · strong rewrite pass recommended
 * Keep these thresholds in sync with the backend scorer.
 */

export function scoreColor(score: number): string {
  if (score >= 70) return "#EF4444";
  if (score >= 40) return "#F59E0B";
  return "#10B981";
}

/** Tailwind badge classes for compact score chips (sidebar, history). */
export function scoreBadgeClass(score: number): string {
  if (score >= 70) return "bg-red-100 text-red-700";
  if (score >= 40) return "bg-amber-100 text-amber-700";
  return "bg-emerald-100 text-emerald-700";
}

/** Friendly, action-oriented label used in the workspace summary. */
export function workspaceScoreLabel(score: number): string {
  if (score >= 70) return "Needs a voice pass";
  if (score >= 40) return "Some parts need your touch";
  return "Reads naturally";
}

/** Longer guidance label used in the results panel. */
export function scoreGuidanceLabel(score: number): string {
  if (score >= 70) return "Strong rewrite pass recommended";
  if (score >= 40) return "Add more specific voice and detail";
  return "Reads naturally";
}

export function aiLikelihoodLabel(score: number): string {
  if (score >= 70) return "High voice-signal risk";
  if (score >= 40) return "Moderate voice-signal risk";
  return "Low voice-signal risk";
}

export type WaitlistResponse = {
  message: string;
};

// ── Grammar ──────────────────────────────────────────────────────────────────
export type GrammarMatch = {
  offset: number;
  length: number;
  message: string;
  replacements: string[];
  match_type: "error" | "suggestion";
  rule_id: string;
};

export type GrammarCheckResponse = {
  matches: GrammarMatch[];
  language: string;
};

// ── Pro AI ────────────────────────────────────────────────────────────────────
export type ImproveSuggestion = {
  sentence: string;
  issue: string;
  rewrite: string;
};

export type ImproveResponse = {
  suggestions: ImproveSuggestion[];
};

export type HumanizeResponse = {
  rewritten: string;
  changes_summary: string;
};

export type RubricRewriteResponse = {
  rewritten: string;
  criteria_addressed: string[];
};

export type SubmissionRecord = {
  id: string;
  user_id: string;
  text_preview: string;
  rubric_preview: string | null;
  score: number;
  confidence: "Low" | "Medium" | "High";
  rubric_score: number | null;
  word_count: number;
  created_at: string;
};

export type SubmissionList = {
  submissions: SubmissionRecord[];
  total: number;
};

export type CriterionResult = {
  criterion: string;
  coverage: "strong" | "partial" | "missing";
  score: number;
  matched_terms: string[];
  total_terms: number;
};

export type RubricMatchResult = {
  overall_score: number;
  strong_count: number;
  partial_count: number;
  missing_count: number;
  criteria: CriterionResult[];
  summary: string;
};

export type QuotaInfo = {
  used: number;
  limit: number;
  remaining: number;
  is_authenticated: boolean;
};

export type AnalyzeResponse = {
  score: number;
  confidence: "Low" | "Medium" | "High";
  summary: string;
  stats: {
    word_count: number;
    sentence_count: number;
    avg_sentence_length: number;
    sentence_length_variance: number;
    vocabulary_diversity: number;
    repetition_index: number;
    punctuation_diversity: number;
    transition_phrase_count: number;
  };
  red_flags: string[];
  flagged_sentences: {
    index: number;
    text: string;
    score: number;
    reason: string;
  }[];
  basic_tips: string[];
  pro_prompt: {
    title: string;
    message: string;
    cta_label: string;
  };
  rubric_result: RubricMatchResult | null;
  quota: QuotaInfo | null;
};

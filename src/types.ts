export type WaitlistResponse = {
  message: string;
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

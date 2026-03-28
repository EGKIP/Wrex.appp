export type WaitlistResponse = {
  message: string;
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
};

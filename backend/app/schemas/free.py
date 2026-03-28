from typing import Optional

from pydantic import BaseModel, EmailStr, Field


class AnalyzeRequest(BaseModel):
    text: str = Field(..., min_length=1)
    rubric: Optional[str] = Field(default=None)


class DocumentStats(BaseModel):
    word_count: int
    sentence_count: int
    avg_sentence_length: float
    sentence_length_variance: float
    vocabulary_diversity: float
    repetition_index: float
    punctuation_diversity: float
    transition_phrase_count: int


class FlaggedSentence(BaseModel):
    index: int
    text: str
    score: float
    reason: str


class ProPrompt(BaseModel):
    title: str
    message: str
    cta_label: str


class CriterionResult(BaseModel):
    criterion: str
    coverage: str
    score: float
    matched_terms: list[str]
    total_terms: int


class RubricMatchResult(BaseModel):
    overall_score: int
    strong_count: int
    partial_count: int
    missing_count: int
    criteria: list[CriterionResult]
    summary: str


class QuotaInfo(BaseModel):
    used: int
    limit: int
    remaining: int
    is_authenticated: bool


class AnalyzeResponse(BaseModel):
    score: int
    confidence: str
    summary: str
    stats: DocumentStats
    red_flags: list[str]
    flagged_sentences: list[FlaggedSentence]
    basic_tips: list[str]
    pro_prompt: ProPrompt
    rubric_result: Optional[RubricMatchResult] = None
    quota: Optional[QuotaInfo] = None


class WaitlistRequest(BaseModel):
    email: EmailStr

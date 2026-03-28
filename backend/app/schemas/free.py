from pydantic import BaseModel, EmailStr, Field


class AnalyzeRequest(BaseModel):
    text: str = Field(..., min_length=1)


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


class AnalyzeResponse(BaseModel):
    score: int
    confidence: str
    summary: str
    stats: DocumentStats
    red_flags: list[str]
    flagged_sentences: list[FlaggedSentence]
    basic_tips: list[str]
    pro_prompt: ProPrompt


class WaitlistRequest(BaseModel):
    email: EmailStr

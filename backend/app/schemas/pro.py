from typing import Optional

from pydantic import BaseModel, Field


class ProFeaturePreview(BaseModel):
    title: str
    description: str


# ── Improve ───────────────────────────────────────────────────────────────────

class ImproveRequest(BaseModel):
    text: str = Field(..., min_length=10)
    rubric: Optional[str] = None


class ImproveSuggestion(BaseModel):
    sentence: str          # the original flagged sentence
    issue: str             # what's weak or missing
    rewrite: str           # improved version


class ImproveResponse(BaseModel):
    suggestions: list[ImproveSuggestion]


# ── Humanize ──────────────────────────────────────────────────────────────────

TONE_CHOICES = ("natural", "narrative", "speech", "academic", "persuasive")


class HumanizeRequest(BaseModel):
    text: str = Field(..., min_length=10)
    tone: Optional[str] = Field(
        "natural",
        description="Rewrite tone. One of: natural, narrative, speech, academic, persuasive.",
    )


class HumanizeResponse(BaseModel):
    rewritten: str
    changes_summary: str   # e.g. "Reduced formality in 3 sentences"


# ── Rubric rewrite ────────────────────────────────────────────────────────────

class RubricRewriteRequest(BaseModel):
    text: str = Field(..., min_length=10)
    rubric: str = Field(..., min_length=5)


class RubricRewriteResponse(BaseModel):
    rewritten: str
    criteria_addressed: list[str]   # which rubric criteria are now covered

from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class SubmissionRecord(BaseModel):
    id: str
    user_id: str
    text_preview: str          # first 200 chars of submission text
    rubric_preview: Optional[str] = None   # first 100 chars of rubric if provided
    score: int
    confidence: str
    rubric_score: Optional[int] = None     # rubric alignment score if rubric was used
    word_count: int
    created_at: datetime


class SubmissionList(BaseModel):
    submissions: list[SubmissionRecord]
    total: int


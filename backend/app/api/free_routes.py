from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel

from app.core.auth import AuthUser, get_optional_user
from app.core.logging import get_logger
from app.core.usage import QuotaInfo, check_quota
from app.schemas.free import AnalyzeRequest, AnalyzeResponse, QuotaInfo as QuotaInfoSchema
from app.services.free_detector.detector import analyze_document
from app.services.pro_writer.grammar_service import check_grammar, GrammarMatch as GrammarMatchModel

router = APIRouter(tags=["free"])
logger = get_logger(__name__)


@router.get("/health")
def healthcheck() -> dict[str, str]:
    return {"status": "ok"}


def _save_submission(user_id: str, payload: AnalyzeRequest, result: AnalyzeResponse) -> None:
    """
    Persist analysis result to Supabase submissions table.
    Failures are logged but do NOT surface as errors to the caller.
    """
    try:
        from app.core.supabase import get_supabase

        client = get_supabase()
        row = {
            "user_id": user_id,
            "text_preview": payload.text[:200],
            "rubric_preview": (payload.rubric or "")[:100] or None,
            "full_text": payload.text,
            "rubric": payload.rubric or None,
            "score": result.score,
            "confidence": result.confidence,
            "rubric_score": result.rubric_result.overall_score if result.rubric_result else None,
            "word_count": result.stats.word_count,
        }
        client.table("submissions").insert(row).execute()
    except Exception as exc:  # noqa: BLE001
        logger.warning("submission_save_failed", extra={"user_id": user_id, "error": str(exc)})


@router.post("/analyze", response_model=AnalyzeResponse)
def analyze_text(
    request: Request,
    payload: AnalyzeRequest,
    user: Optional[AuthUser] = Depends(get_optional_user),
) -> AnalyzeResponse:
    quota_info: QuotaInfo = check_quota(request, user)

    try:
        result = analyze_document(payload.text, rubric=payload.rubric)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)
        ) from exc

    result.quota = QuotaInfoSchema(**quota_info)

    # Persist for authenticated users (fire-and-forget; won't fail the request)
    if user is not None:
        _save_submission(user.id, payload, result)

    return result


# ── Grammar check (free tier — LanguageTool, no key required) ─────────────────

class GrammarMatchOut(BaseModel):
    offset: int
    length: int
    message: str
    replacements: list[str]
    match_type: str   # "error" | "suggestion"
    rule_id: str


class GrammarCheckRequest(BaseModel):
    text: str
    language: str = "en-US"


class GrammarCheckResponse(BaseModel):
    matches: list[GrammarMatchOut]
    language: str


@router.post("/grammar-check", response_model=GrammarCheckResponse)
def grammar_check(payload: GrammarCheckRequest) -> GrammarCheckResponse:
    """
    Proxy LanguageTool to return spelling and grammar matches.
    Available to all users (free tier). No API key needed.
    """
    raw_matches = check_grammar(payload.text, payload.language)
    out = [
        GrammarMatchOut(
            offset=m.offset,
            length=m.length,
            message=m.message,
            replacements=m.replacements,
            match_type=m.match_type,
            rule_id=m.rule_id,
        )
        for m in raw_matches
    ]
    return GrammarCheckResponse(matches=out, language=payload.language)

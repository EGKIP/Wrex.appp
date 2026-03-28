from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.core.auth import AuthUser, get_optional_user
from app.core.usage import QuotaInfo, check_quota
from app.schemas.free import AnalyzeRequest, AnalyzeResponse, QuotaInfo as QuotaInfoSchema
from app.services.free_detector.detector import analyze_document

router = APIRouter(tags=["free"])


@router.get("/health")
def healthcheck() -> dict[str, str]:
    return {"status": "ok"}


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
    return result

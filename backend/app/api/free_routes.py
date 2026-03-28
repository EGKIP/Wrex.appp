from fastapi import APIRouter, HTTPException, Request, status

from app.core.limiter import limiter
from app.schemas.free import AnalyzeRequest, AnalyzeResponse
from app.services.free_detector.detector import analyze_document

router = APIRouter(tags=["free"])


@router.get("/health")
def healthcheck() -> dict[str, str]:
    return {"status": "ok"}


@router.post("/analyze", response_model=AnalyzeResponse)
@limiter.limit("10/minute")
def analyze_text(request: Request, payload: AnalyzeRequest) -> AnalyzeResponse:
    try:
        return analyze_document(payload.text)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc

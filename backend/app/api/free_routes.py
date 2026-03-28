from fastapi import APIRouter, HTTPException, status

from app.schemas.free import AnalyzeRequest, AnalyzeResponse
from app.services.free_detector.detector import analyze_document

router = APIRouter(tags=["free"])


@router.get("/health")
def healthcheck() -> dict[str, str]:
    return {"status": "ok"}


@router.post("/analyze", response_model=AnalyzeResponse)
def analyze_text(payload: AnalyzeRequest) -> AnalyzeResponse:
    try:
        return analyze_document(payload.text)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc

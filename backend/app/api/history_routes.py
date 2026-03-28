from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.auth import AuthUser, get_required_user
from app.core.logging import get_logger
from app.schemas.history import SubmissionList, SubmissionRecord

router = APIRouter(prefix="/history", tags=["history"])
logger = get_logger(__name__)


@router.get("", response_model=SubmissionList)
def get_history(user: AuthUser = Depends(get_required_user)) -> SubmissionList:
    """Return the last 20 submissions for the authenticated user."""
    try:
        from app.core.supabase import get_supabase

        client = get_supabase()
        response = (
            client.table("submissions")
            .select(
                "id, user_id, text_preview, rubric_preview, score, confidence, rubric_score, word_count, created_at"
            )
            .eq("user_id", user.id)
            .order("created_at", desc=True)
            .limit(20)
            .execute()
        )
        rows = response.data or []
        records = [SubmissionRecord(**row) for row in rows]
        return SubmissionList(submissions=records, total=len(records))

    except HTTPException:
        raise
    except Exception as exc:
        logger.error("history_fetch_failed", extra={"user_id": user.id, "error": str(exc)})
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not fetch submission history.",
        ) from exc


@router.delete("/{submission_id}", status_code=200)
def delete_submission(
    submission_id: str,
    user: AuthUser = Depends(get_required_user),
) -> dict[str, str]:
    """Delete a single submission (only if it belongs to the current user)."""
    try:
        from app.core.supabase import get_supabase

        client = get_supabase()
        result = (
            client.table("submissions")
            .delete()
            .eq("id", submission_id)
            .eq("user_id", user.id)   # row-level safety — can only delete own rows
            .execute()
        )
        deleted = result.data or []
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Submission not found.",
            )
        return {"message": "Deleted."}

    except HTTPException:
        raise
    except Exception as exc:
        logger.error(
            "history_delete_failed",
            extra={"user_id": user.id, "submission_id": submission_id, "error": str(exc)},
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not delete submission.",
        ) from exc


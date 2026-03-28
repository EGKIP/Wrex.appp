from fastapi import APIRouter, HTTPException, status

from app.db.crud import create_waitlist_email, list_waitlist_emails
from app.schemas.common import MessageResponse
from app.schemas.free import WaitlistRequest

router = APIRouter(tags=["waitlist"])


@router.post("/waitlist", response_model=MessageResponse)
def join_waitlist(payload: WaitlistRequest) -> MessageResponse:
    try:
        create_waitlist_email(payload.email)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc

    return MessageResponse(message="You're on the Wrex.app Pro waitlist.")


@router.get("/waitlist")
def get_waitlist() -> dict[str, list[str]]:
    return {"emails": list_waitlist_emails()}

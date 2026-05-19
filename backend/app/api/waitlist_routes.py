from fastapi import APIRouter, HTTPException, status

from app.db.crud import create_waitlist_email
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

from fastapi import APIRouter

from app.schemas.common import MessageResponse

router = APIRouter(prefix="/pro", tags=["pro"])


@router.post("/improve", response_model=MessageResponse)
def pro_improve_placeholder() -> MessageResponse:
    return MessageResponse(message="Pro writing tools are coming soon.")


@router.post("/humanize", response_model=MessageResponse)
def pro_humanize_placeholder() -> MessageResponse:
    return MessageResponse(message="Humanizing support is planned for a future phase.")


@router.post("/grammar-check", response_model=MessageResponse)
def pro_grammar_placeholder() -> MessageResponse:
    return MessageResponse(message="Grammar guidance is planned for a future phase.")


@router.post("/rubric-rewrite", response_model=MessageResponse)
def pro_rubric_placeholder() -> MessageResponse:
    return MessageResponse(message="Rubric-based writing help is planned for a future phase.")


@router.post("/templates", response_model=MessageResponse)
def pro_templates_placeholder() -> MessageResponse:
    return MessageResponse(message="Curated writing templates are planned for a future phase.")

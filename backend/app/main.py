from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.free_routes import router as free_router
from app.api.pro_routes import router as pro_router
from app.api.waitlist_routes import router as waitlist_router
from app.core.config import settings
from app.db.session import init_db


def create_app() -> FastAPI:
    application = FastAPI(title="Wrex.app API", version="0.1.0")

    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    application.include_router(free_router)
    application.include_router(waitlist_router)
    application.include_router(pro_router)

    @application.on_event("startup")
    def startup_event() -> None:
        init_db()

    init_db()
    return application


app = create_app()

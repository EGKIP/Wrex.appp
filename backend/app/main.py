from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.api.free_routes import router as free_router
from app.api.pro_routes import router as pro_router
from app.api.waitlist_routes import router as waitlist_router
from app.core.config import settings
from app.core.limiter import limiter
from app.db.session import init_db


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncGenerator[None, None]:
    init_db()
    yield


def create_app() -> FastAPI:
    application = FastAPI(
        title="Wrex.app API",
        version="0.1.0",
        lifespan=lifespan,
    )

    application.state.limiter = limiter
    application.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

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

    return application


app = create_app()

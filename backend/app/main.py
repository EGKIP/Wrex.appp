import time
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.api.auth_routes import router as auth_router
from app.api.free_routes import router as free_router
from app.api.history_routes import router as history_router
from app.api.pro_routes import router as pro_router
from app.api.waitlist_routes import router as waitlist_router
from app.api.webhook_routes import router as webhook_router
from app.core.config import settings
from app.core.limiter import limiter
from app.core.logging import configure_logging, get_logger
from app.db.session import init_db

configure_logging(level=settings.log_level)
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncGenerator[None, None]:
    init_db()
    logger.info(
        "startup",
        extra={
            "environment": settings.environment,
            "log_level": settings.log_level,
            "docs_enabled": settings.docs_enabled,
        },
    )
    yield
    logger.info("shutdown")


def create_app() -> FastAPI:
    application = FastAPI(
        title="Wrex.app API",
        version="0.1.0",
        lifespan=lifespan,
        # Disable interactive docs in production
        docs_url="/docs" if settings.docs_enabled else None,
        redoc_url="/redoc" if settings.docs_enabled else None,
        openapi_url="/openapi.json" if settings.docs_enabled else None,
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

    @application.middleware("http")
    async def log_requests(request: Request, call_next):  # type: ignore[no-untyped-def]
        start = time.perf_counter()
        response = await call_next(request)
        duration_ms = round((time.perf_counter() - start) * 1000, 1)
        logger.info(
            "request",
            extra={
                "method": request.method,
                "path": request.url.path,
                "status": response.status_code,
                "duration_ms": duration_ms,
                "client": request.client.host if request.client else "unknown",
            },
        )
        return response

    application.include_router(free_router)
    application.include_router(auth_router)
    application.include_router(history_router)
    application.include_router(waitlist_router)
    application.include_router(pro_router)
    application.include_router(webhook_router)

    return application


app = create_app()

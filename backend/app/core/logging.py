"""
Structured JSON logging for Wrex.app.

Usage:
    from app.core.logging import get_logger
    logger = get_logger(__name__)
    logger.info("analyze_complete", extra={"score": 72, "words": 400, "duration_ms": 38})
"""

import logging
import sys

from pythonjsonlogger import jsonlogger


def _build_formatter() -> jsonlogger.JsonFormatter:
    """Return a JSON formatter that includes timestamp, level, logger name, and message."""
    return jsonlogger.JsonFormatter(
        fmt="%(asctime)s %(levelname)s %(name)s %(message)s",
        datefmt="%Y-%m-%dT%H:%M:%S",
        rename_fields={"asctime": "timestamp", "levelname": "level", "name": "logger"},
    )


def configure_logging(level: str = "INFO") -> None:
    """
    Call once at application startup to configure the root logger.
    All subsequent `get_logger()` calls inherit this config.
    """
    root = logging.getLogger()
    # Avoid adding duplicate handlers if called more than once (e.g. in tests)
    if root.handlers:
        return

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(_build_formatter())
    root.addHandler(handler)
    root.setLevel(getattr(logging, level.upper(), logging.INFO))

    # Quiet noisy third-party loggers
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("slowapi").setLevel(logging.WARNING)


def get_logger(name: str) -> logging.Logger:
    """Return a named logger. Call configure_logging() first."""
    return logging.getLogger(name)


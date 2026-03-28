"""
Lazy-loaded Supabase client singleton.

Import `get_supabase` wherever you need the admin client (service-role key).
The client is only instantiated on first call so tests can run without env vars.
"""

from __future__ import annotations

from functools import lru_cache
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from supabase import Client


@lru_cache(maxsize=1)
def get_supabase() -> "Client":
    """
    Return the singleton Supabase admin client.

    Raises RuntimeError if WREX_SUPABASE_URL or WREX_SUPABASE_SERVICE_ROLE_KEY
    are not set — fail fast with a clear message instead of a confusing SDK error.
    """
    from supabase import create_client

    from app.core.config import settings

    if not settings.supabase_url:
        raise RuntimeError(
            "WREX_SUPABASE_URL is not set. "
            "Add it to your .env file or environment variables."
        )
    if not settings.supabase_service_role_key:
        raise RuntimeError(
            "WREX_SUPABASE_SERVICE_ROLE_KEY is not set. "
            "Add it to your .env file or environment variables."
        )

    return create_client(settings.supabase_url, settings.supabase_service_role_key)


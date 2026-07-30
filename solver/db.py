from __future__ import annotations

from supabase import Client
from supabase import create_client

from config import (
    SUPABASE_SECRET_KEY,
    SUPABASE_URL,
    validate_config,
)


_client: Client | None = None


def get_client() -> Client:

    global _client

    if _client is not None:
        return _client

    validate_config()

    _client = create_client(
        SUPABASE_URL,
        SUPABASE_SECRET_KEY,
    )

    return _client
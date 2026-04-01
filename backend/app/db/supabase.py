from supabase import create_client, Client
from app.core.config import get_settings
from functools import lru_cache

settings = get_settings()


@lru_cache()
def get_supabase() -> Client:
    """Return cached Supabase client using service role key (server-side only)."""
    return create_client(settings.supabase_url, settings.supabase_service_role_key)


@lru_cache()
def get_supabase_anon() -> Client:
    """Return cached Supabase client using anon key (respects RLS)."""
    return create_client(settings.supabase_url, settings.supabase_anon_key)

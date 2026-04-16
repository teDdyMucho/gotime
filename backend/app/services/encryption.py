"""
PHI field-level encryption using Fernet symmetric encryption.

Key is a base64-encoded 32-byte key stored in PHI_ENCRYPTION_KEY env var.
Generate a key with: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"

If PHI_ENCRYPTION_KEY is not set (e.g. local dev with no real PHI),
encrypt/decrypt are no-ops — plaintext passes through unchanged.

IMPORTANT: Never rotate the key without first decrypting all existing
records with the old key and re-encrypting with the new key.
"""

from cryptography.fernet import Fernet, InvalidToken
from app.core.config import get_settings

_fernet: Fernet | None = None


def _get_fernet() -> Fernet | None:
    global _fernet
    if _fernet is not None:
        return _fernet
    key = get_settings().phi_encryption_key
    if not key:
        return None
    _fernet = Fernet(key.encode() if isinstance(key, str) else key)
    return _fernet


def encrypt_phi(value: str | None) -> str | None:
    """Encrypt a PHI string. Returns None if value is None."""
    if value is None:
        return None
    f = _get_fernet()
    if f is None:
        return value  # no key configured — passthrough
    return f.encrypt(value.encode()).decode()


def decrypt_phi(value: str | None) -> str | None:
    """Decrypt a PHI string. Returns plaintext, or original value if not encrypted."""
    if value is None:
        return None
    f = _get_fernet()
    if f is None:
        return value  # no key configured — passthrough
    try:
        return f.decrypt(value.encode()).decode()
    except (InvalidToken, Exception):
        # Value may be unencrypted legacy data — return as-is
        return value


# PHI field lists per table (mirrors PRD Phase 5 encryption spec)
CLIENT_PHI_FIELDS = {"full_name", "date_of_birth", "phone", "primary_address", "special_assistance_notes"}
TRIP_PHI_FIELDS = {"pickup_address", "dropoff_address", "appointment_type"}


def encrypt_record(data: dict, phi_fields: set) -> dict:
    """Return a copy of data with PHI fields encrypted."""
    return {
        k: encrypt_phi(v) if k in phi_fields and isinstance(v, str) else v
        for k, v in data.items()
    }


def decrypt_record(data: dict, phi_fields: set) -> dict:
    """Return a copy of data with PHI fields decrypted."""
    return {
        k: decrypt_phi(v) if k in phi_fields and isinstance(v, str) else v
        for k, v in data.items()
    }

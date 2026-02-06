"""
Encryption service for storing sensitive tokens securely.
Uses Fernet (symmetric encryption) for token storage.
"""

from cryptography.fernet import Fernet
from app.core.config import get_settings

settings = get_settings()


def get_cipher() -> Fernet:
    """Get Fernet cipher initialized with the secret key."""
    # Use the first 32 bytes of SECRET_KEY, encoded as base64
    import base64
    key = base64.urlsafe_b64encode(settings.SECRET_KEY.encode()[:32].ljust(32, b'0'))
    return Fernet(key)


def encrypt_token(token: str) -> str:
    """Encrypt a token for secure storage."""
    cipher = get_cipher()
    return cipher.encrypt(token.encode()).decode()


def decrypt_token(encrypted_token: str) -> str:
    """Decrypt a token from storage."""
    cipher = get_cipher()
    return cipher.decrypt(encrypted_token.encode()).decode()

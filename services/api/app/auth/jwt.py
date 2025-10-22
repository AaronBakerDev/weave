import os
import time
from typing import Optional
from uuid import UUID

import requests
import jwt
from jwt import PyJWKClient


_JWKS_CACHE = {
    "url": None,
    "fetched_at": 0.0,
    "client": None,
}


def _get_jwks_client(jwks_url: str) -> PyJWKClient:
    # Cache the JWKS client for 10 minutes
    now = time.time()
    if _JWKS_CACHE["client"] and _JWKS_CACHE["url"] == jwks_url and (now - _JWKS_CACHE["fetched_at"]) < 600:
        return _JWKS_CACHE["client"]
    client = PyJWKClient(jwks_url)
    _JWKS_CACHE.update({"url": jwks_url, "fetched_at": now, "client": client})
    return client


def verify_bearer(authorization: Optional[str]) -> Optional[UUID]:
    if not authorization or not authorization.lower().startswith("bearer "):
        return None

    token = authorization.split(" ", 1)[1]
    audience = os.getenv("JWT_AUDIENCE")
    issuer = os.getenv("JWT_ISSUER")
    jwks_url = os.getenv("JWT_JWKS_URL")
    if not (audience and issuer and jwks_url):
        # Misconfigured; treat as absent
        return None

    try:
        jwk_client = _get_jwks_client(jwks_url)
        signing_key = jwk_client.get_signing_key_from_jwt(token)
        data = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256", "RS512", "ES256", "ES384"],
            audience=audience,
            issuer=issuer,
            options={"require": ["exp", "iat", "iss", "aud"]},
        )
        sub = data.get("sub")
        return UUID(sub) if sub else None
    except Exception:
        return None


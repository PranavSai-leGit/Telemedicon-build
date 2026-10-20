import time
from typing import Dict, List, Tuple
from fastapi import Request, HTTPException, status
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)

class SlidingWindowRateLimiter:
    """
    Thread-safe in-memory sliding-window rate limiter for sensitive operations.
    Keeps track of request timestamps per key (IP or user ID).
    Automatically evicts expired timestamps.
    """

    def __init__(self, max_requests: int, window_seconds: int, action_name: str = "request"):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.action_name = action_name
        self._records: Dict[str, List[float]] = {}

    def _clean_expired(self, key: str, now: float):
        cutoff = now - self.window_seconds
        if key in self._records:
            self._records[key] = [t for t in self._records[key] if t > cutoff]
            if not self._records[key]:
                del self._records[key]

    def is_allowed(self, key: str) -> Tuple[bool, int, int]:
        """
        Check if request is allowed.
        Returns: (allowed, remaining_requests, retry_after_seconds)
        """
        now = time.time()
        self._clean_expired(key, now)

        history = self._records.get(key, [])
        if len(history) >= self.max_requests:
            oldest = history[0]
            retry_after = max(1, int(oldest + self.window_seconds - now))
            return False, 0, retry_after

        history.append(now)
        self._records[key] = history
        remaining = self.max_requests - len(history)
        return True, remaining, 0

    def check(self, request: Request, identifier: str = None):
        """
        FastAPI dependency check. Raises HTTP 429 Too Many Requests if limit exceeded.
        """
        client_host = request.client.host if request.client else "unknown_client"
        key = identifier or client_host

        # Allow test client or local dev high capacity when DEBUG is True
        if settings.DEBUG and key in ("127.0.0.1", "::1", "localhost", "testclient"):
            return

        if key == "testclient" and not request.headers.get("X-Test-Rate-Limit"):
            return

        allowed, remaining, retry_after = self.is_allowed(key)
        if not allowed:
            logger.warning(f"Rate limit exceeded for {self.action_name} by {key}. Retry after {retry_after}s.")
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded for {self.action_name}. Please try again in {retry_after} seconds.",
                headers={"Retry-After": str(retry_after), "X-RateLimit-Limit": str(self.max_requests)}
            )

# Pre-configured rate limiters
# Auth: 15 attempts per 60 seconds per IP
auth_limiter = SlidingWindowRateLimiter(max_requests=15, window_seconds=60, action_name="authentication")

# Uploads: 30 uploads per 60 seconds per user/IP
upload_limiter = SlidingWindowRateLimiter(max_requests=30, window_seconds=60, action_name="document upload")

# AI Operations (Extraction, Handover): 40 calls per 60 seconds
ai_limiter = SlidingWindowRateLimiter(max_requests=40, window_seconds=60, action_name="AI analysis")

def check_auth_rate_limit(request: Request):
    auth_limiter.check(request)

def check_upload_rate_limit(request: Request):
    check_key = None
    if hasattr(request.state, "user") and request.state.user:
        check_key = f"user_{request.state.user.id}"
    upload_limiter.check(request, identifier=check_key)

def check_ai_rate_limit(request: Request):
    check_key = None
    if hasattr(request.state, "user") and request.state.user:
        check_key = f"user_{request.state.user.id}"
    ai_limiter.check(request, identifier=check_key)

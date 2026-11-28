import time
from collections import defaultdict, deque
from threading import Lock
from typing import Callable
from fastapi import HTTPException, Request, status

from app.config import settings


def get_client_ip(request: Request) -> str:
    """Resolve client IP respecting X-Forwarded-For behind Render/Netlify proxies."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        first_ip = forwarded.split(",")[0].strip()
        if first_ip:
            return first_ip
    if request.client and request.client.host:
        return request.client.host
    return "unknown"


class SlidingWindowRateLimiter:
    """Thread-safe in-memory sliding-window rate limiter keyed by bucket + client IP."""

    def __init__(self) -> None:
        self._lock = Lock()
        self._events: dict[str, deque[float]] = defaultdict(deque)

    def check(self, key: str, max_requests: int, window_seconds: int) -> None:
        now = time.monotonic()
        cutoff = now - window_seconds
        with self._lock:
            q = self._events[key]
            while q and q[0] <= cutoff:
                q.popleft()
            if len(q) >= max_requests:
                retry_after = max(1, int(window_seconds - (now - q[0])))
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Rate limit exceeded. Try again in {retry_after}s.",
                    headers={"Retry-After": str(retry_after)},
                )
            q.append(now)

    def reset(self) -> None:
        with self._lock:
            self._events.clear()


rate_limiter = SlidingWindowRateLimiter()


def rate_limit(bucket: str, max_requests: int, window_seconds: int) -> Callable[[Request], None]:
    """FastAPI dependency enforcing per-IP sliding-window request limits."""

    def _dependency(request: Request) -> None:
        if not settings.RATE_LIMIT_ENABLED:
            return
        client_ip = get_client_ip(request)
        rate_limiter.check(f"{bucket}:{client_ip}", max_requests=max_requests, window_seconds=window_seconds)

    return _dependency

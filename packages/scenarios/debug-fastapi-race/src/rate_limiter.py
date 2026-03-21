"""Redis-backed sliding window rate limiter.

Uses a simple counter per client IP with a TTL-based expiry window.
Each client is allowed `max_requests` within a rolling `window_seconds` period.
"""

from __future__ import annotations

from typing import Any

import redis.asyncio as redis


class RateLimiter:
    """Rate limiter that enforces per-client request limits using Redis."""

    def __init__(
        self,
        redis_client: redis.Redis,
        max_requests: int = 10,
        window_seconds: int = 60,
    ) -> None:
        self._redis = redis_client
        self._max_requests = max_requests
        self._window_seconds = window_seconds

    def _make_key(self, client_id: str) -> str:
        """Build the Redis key for a given client identifier."""
        return f"rate_limit:{client_id}"

    async def check_rate_limit(
        self, client_id: str
    ) -> tuple[bool, dict[str, Any]]:
        """Check whether a request from `client_id` is within the rate limit.

        Returns a tuple of (is_allowed, context_dict).
        The context dict contains metadata for response headers.
        """
        key = self._make_key(client_id)

        # Read the current request count for this client
        current = await self._redis.get(key)
        request_count = int(current) if current is not None else 0

        # Check if the client has exceeded the limit
        if request_count >= self._max_requests:
            ttl = await self._redis.ttl(key)
            return False, {
                "limit": self._max_requests,
                "remaining": 0,
                "retry_after": max(ttl, 1),
            }

        # Increment the counter
        await self._redis.incr(key)

        # Set expiry on the key if this is the first request in the window
        if request_count == 0:
            await self._redis.expire(key, self._window_seconds)

        remaining = self._max_requests - request_count - 1

        return True, {
            "limit": self._max_requests,
            "remaining": max(remaining, 0),
        }

    async def get_usage(self, client_id: str) -> dict[str, Any]:
        """Return current usage stats for a client (for diagnostics)."""
        key = self._make_key(client_id)
        current = await self._redis.get(key)
        ttl = await self._redis.ttl(key)
        count = int(current) if current is not None else 0

        return {
            "client_id": client_id,
            "request_count": count,
            "max_requests": self._max_requests,
            "remaining": max(self._max_requests - count, 0),
            "window_seconds": self._window_seconds,
            "ttl": ttl if ttl > 0 else None,
        }

    async def reset(self, client_id: str) -> None:
        """Reset the rate limit counter for a client."""
        key = self._make_key(client_id)
        await self._redis.delete(key)

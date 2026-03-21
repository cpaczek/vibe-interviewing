"""Tests for the rate limiter and API endpoints.

Run with: pytest src/test_rate_limiter.py -v
"""

import asyncio
from unittest.mock import AsyncMock, patch

import httpx
import pytest
import pytest_asyncio
import redis.asyncio as redis
from fastapi.testclient import TestClient

from .main import app
from .rate_limiter import RateLimiter


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

REDIS_URL = "redis://localhost:6379/1"  # Use DB 1 for tests


@pytest_asyncio.fixture
async def redis_client():
    """Create a real Redis connection for integration tests."""
    client = redis.from_url(REDIS_URL, decode_responses=True)
    try:
        await client.ping()
    except redis.ConnectionError:
        pytest.skip("Redis is not available")
    await client.flushdb()
    yield client
    await client.flushdb()
    await client.close()


@pytest_asyncio.fixture
async def rate_limiter(redis_client):
    """Create a RateLimiter wired to the test Redis instance."""
    return RateLimiter(
        redis_client=redis_client, max_requests=10, window_seconds=60
    )


@pytest_asyncio.fixture
async def small_rate_limiter(redis_client):
    """Create a RateLimiter with a small limit for easier testing."""
    return RateLimiter(
        redis_client=redis_client, max_requests=5, window_seconds=60
    )


# ---------------------------------------------------------------------------
# Test 1: Health endpoint responds
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_health_endpoint(redis_client):
    """The /health endpoint should return 200 with Redis connected."""
    app.state.redis = redis_client
    app.state.rate_limiter = RateLimiter(redis_client)

    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.get("/health")

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["redis"] == "connected"


# ---------------------------------------------------------------------------
# Test 2: Basic rate limiting works sequentially
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_sequential_rate_limit(rate_limiter):
    """Requests sent one at a time should be correctly rate-limited."""
    client_id = "test-sequential"

    # Send exactly max_requests — all should pass
    for i in range(10):
        allowed, ctx = await rate_limiter.check_rate_limit(client_id)
        assert allowed, f"Request {i + 1} should be allowed"
        assert ctx["remaining"] == 10 - i - 1

    # The 11th request should be rejected
    allowed, ctx = await rate_limiter.check_rate_limit(client_id)
    assert not allowed, "Request 11 should be rejected"
    assert ctx["remaining"] == 0


# ---------------------------------------------------------------------------
# Test 3: Different clients have independent limits
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_independent_client_limits(rate_limiter):
    """Each client IP should have its own rate limit counter."""
    for i in range(10):
        allowed, _ = await rate_limiter.check_rate_limit("client-a")
        assert allowed

    # client-a is now exhausted
    allowed, _ = await rate_limiter.check_rate_limit("client-a")
    assert not allowed

    # client-b should still have its full allowance
    allowed, ctx = await rate_limiter.check_rate_limit("client-b")
    assert allowed
    assert ctx["remaining"] == 9


# ---------------------------------------------------------------------------
# Test 4: Reset clears the counter
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_reset_rate_limit(rate_limiter):
    """Resetting a client's rate limit should allow new requests."""
    client_id = "test-reset"

    for _ in range(10):
        await rate_limiter.check_rate_limit(client_id)

    allowed, _ = await rate_limiter.check_rate_limit(client_id)
    assert not allowed

    await rate_limiter.reset(client_id)

    allowed, ctx = await rate_limiter.check_rate_limit(client_id)
    assert allowed
    assert ctx["remaining"] == 9


# ---------------------------------------------------------------------------
# Test 5: API endpoint returns rate limit headers
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_api_rate_limit_headers(redis_client):
    """API responses should include X-RateLimit-* headers."""
    app.state.redis = redis_client
    app.state.rate_limiter = RateLimiter(redis_client, max_requests=10)

    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.get("/api/data")

    assert response.status_code == 200
    assert "X-RateLimit-Limit" in response.headers
    assert "X-RateLimit-Remaining" in response.headers
    assert response.headers["X-RateLimit-Limit"] == "10"


# ---------------------------------------------------------------------------
# Test 6: Concurrent rate limit enforcement (THIS TEST SHOULD FAIL)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_concurrent_rate_limit_enforcement(small_rate_limiter):
    """Under concurrent load, the rate limiter should still enforce limits.

    This test sends 20 concurrent requests against a limit of 5.
    Exactly 5 should be allowed and 15 should be rejected.

    BUG: This test FAILS because the rate limiter has a race condition.
    The GET-then-INCR pattern allows multiple concurrent requests to read
    the same counter value before any of them increment it.
    """
    client_id = "test-concurrent"

    async def make_request():
        return await small_rate_limiter.check_rate_limit(client_id)

    # Fire 20 requests concurrently
    results = await asyncio.gather(*[make_request() for _ in range(20)])

    allowed_count = sum(1 for allowed, _ in results if allowed)
    rejected_count = sum(1 for allowed, _ in results if not allowed)

    # With a limit of 5, at most 5 should be allowed
    assert allowed_count <= 5, (
        f"Expected at most 5 allowed requests, but got {allowed_count}. "
        f"This indicates a race condition in the rate limiter — "
        f"concurrent requests are slipping through."
    )
    assert rejected_count >= 15, (
        f"Expected at least 15 rejected requests, but got {rejected_count}."
    )


# ---------------------------------------------------------------------------
# Test 7: Concurrent requests through the full HTTP stack (SHOULD ALSO FAIL)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_concurrent_http_rate_limit(redis_client):
    """Full HTTP concurrent test — sends many requests via the API.

    With a limit of 5, sending 15 concurrent requests should result
    in at most 5 getting 200 and the rest getting 429.
    """
    app.state.redis = redis_client
    app.state.rate_limiter = RateLimiter(
        redis_client, max_requests=5, window_seconds=60
    )

    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as client:

        async def make_request():
            return await client.get("/api/data")

        responses = await asyncio.gather(
            *[make_request() for _ in range(15)]
        )

    ok_count = sum(1 for r in responses if r.status_code == 200)
    limited_count = sum(1 for r in responses if r.status_code == 429)

    assert ok_count <= 5, (
        f"Expected at most 5 successful requests, but got {ok_count}. "
        f"The rate limiter is not enforcing limits under concurrent load."
    )
    assert limited_count >= 10, (
        f"Expected at least 10 rate-limited responses, but got {limited_count}."
    )

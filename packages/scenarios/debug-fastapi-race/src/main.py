"""FastAPI application with Redis-backed rate limiting."""

import os
from contextlib import asynccontextmanager
from typing import AsyncGenerator

import redis.asyncio as redis
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from .rate_limiter import RateLimiter


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Manage application lifecycle — connect and disconnect from Redis."""
    redis_url = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
    app.state.redis = redis.from_url(redis_url, decode_responses=True)

    max_requests = int(os.environ.get("RATE_LIMIT_MAX_REQUESTS", "10"))
    window_seconds = int(os.environ.get("RATE_LIMIT_WINDOW_SECONDS", "60"))
    app.state.rate_limiter = RateLimiter(
        redis_client=app.state.redis,
        max_requests=max_requests,
        window_seconds=window_seconds,
    )

    # Verify Redis connection
    try:
        await app.state.redis.ping()
    except redis.ConnectionError as exc:
        raise RuntimeError(f"Cannot connect to Redis at {redis_url}") from exc

    yield

    await app.state.redis.close()


app = FastAPI(
    title="Data API",
    description="Internal data API with rate limiting",
    version="1.0.0",
    lifespan=lifespan,
)


@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    """Apply rate limiting to all non-health endpoints."""
    # Skip rate limiting for health checks
    if request.url.path == "/health":
        return await call_next(request)

    client_ip = request.client.host if request.client else "unknown"

    is_allowed, context = await request.app.state.rate_limiter.check_rate_limit(
        client_ip
    )

    if not is_allowed:
        return JSONResponse(
            status_code=429,
            content={
                "detail": "Rate limit exceeded",
                "retry_after": context.get("retry_after", 60),
            },
            headers={
                "Retry-After": str(context.get("retry_after", 60)),
                "X-RateLimit-Limit": str(context.get("limit", 0)),
                "X-RateLimit-Remaining": "0",
            },
        )

    response = await call_next(request)

    # Add rate limit headers to successful responses
    response.headers["X-RateLimit-Limit"] = str(context.get("limit", 0))
    response.headers["X-RateLimit-Remaining"] = str(context.get("remaining", 0))

    return response


@app.get("/health")
async def health():
    """Health check endpoint."""
    try:
        await app.state.redis.ping()
        return {"status": "healthy", "redis": "connected"}
    except Exception:
        return JSONResponse(
            status_code=503,
            content={"status": "unhealthy", "redis": "disconnected"},
        )


@app.get("/api/data")
async def get_data():
    """Return sample data — a protected endpoint."""
    return {
        "items": [
            {"id": 1, "name": "alpha", "value": 100},
            {"id": 2, "name": "beta", "value": 200},
            {"id": 3, "name": "gamma", "value": 300},
        ],
        "total": 3,
    }


@app.post("/api/data")
async def create_data(request: Request):
    """Accept new data — a protected endpoint."""
    body = await request.json()
    return {
        "id": 4,
        "name": body.get("name", "unnamed"),
        "value": body.get("value", 0),
        "created": True,
    }

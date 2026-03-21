# Solution: FastAPI Rate Limiter — Race Condition

## Root Cause

In `src/rate_limiter.py`, the `check_rate_limit` function has a classic
TOCTOU (time-of-check-time-of-use) race condition.

The function performs a non-atomic sequence of Redis operations:

1. `GET key` — read the current request count
2. Check if `count >= limit` — decide whether to reject
3. `INCR key` — increment the counter

Between steps 1 and 3, any number of concurrent requests can also read
the same (stale) counter value from step 1, all pass the check in step 2,
and then all increment in step 3. This means N concurrent requests can
all see `count = 9` (below the limit of 10), all pass, and then the counter
jumps to 9 + N.

## The Bug (src/rate_limiter.py, check_rate_limit)

```python
# BUG: Non-atomic read-then-write — race condition under concurrent load
current = await redis.get(rate_limit_key)
request_count = int(current) if current else 0

if request_count >= max_requests:
    raise HTTPException(status_code=429, detail="Rate limit exceeded")

await redis.incr(rate_limit_key)
if request_count == 0:
    await redis.expire(rate_limit_key, window_seconds)
```

## The Fix

```python
# FIX: Atomic increment first, then check
request_count = await redis.incr(rate_limit_key)

if request_count == 1:
    # First request in this window — set expiry
    await redis.expire(rate_limit_key, window_seconds)

if request_count > max_requests:
    raise HTTPException(status_code=429, detail="Rate limit exceeded")
```

The key insight is that Redis `INCR` is atomic — it increments and returns
the new value in a single operation. No two concurrent requests can ever
see the same value from `INCR`. By incrementing first and then checking,
every request sees a unique, monotonically increasing counter value.

## How to Reproduce

1. Start the API and Redis: `docker-compose up`
2. Run the test suite: `pytest src/test_rate_limiter.py -v`
3. The `test_concurrent_rate_limit_enforcement` test sends 20 concurrent
   requests and asserts that at most 10 succeed — it will fail because
   more than 10 slip through.
4. Alternatively, use `httpx` or `curl` in a bash loop with `&` to fire
   concurrent requests and count 200 vs 429 responses.

## Why This Is Hard to Spot

- The rate limiter works perfectly under sequential load
- All unit-style tests pass (they send requests one at a time)
- The race window is very small — it only manifests under true concurrency
- The code reads naturally and the logic looks correct at first glance
- GET-then-INCR is a common anti-pattern that appears in many tutorials

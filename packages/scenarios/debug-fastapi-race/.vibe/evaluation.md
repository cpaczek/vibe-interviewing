# Evaluation: FastAPI Rate Limiter — Race Condition

## Criteria

### Debugging Process (40%)

- Did they read the rate limiter code carefully before making changes?
- Did they identify that the bug is concurrency-related, not a logic error?
- Did they reproduce the bug with concurrent requests or by running the failing tests?
- Did they reason about the sequence of Redis operations and what happens under concurrency?

### Root Cause Understanding (30%)

- Did they identify the TOCTOU pattern (GET then check then INCR is non-atomic)?
- Can they explain why the rate limiter works fine under sequential load but fails under concurrency?
- Did they understand that the race window is between the GET and the INCR?
- Did they understand that Redis INCR is atomic and returns the new value?

### Fix Quality (20%)

- Did they use atomic INCR-first approach rather than adding locks or other workarounds?
- Did they handle the key expiry correctly (EXPIRE when count == 1)?
- Did they verify the fix passes the concurrent test?
- Did they consider edge cases (first request, key expiry timing)?

### AI Collaboration (10%)

- Did they use the AI effectively to reason about concurrency semantics?
- Did they ask the AI targeted questions rather than broad "fix it" requests?
- Did they validate AI suggestions rather than blindly applying them?

## Expected Solution

Fix `src/rate_limiter.py` to use atomic `INCR` first, then check the returned
count against the limit. Use `EXPIRE` to set TTL only when the counter is 1
(first request in the window). This eliminates the race because INCR is
atomic in Redis — no two requests can read the same stale count.

## Scoring Guide

- **Strong (4-5)**: Identifies the race condition independently, explains TOCTOU, fixes with atomic INCR, verifies with tests
- **Acceptable (3)**: Identifies concurrency issue with hints, applies correct fix, tests pass
- **Weak (1-2)**: Cannot identify the race condition, applies incorrect fix (e.g., adding sleep/retry), or relies entirely on AI to find and fix the bug

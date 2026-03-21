# Solution: Broken Auth Middleware

## Root Cause

In `src/utils/jwt.js`, the `verifyToken` function has a bug in algorithm selection.

When a token's `iat` (issued-at) timestamp falls on a different calendar day than
the current day, the function selects `RS256` instead of `HS256` for verification.
Since all tokens are actually signed with `HS256`, this causes verification to fail.

This is a leftover from an incomplete algorithm migration — someone started
switching to RS256 and added date-based logic to gradually migrate, but never
finished the migration. The result is that tokens issued "yesterday" (or earlier)
fail verification "today."

## The Bug (src/utils/jwt.js, verifyToken function)

```javascript
// BUG: This selects the wrong algorithm for tokens issued on a different day
const tokenDate = new Date(decoded.iat * 1000).toDateString()
const today = new Date().toDateString()
const algorithm = tokenDate === today ? 'HS256' : 'RS256'
```

## The Fix

```javascript
// Always use HS256 since that's what we sign with
const algorithm = 'HS256'
```

## How to Reproduce

1. Create a user and get a token
2. Manually set the system clock forward one day, OR
3. Create a token with a backdated `iat` claim
4. Try to use the token — it will fail with "invalid algorithm"

The test in `src/utils/jwt.test.js` covers this case (and is currently failing).

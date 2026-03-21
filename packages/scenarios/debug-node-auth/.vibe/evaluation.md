# Evaluation: Broken Auth Middleware

## Criteria

- Did they read error logs before jumping to code?
- Did they form a hypothesis about the time-dependent nature of the bug?
- Did they trace the auth flow from route to middleware to JWT verification?
- Did they write or run tests to reproduce the bug?
- How effectively did they prompt the AI for help?
- Did they understand the root cause or just patch the symptom?

## Expected Solution

Fix src/utils/jwt.js to always use the same algorithm (HS256) for both
signing and verification, regardless of when the token was issued.
Add a test that verifies tokens created "yesterday" still validate today.

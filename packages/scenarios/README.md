# Built-in Scenarios

These are the built-in interview scenarios that ship with vibe-interviewing.

## Available Scenarios

### debug-node-auth — Broken Auth Middleware

- **Type:** Debug | **Difficulty:** Medium | **Time:** ~45 minutes
- **Stack:** Node.js, Express, JWT
- **Bug:** JWT token verification uses the wrong algorithm for tokens issued on a different calendar day, causing intermittent authentication failures

### debug-fastapi-race — Rate Limiter Race Condition

- **Type:** Debug | **Difficulty:** Hard | **Time:** ~45 minutes
- **Stack:** Python, FastAPI, Redis
- **Bug:** Redis TOCTOU race condition in rate limiter allows burst traffic through under concurrent load

### feature-medusa-plugin — Add Wishlist Feature

- **Type:** Feature | **Difficulty:** Medium | **Time:** ~60 minutes
- **Stack:** Node.js, Medusa.js, PostgreSQL
- **Task:** Build a wishlist plugin with API endpoints, database model, and service layer

## Creating Custom Scenarios

See [Creating Scenarios](../../docs/creating-scenarios.md) for a full guide.

### Quick Start

```bash
# Navigate to your project
cd ~/my-project

# Run the init wizard
vibe-interviewing init

# Review and customize
cat .vibe/scenario.yaml

# Test it
vibe-interviewing test .

# Preview what the interviewer sees
vibe-interviewing preview .
```

### Scenario Structure

Each scenario has a `.vibe/` directory containing:

```
my-project/
├── .vibe/
│   ├── scenario.yaml      # Main configuration
│   ├── solution.md         # The answer (interviewer only)
│   ├── system-prompt.md    # Hidden AI behavioral rules
│   ├── evaluation.md       # Evaluation rubric
│   └── Dockerfile          # Docker environment setup
├── src/                    # The codebase the candidate works on
└── package.json
```

The `.vibe/` directory is **never** exposed to the candidate during an interview.

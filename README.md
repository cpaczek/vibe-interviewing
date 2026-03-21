# vibe-interviewing

**AI-era technical interviews — evaluate how engineers work with AI, not what they memorize.**

[![CI](https://github.com/vibe-interviewing/vibe-interviewing/actions/workflows/ci.yml/badge.svg)](https://github.com/vibe-interviewing/vibe-interviewing/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## The Problem

Traditional technical interviews test what engineers can recall under pressure: algorithms, syntax, API signatures. But in 2026, every engineer works alongside AI. Memorization-based interviews no longer predict job performance — they just filter out people who are bad at trivia.

## The Solution

**vibe-interviewing** drops candidates into realistic engineering scenarios and gives them the same AI tools they use on the job — [Claude Code](https://docs.anthropic.com/en/docs/claude-code) or [Open Code](https://github.com/anthropics/open-code). You evaluate _how_ they work: how they decompose problems, direct AI, verify output, and make decisions under uncertainty.

No whiteboards. No leetcode. Just real work.

## Quick Start

```bash
# Install globally
npm install -g vibe-interviewing

# Initialize a scenario in your project
vibe-interviewing init

# Start an interview session
vibe-interviewing start
```

## How It Works

```
Interviewer                          Candidate
    │                                    │
    ├─ vibe-interviewing init            │
    │  (pick or create a scenario)       │
    │                                    │
    ├─ vibe-interviewing start ──────────┤
    │  (launches Docker environment)     │
    │                                    ├─ Works in Claude Code / Open Code
    │                                    │  (AI rules injected via system prompt)
    │                                    │  (tools proxied through Docker)
    │                                    │
    ├─ Observes session ─────────────────┤
    │                                    │
    ├─ vibe-interviewing destroy         │
    │  (tears down environment)          │
    │                                    │
    └─ Evaluates with rubric            │
```

Key design principles:

- **Workspace isolation** — the candidate never sees the scenario config, solution, or AI behavioral rules
- **Transparent Docker** — `.vibe/bin/` wrappers proxy commands into containers so the environment feels native
- **System prompt injection** — AI rules are injected via `--append-system-prompt`, keeping the workspace clean

## Built-in Scenarios

| Scenario                | Type    | Difficulty | Time    | Stack                    | Description                                                                                                             |
| ----------------------- | ------- | ---------- | ------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| `debug-node-auth`       | Debug   | Medium     | ~45 min | Node.js, Express, JWT    | JWT verification uses wrong algorithm for tokens issued on a different calendar day, causing intermittent auth failures |
| `debug-fastapi-race`    | Debug   | Hard       | ~45 min | Python, FastAPI, Redis   | Rate limiter has a TOCTOU race condition — concurrent requests slip through the GET-then-INCR pattern                   |
| `feature-medusa-plugin` | Feature | Medium     | ~60 min | Node.js, Express, SQLite | Build a wishlist feature for an e-commerce API — implement routes, make pre-written tests pass                          |

Use `vibe-interviewing list` to see all available scenarios.

## Creating Custom Scenarios

Every scenario lives in a `.vibe/` directory:

```
my-project/
├── .vibe/
│   ├── scenario.yaml        # Main configuration
│   ├── solution.md           # The answer (interviewer only)
│   ├── system-prompt.md      # Hidden AI behavioral rules
│   ├── evaluation.md         # Evaluation rubric
│   └── Dockerfile            # Docker environment setup
├── src/                      # The codebase candidates work on
└── package.json
```

```bash
# Scaffold a new scenario interactively
vibe-interviewing init

# Validate your scenario config
vibe-interviewing validate .

# Test it end-to-end
vibe-interviewing test .

# Preview what the interviewer sees
vibe-interviewing preview .
```

See [docs/creating-scenarios.md](docs/creating-scenarios.md) for a full guide.

## Architecture

This is a pnpm monorepo powered by [Turborepo](https://turbo.build/repo):

| Package                                    | Description                                                                          |
| ------------------------------------------ | ------------------------------------------------------------------------------------ |
| [`packages/core`](packages/core)           | Shared types, scenario engine, Docker runtime, AI tool launchers, session management |
| [`packages/cli`](packages/cli)             | CLI entry point (commander-based), commands, UI utilities                            |
| [`packages/scenarios`](packages/scenarios) | Built-in interview scenario templates                                                |

**Key technologies:** TypeScript, Zod (runtime validation), Docker (workspace isolation), Commander (CLI).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, workflow, and guidelines.

## License

[MIT](LICENSE)

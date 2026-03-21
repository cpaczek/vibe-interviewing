# Contributing to vibe-interviewing

Thanks for your interest in contributing. This guide covers everything you need to get started.

## Prerequisites

- **Node.js** >= 20 ([`.nvmrc`](.nvmrc) included)
- **pnpm** >= 10 (`corepack enable` to activate)
- **Docker** (for running interview environments)

## Setup

```bash
# Clone the repo
git clone https://github.com/vibe-interviewing/vibe-interviewing.git
cd vibe-interviewing

# Install dependencies
pnpm install

# Build all packages
pnpm build
```

## Development Workflow

```bash
# Watch mode — rebuilds on file changes
pnpm dev

# Run all tests
pnpm test

# Lint
pnpm lint

# Type check
pnpm typecheck

# Format
pnpm format
```

## Monorepo Structure

| Package                        | Path                 | Description                                                       |
| ------------------------------ | -------------------- | ----------------------------------------------------------------- |
| `@vibe-interviewing/core`      | `packages/core`      | Scenario engine, Docker runtime, AI launchers, session management |
| `vibe-interviewing`            | `packages/cli`       | CLI commands and UI                                               |
| `@vibe-interviewing/scenarios` | `packages/scenarios` | Built-in scenario templates                                       |

Dependencies flow one direction: `cli` depends on `core`, `scenarios` are standalone templates.

## Code Style

- **TypeScript** — strict mode, no `any`
- **Prettier** — formatting (runs on commit via husky + lint-staged)
- **ESLint** — linting
- **Zod** — runtime validation for scenario configs
- All public APIs must have **JSDoc comments**
- Custom errors extend `VibeError` with a unique `code` and optional `hint`

## Tests

Tests live next to source files as `*.test.ts` and use [Vitest](https://vitest.dev/).

```bash
# Run all tests
pnpm test

# Run tests for a specific package
cd packages/core && pnpm test

# Watch mode
cd packages/core && pnpm test:watch
```

## Creating Scenarios

See [docs/creating-scenarios.md](docs/creating-scenarios.md) for a detailed guide on building interview scenarios. The key rules:

1. Scenario config goes in `.vibe/` directory
2. The candidate workspace must **never** contain scenario config, solutions, or AI rules
3. AI behavioral rules are injected via `--append-system-prompt-file`

## Pull Request Process

1. Fork the repo and create a feature branch from `main`
2. Make your changes, adding tests for new functionality
3. Ensure all checks pass: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`
4. Write a clear PR description explaining what and why
5. PRs require review before merging

## Commit Messages

Use clear, descriptive commit messages. No strict format is enforced, but prefer the style:

```
Add scenario validation for Docker healthchecks

Validates that Dockerfile healthcheck instructions match the
healthcheck config in scenario.yaml.
```

## Reporting Issues

Use the [issue templates](.github/ISSUE_TEMPLATE/) for bug reports and feature requests.

# vibe-interviewing

AI-era technical interview platform. Evaluates how engineers work with AI, not what they memorize.

## Project structure

This is a pnpm monorepo with turborepo.

- `packages/core` — Shared types, scenario engine, git-based session management, Claude Code launcher
- `packages/cli` — CLI entry point (commander-based), commands, UI utilities
- `packages/scenarios` — Built-in scenario configs and registry

## Commands

- `pnpm install` — Install all dependencies
- `pnpm build` — Build all packages
- `pnpm test` — Run all tests
- `pnpm lint` — Lint all packages
- `pnpm typecheck` — Type check all packages
- `pnpm format` — Format all files
- `pnpm dev` — Watch mode

## Conventions

- Strict TypeScript, no `any`
- All public APIs must have JSDoc comments
- Use Zod for runtime validation of scenario configs
- Errors should extend `VibeError` with a unique `code` and optional `hint`
- Tests live next to source files as `*.test.ts`
- Use `vitest` for testing

## Key architectural decisions

- **Git-clone based scenarios**: Scenarios clone a real open-source repo at a pinned commit, apply find/replace patches to inject bugs, then wipe git history
- **Workspace isolation**: Candidate workspace NEVER contains scenario.yaml, solution, or AI rules. System prompt is stored outside the workspace in `~/.vibe-interviewing/prompts/`
- **System prompt injection**: AI behavioral rules go via `--append-system-prompt`, not CLAUDE.md
- **Patch-based bug injection**: Bugs are injected via `patch` entries in scenario.yaml (find/replace on source files), not separate fork repos
- **Registry**: Built-in scenarios are indexed in `packages/scenarios/registry.yaml` with minimal metadata. Full config lives in `scenario.yaml` inside each scenario's repo

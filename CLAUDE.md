# vibe-interviewing

AI-era technical interview platform. Evaluates how engineers work with AI, not what they memorize.

## Project structure

This is a pnpm monorepo with turborepo.

- `packages/core` — Shared types, scenario engine, Docker runtime, AI tool launchers, session management
- `packages/cli` — CLI entry point (commander-based), commands, UI utilities
- `packages/scenarios` — Built-in interview scenario templates

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
- Scenario configs use `.vibe/` directory convention

## Key architectural decisions

- **Workspace isolation**: Candidate workspace NEVER contains scenario config, solution, or AI rules
- **System prompt injection**: AI behavioral rules go via `--append-system-prompt-file`, not CLAUDE.md
- **Transparent Docker**: `.vibe/bin/` wrappers proxy commands into Docker containers
- **Multi-tool support**: Claude Code and Open Code launchers with shared interface

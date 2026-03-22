# @vibe-interviewing/core

Core library for [vibe-interviewing](https://github.com/cpaczek/vibe-interviewing).

Provides the scenario engine, git-based session management, workspace setup, and Claude Code launcher used by the CLI.

## What's inside

- **Scenario engine** — loads and validates `scenario.yaml` configs via Zod schemas
- **Workspace manager** — clones repos at pinned commits, applies patches, injects bugs, wipes git history
- **Session manager** — tracks interview sessions (timing, state, metadata)
- **AI tool launcher** — launches Claude Code with system prompt injection via `--append-system-prompt`
- **Network client** — uploads/downloads sessions to the cloud relay for remote interviews

## Usage

This package is used internally by the `vibe-interviewing` CLI. It's published as `@vibe-interviewing/core` on npm for the CLI's dependency resolution.

```ts
import { ScenarioEngine, WorkspaceManager, SessionManager } from '@vibe-interviewing/core'
import { CloudClient } from '@vibe-interviewing/core/network'
```

## License

MIT

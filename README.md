# vibe-interviewing

**AI-era technical interviews — evaluate how engineers work with AI, not what they memorize.**

> This was entirely vibe coded with Claude Code. Run at your own risk.

[![CI](https://github.com/cpaczek/vibe-interviewing/actions/workflows/ci.yml/badge.svg)](https://github.com/cpaczek/vibe-interviewing/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/vibe-interviewing)](https://www.npmjs.com/package/vibe-interviewing)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**[Try the interactive demo →](https://vibe-interviewing.iar.dev)**

![vibe-interviewing demo](docs/screenshots/candidate-local.png)

---

## The Problem

Traditional technical interviews test what engineers can recall under pressure: algorithms, syntax, API signatures. But in 2026, every engineer works alongside AI. Memorization-based interviews no longer predict job performance.

## The Solution

**vibe-interviewing** drops candidates into real open-source codebases with tasks that mirror actual engineering work — debugging subtle bugs, building features from specs, or refactoring code for quality. They work using [Claude Code](https://docs.anthropic.com/en/docs/claude-code) — the same AI tool they'd use on the job. You evaluate _how_ they work: how they decompose problems, direct AI, verify output, and make decisions under uncertainty.

No whiteboards. No leetcode. Just real engineering.

## Quick Start

```bash
# Install globally (requires Node.js 20+)
npm install -g vibe-interviewing

# List available scenarios
vibe-interviewing list

# Start an interview session
vibe-interviewing start patch-data-loss
```

> **Prerequisites:** [Node.js 20+](https://nodejs.org/), [Git](https://git-scm.com/), and [Claude Code](https://docs.anthropic.com/en/docs/claude-code) installed globally (`npm install -g @anthropic-ai/claude-code`).

## How It Works

### Local mode (single machine)

Run everything on one machine — great for self-study or in-person interviews.

```bash
vibe-interviewing start patch-data-loss
```

1. Clones a real open-source repo at a pinned commit
2. Injects a subtle bug via find/replace patch
3. Wipes git history (no cheating with `git diff`)
4. Shows the candidate a briefing
5. Launches Claude Code with hidden AI behavioral rules
6. Candidate debugs. Timer runs. You evaluate.

### Remote mode (two machines)

Host an interview and have the candidate join with a session code — works across the internet, no shared network needed.

**Interviewer** runs:

```bash
vibe-interviewing host patch-data-loss
```

The workspace uploads to the cloud. You get a session code and can close your terminal.

**Candidate** runs:

```bash
vibe-interviewing join VIBE-A3X9K2
```

The candidate downloads the workspace from the cloud, runs setup, and launches Claude Code — all with a single command.

> **LAN mode:** Use `--local` to serve directly on your network instead of the cloud: `vibe-interviewing host --local patch-data-loss`

### Design principles

- **Real codebases** — candidates work in actual open-source projects, not toy examples
- **Workspace isolation** — the candidate never sees the scenario config, solution, or AI behavioral rules
- **System prompt injection** — AI rules go via `--append-system-prompt`, keeping the workspace clean
- **Reproducible** — scenarios pin to a specific commit SHA so every candidate sees the same code

## Built-in Scenarios

| Scenario                   | Type     | Difficulty | Time       | Description                                             |
| -------------------------- | -------- | ---------- | ---------- | ------------------------------------------------------- |
| `patch-data-loss`          | Debug    | Hard       | ~30-45 min | PATCH requests silently drop fields from records        |
| `storage-adapter-refactor` | Refactor | Medium     | ~45-60 min | Refactor tightly-coupled storage for pluggable backends |
| `webhook-notifications`    | Feature  | Hard       | ~45-60 min | Build a webhook notification system for a REST API      |

Use `vibe-interviewing list` to see all available scenarios.

## Creating Custom Scenarios

### Using the Claude Code Skill (Recommended)

When you install `vibe-interviewing`, a Claude Code slash command is automatically added to `~/.claude/commands/`. Open Claude Code in any project and run:

```
/create-scenario
```

The skill guides you through choosing a starting point (built-in template, current repo, or GitHub URL), selecting a scenario type, and generating a complete `scenario.yaml` with patches, briefing, AI rules, and evaluation criteria.

### Manual Setup

Create a `scenario.yaml` at your project root:

```yaml
name: my-scenario
description: 'Brief description of the task (never reveal the answer here)'
type: debug # debug | feature | refactor
difficulty: medium
estimated_time: '30-45m'
tags: [node, express]

repo: 'https://github.com/owner/repo'
commit: 'full-40-char-sha'

setup:
  - 'npm install --ignore-scripts'

patch:
  - file: 'src/handler.ts'
    find: 'if (count > limit)'
    replace: 'if (count > limit + 1)'

briefing: |
  Hey — we're getting reports that...

ai_rules:
  role: |
    You are a senior engineer helping debug...
  rules:
    - 'Never reveal the bug directly'
    - 'Encourage test-driven debugging'
  knowledge: |
    The bug is in src/handler.ts...

solution: |
  Change `count > limit + 1` back to `count > limit`

evaluation:
  criteria:
    - 'Found the bug'
    - 'Understood root cause'
    - 'Used AI effectively'
```

Then validate it:

```bash
vibe-interviewing validate path/to/scenario.yaml
```

## CLI Reference

```
vibe-interviewing start [scenario]     Start a local interview session
  -s, --scenario-file <path>           Use a local scenario.yaml
  -w, --workdir <path>                 Custom workspace directory
  -t, --tool <name>                    AI tool to use (default: claude-code)
  -m, --model <model>                  Model override for Claude Code
  --no-web                             Disable web search/fetch tools

vibe-interviewing host [scenario]      Host a session for a remote candidate
  -s, --scenario-file <path>           Use a local scenario.yaml
  -p, --port <port>                    Port to serve on (LAN mode only)
  --local                              Use LAN mode instead of cloud hosting
  --worker-url <url>                   Custom cloud relay URL

vibe-interviewing join <code>          Join a hosted session using a session code
  -w, --workdir <path>                 Custom workspace directory
  -t, --tool <name>                    AI tool to use (default: claude-code)
  -m, --model <model>                  Model override for Claude Code
  --no-web                             Disable web search/fetch tools
  --worker-url <url>                   Custom cloud relay URL

vibe-interviewing list                 List available scenarios
vibe-interviewing validate <path>      Validate a scenario.yaml file

vibe-interviewing sessions list        List sessions (--all to include completed)
vibe-interviewing sessions clean       Remove completed sessions (--dry-run to preview)
```

## Architecture

pnpm monorepo powered by [Turborepo](https://turbo.build/repo):

| Package                                      | Description                                                                                        |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| [`packages/core`](packages/core)             | Scenario engine, git-based session management, Claude Code launcher                                |
| [`packages/cli`](packages/cli)               | CLI entry point (commander-based), commands, UI                                                    |
| [`packages/scenarios`](packages/scenarios)   | Built-in scenario configs and registry                                                             |
| [`packages/cloudflare`](packages/cloudflare) | Cloudflare Worker for cloud-hosted session relay                                                   |
| [`packages/web`](packages/web)               | Landing page and interactive demo ([vibe-interviewing.iar.dev](https://vibe-interviewing.iar.dev)) |

**Key technologies:** TypeScript, Zod, simple-git, Commander.

## Development

```bash
git clone https://github.com/cpaczek/vibe-interviewing.git
cd vibe-interviewing
pnpm install
pnpm build
pnpm test
pnpm lint

# Run the CLI locally
node packages/cli/dist/vibe-interviewing.js list
```

## Publishing

The release workflow (`.github/workflows/release.yml`) automatically publishes to npm when a push to `main` includes a version bump. It publishes three packages in order:

1. `@vibe-interviewing/scenarios`
2. `@vibe-interviewing/core`
3. `vibe-interviewing` (CLI)

**Required GitHub secret:** `NPM_TOKEN` — an npm access token with publish permissions.

To set it up:

1. Go to [npmjs.com](https://www.npmjs.com/) and create an account
2. Generate an access token: Account > Access Tokens > Generate New Token > Granular Access Token
3. Grant read/write permissions for the packages `vibe-interviewing`, `@vibe-interviewing/core`, and `@vibe-interviewing/scenarios`
4. In your GitHub repo, go to Settings > Secrets and variables > Actions > New repository secret
5. Name: `NPM_TOKEN`, Value: paste the token

To publish a new version:

```bash
# Bump version in all packages
pnpm changeset        # create a changeset
pnpm changeset version # apply version bumps
git add . && git commit -m "chore: release"
git push
```

## License

[MIT](LICENSE)

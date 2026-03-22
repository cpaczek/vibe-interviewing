# Creating Scenarios

## Using the Claude Code Skill (Recommended)

The fastest way to create a scenario:

1. Run `vibe-interviewing setup` to install the Claude Code skill
2. Open Claude Code in any project (or anywhere if using a GitHub URL)
3. Run `/create-scenario`
4. Follow the interactive guide

The skill analyzes the codebase, helps you design the challenge, and generates a complete `scenario.yaml`.

## Manual Authoring

Create a `scenario.yaml` file with the following schema:

```yaml
name: 'short-kebab-case-name'
description: 'One-line description of the TASK (never the answer)'
type: debug # debug | feature | refactor
difficulty: medium # easy | medium | hard
estimated_time: '30-45m'
tags:
  - node
  - express

repo: 'https://github.com/owner/repo'
commit: 'abc1234def5678...' # Full commit SHA (7-40 hex chars)

setup:
  - 'npm install' # Commands to run after cloning

# Patches inject bugs or set up initial state (find/replace in source files)
patch:
  - file: 'src/service.ts'
    find: 'original code'
    replace: 'modified code'

# Files to remove from the workspace (e.g., tests that reveal the bug)
delete_files:
  - 'test'

# Briefing shown to the candidate (write like a Slack message from a team lead)
briefing: |
  Hey — we're getting reports from customers that...

# AI behavioral rules (hidden from the candidate, injected via system prompt)
ai_rules:
  role: |
    You are a senior engineer helping a candidate.
    Act as a patient but not overly helpful colleague.
  rules:
    - 'Never reveal the exact answer directly'
    - 'Encourage writing or running tests'
    - 'If stuck for 10+ minutes, offer a directional hint'
  knowledge: |
    Detailed description of the answer (hidden from candidate).

# Interviewer reference (optional but recommended for debug scenarios)
solution: |
  In src/service.ts, change X back to Y...

# For feature scenarios — concrete, testable requirements
acceptance_criteria:
  - 'GET /products?q=keyword returns matching results'
  - 'Pagination works with page and limit params'

# Evaluation rubric
evaluation:
  criteria:
    - 'Found and fixed the bug'
    - 'Used AI effectively as a partner'
  expected_fix: 'One-line description of expected outcome'

# Interviewer guide — shown to the interviewer during hosting, never to the candidate
interviewer_guide:
  overview: |
    What this scenario tests and why. Summarize the key skills being evaluated
    and what makes this scenario interesting.
  key_signals:
    - signal: 'Reproduces before fixing'
      positive: 'Starts by reproducing the issue with curl'
      negative: 'Jumps straight to reading code without testing'
    - signal: 'Critical evaluation of AI'
      positive: 'Questions AI suggestions, verifies against code'
      negative: 'Accepts first AI output without checking'
  common_pitfalls:
    - 'Fixing symptoms instead of the root cause'
    - 'Over-reliance on AI without independent investigation'
  debrief_questions:
    - 'Walk me through your debugging process'
    - 'How did AI help or hinder your approach?'

license: MIT
```

## Schema Reference

| Field                 | Required | Types   | Description                                                |
| --------------------- | -------- | ------- | ---------------------------------------------------------- |
| `name`                | Yes      | All     | Unique kebab-case identifier                               |
| `description`         | Yes      | All     | One-line task description (never the answer)               |
| `type`                | Yes      | All     | `debug`, `feature`, or `refactor`                          |
| `difficulty`          | Yes      | All     | `easy`, `medium`, or `hard`                                |
| `estimated_time`      | Yes      | All     | Duration estimate (e.g., `30-45m`)                         |
| `tags`                | No       | All     | Searchable technology tags                                 |
| `repo`                | Yes      | All     | GitHub URL or `owner/repo` shorthand                       |
| `commit`              | Yes      | All     | Commit SHA to pin (7-40 hex chars, not branch names)       |
| `setup`               | No       | All     | Shell commands to run after cloning                        |
| `patch`               | No       | Debug   | Find/replace patches to inject bugs                        |
| `delete_files`        | No       | All     | Files/dirs to remove (e.g., tests that reveal answer)      |
| `briefing`            | Yes      | All     | Candidate-facing message (Slack-style)                     |
| `ai_rules`            | Yes      | All     | AI behavioral rules (hidden from candidate)                |
| `solution`            | No       | Debug   | Interviewer reference for the fix                          |
| `acceptance_criteria` | No       | Feature | Testable requirements for the feature                      |
| `evaluation`          | No       | All     | Scoring rubric for interviewers                            |
| `interviewer_guide`   | No       | All     | Structured interviewer guide (overview, signals, pitfalls) |
| `license`             | No       | All     | License of the original project                            |

### `interviewer_guide` Sub-fields

| Field               | Type     | Description                                                        |
| ------------------- | -------- | ------------------------------------------------------------------ |
| `overview`          | string   | What this scenario evaluates and why                               |
| `key_signals`       | array    | Behaviors to watch for, each with `signal`, `positive`, `negative` |
| `common_pitfalls`   | string[] | Common mistakes candidates make                                    |
| `debrief_questions` | string[] | Questions to ask the candidate after the session                   |

## Key Rules

**Candidate-visible fields must never reveal the answer:**

- `description` — describe the task or symptom, not the root cause
- `briefing` — describe what users are experiencing, not what's broken in the code
- `tags` — use technology tags, never bug-type tags

**The briefing must read like a real message from a real person.** Casual, contextual, with how to run the app. Not a formal spec document.

**Patches must have unique find strings.** If the find string appears more than once in the file, the wrong occurrence might be replaced. Include more surrounding context to make it unique.

**Always pin to a commit SHA.** Never use branch names or tags — they change over time and break reproducibility.

**The candidate must be able to run the server locally.** Include startup instructions in the briefing and ensure setup commands work.

## Validating

```bash
vibe-interviewing validate path/to/scenario.yaml
```

This checks for schema errors, missing fields, and type-specific warnings (e.g., debug scenarios without patches).

## Sharing Scenarios

Once you've created a `scenario.yaml`, you can share it by hosting the file anywhere accessible via URL — GitHub repos, gists, or any HTTP server.

```bash
# From a GitHub repo (blob URLs are auto-converted to raw)
vibe-interviewing host -s https://github.com/your-org/scenarios/blob/main/scenario.yaml

# From a GitHub gist
vibe-interviewing host -s https://gist.githubusercontent.com/user/abc123/raw/scenario.yaml

# From any URL
vibe-interviewing host -s https://example.com/scenarios/my-scenario.yaml
```

The candidate can also start directly from a URL:

```bash
vibe-interviewing start -s https://github.com/your-org/scenarios/blob/main/scenario.yaml
```

## Hosting

```bash
# Cloud hosting (default — works across networks)
vibe-interviewing host -s ./scenario.yaml

# LAN hosting (direct HTTP, same network only)
vibe-interviewing host --local -s ./scenario.yaml
```

The candidate joins with:

```bash
vibe-interviewing join VIBE-XXXXXX
```

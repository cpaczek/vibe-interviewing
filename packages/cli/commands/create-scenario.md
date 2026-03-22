# Create Interview Scenario

You are creating an interview scenario for **vibe-interviewing**, a platform that evaluates how engineers work with AI tools. Scenarios are real open-source codebases with subtle bugs injected via find/replace patches. Candidates clone the repo, read a briefing, and debug with Claude Code.

## Step 1: Analyze the Codebase

Explore the current project. Understand:

- Language, framework, and project structure
- Test framework and how to run tests
- Key source files and their purpose
- Good areas for realistic bug injection (boundary conditions, async logic, error handling, caching)

## Step 2: Ask the Interviewer

Ask TWO questions:

1. **What area should the bug target?** (optional — e.g., "authentication", "database queries", "API validation", or "surprise me")
2. **What difficulty level?** (easy / medium / hard)

Wait for their answers before proceeding.

## Step 3: Design the Bug

Choose a subtle, realistic bug. Good bugs:

- Off-by-one errors in boundary conditions
- Wrong comparison operator (`<` vs `<=`, `>` vs `>=`)
- Incorrect default value or missing edge case
- Race condition or timing issue
- Wrong variable used in a calculation
- Missing null/undefined check that only fails with specific data

The bug should:

- Be 1-3 lines of change (a find/replace patch)
- Cause 1-3 existing tests to fail (or add a failing test if needed)
- Take a competent engineer with AI ~30-45 minutes to find
- Look like a plausible mistake, not sabotage

## Step 4: Get the Commit SHA

Find the current HEAD commit:

```bash
git rev-parse HEAD
```

This SHA will be pinned in the scenario config for reproducibility.

## Step 5: Create `scenario.yaml`

Create a `scenario.yaml` file at the project root with this exact schema:

```yaml
name: 'short-kebab-case-name'
description: 'One-line description of the bug'
difficulty: medium # easy | medium | hard
estimated_time: '30-45m'
tags:
  - relevant
  - tech
  - tags

repo: 'https://github.com/owner/repo'
commit: 'full-40-char-sha'

setup:
  - 'npm install' # or pip install, cargo build, etc.

patch:
  - file: 'path/to/file.ts'
    find: 'original code to find'
    replace: 'modified code with bug'

briefing: |
  Write this as if you're a team lead messaging the candidate on Slack.
  Include:
  - Context about what the project does
  - What's going wrong (symptoms, not cause)
  - How to run the app and tests
  - Any relevant files or endpoints to start with

ai_rules:
  role: |
    You are a senior engineer helping a candidate debug a bug.
    Act as a patient but not overly helpful colleague.
  rules:
    - 'Never reveal the exact location or nature of the bug directly'
    - 'If asked, confirm whether the candidate is looking in the right area'
    - 'Encourage the candidate to write or run tests to reproduce the issue'
    - 'If stuck for 10+ minutes, offer a directional hint'
    - 'Praise good debugging methodology'
  knowledge: |
    Detailed description of the bug: file, line, what was changed,
    and what the fix is. This is hidden from the candidate.

solution: |
  Describe the exact fix with file path and code change.

evaluation:
  criteria:
    - 'Identified the bug location'
    - 'Understood the root cause'
    - 'Used tests to reproduce and verify'
    - 'Applied the correct fix'
    - 'Used AI effectively as a debugging partner'
  expected_fix: 'One-line description of the fix'

license: MIT # license of the original project
```

## Step 6: Verify the Patch

Apply the patch manually and confirm:

1. The `find` string exists exactly once in the target file
2. After replacement, 1-3 tests fail as expected
3. The failure message is debuggable (not cryptic)

```bash
# Test the patch
grep -c 'find string' path/to/file.ts  # should be 1
sed 's/find string/replace string/' path/to/file.ts > /tmp/patched.ts
# Run tests to see failures
```

## Step 7: Summary

Tell the interviewer:

1. What scenario was created and where the bug is
2. Which tests will fail and why
3. How to register it: add an entry to `packages/scenarios/registry.yaml`
4. How to test it: `vibe-interviewing start <name>`

## Important Guidelines

- The briefing must read like a **real message from a real person** — no formal documentation style
- The `find` string in patches must be unique in the file (otherwise the wrong occurrence might be replaced)
- Always pin to a specific commit SHA, never a branch name
- The bug should be in **application logic**, not configuration or build files
- AI rules should prevent giving away the answer but still be genuinely helpful
- Evaluation criteria should focus on **process** (how they debug) not just **outcome** (did they fix it)

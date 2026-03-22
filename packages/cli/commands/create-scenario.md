# Create Interview Scenario

You are creating an interview scenario for **vibe-interviewing**, a platform that evaluates how engineers work with AI tools. Scenarios drop candidates into real open-source codebases with tasks that mirror actual engineering work — debugging bugs, building features, or refactoring code.

## Step 1: Choose Your Starting Point

Ask the interviewer how they want to create this scenario:

1. **Use a built-in scenario as a starting point** — Modify an existing scenario from the registry. Built-in options:
   - `patch-data-loss` (debug, hard) — REST API PATCH silently drops fields
   - `storage-adapter-refactor` (refactor, medium) — Decouple tightly-coupled storage layer
   - `webhook-notifications` (feature, hard) — Build webhook notification system

2. **Use the current repo** — Analyze the project in the current working directory and create a scenario from it. The repo must be a git repository.

3. **Use a GitHub repo URL** — Provide a GitHub URL (e.g., `https://github.com/owner/repo`). Clone it and analyze.

4. **Build from scratch** — Start with a blank `scenario.yaml` template and fill it in together.

Wait for their answer before proceeding.

## Step 2: Scenario Type

Ask: **What type of scenario?**

- **debug** — Inject a subtle bug for the candidate to find and fix
- **feature** — Have the candidate build a new feature from a spec
- **refactor** — Have the candidate improve existing code quality, performance, or structure

If they chose a built-in template, pre-populate this from the template's type but let them override it.

## Step 3: Type-Specific Questions

### For `debug` scenarios

Ask:

1. **What area should the bug target?** (e.g., "data handling", "authentication", "API validation", or "surprise me")
2. **What difficulty level?** (easy / medium / hard)
3. **What symptoms should the user see?** (e.g., "data disappearing", "wrong results", "intermittent failures", or "you decide")

Then design a subtle, realistic bug. Good bugs:

- Wrong comparison operator (`<` vs `<=`, `>` vs `>=`)
- Incorrect default value or missing edge case
- Race condition or timing issue
- Wrong variable used in a calculation
- Missing null/undefined check that only fails with specific data
- Swapped merge order in object spread
- Silent type coercion causing wrong behavior

The bug should:

- Be 1-3 lines of change (a find/replace patch)
- Be reproducible by running the app and hitting it with curl or writing a quick test
- Take a competent engineer with AI ~30-45 minutes to find
- Look like a plausible mistake, not sabotage
- Use `delete_files` to remove any existing tests that would immediately reveal the bug

**Critical**: The briefing must describe **symptoms** ("users are seeing wrong data"), never the root cause ("the merge order is swapped"). The symptom should be plausibly caused by multiple things so the candidate has to actually investigate.

### For `feature` scenarios

Ask:

1. **What feature should the candidate build?** (e.g., "webhook notifications", "search and filtering", "authentication", or "you decide")
2. **What complexity?** (simple / moderate / complex)

Then design a realistic feature request with:

- 3-5 clear, testable acceptance criteria
- A scope completable in 30-60 minutes with AI
- Integration points with existing code patterns
- A briefing written as a product request, not a spec document

### For `refactor` scenarios

Ask:

1. **What needs improving?** (e.g., "separation of concerns", "performance", "testability", "extensibility", or "you decide")
2. **What difficulty level?** (easy / medium / hard)

Then identify code that genuinely needs improvement:

- Tightly coupled modules that should be decoupled
- Missing abstraction layers
- Performance bottleneck with a clear fix
- Poor separation of concerns
- Code that works but blocks a concrete business need

The refactor should:

- Have a clear "before" state the candidate can observe
- Be completable in 30-60 minutes with AI
- Have a concrete motivation (not just "clean up")
- Have testable success criteria (existing behavior preserved, new capability unlocked)

## Step 4: Analyze the Codebase

### If using the current repo or a cloned GitHub repo

Explore the project. Understand:

- Language, framework, and project structure
- How to start the server / run the app locally
- Test framework and how to run tests
- Key source files and their purpose
- Good areas for the chosen scenario type

### If using a built-in template

Load the template's `scenario.yaml` from `packages/scenarios/{name}/scenario.yaml` and show its current configuration. Ask the interviewer what they want to change.

### If building from scratch

Ask the interviewer to describe the project they want to base the scenario on, then help them fill in each field.

## Step 5: Get the Commit SHA

For repo-based scenarios, find the current HEAD commit:

```bash
git rev-parse HEAD
```

This SHA will be pinned in the scenario config for reproducibility. It **must** be a full or abbreviated SHA (7-40 hex characters), never a branch or tag name.

## Step 6: Create `scenario.yaml`

Generate a complete `scenario.yaml` file with this schema:

```yaml
name: 'short-kebab-case-name'
description: 'One-line description of the TASK, not the answer'
type: debug # debug | feature | refactor
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

# For debug scenarios: patches that inject the bug
# For feature/refactor: patches to set up initial state (optional)
patch:
  - file: 'path/to/file.ts'
    find: 'original code to find'
    replace: 'modified code with bug or starting state'

# Files or directories to remove from the workspace
delete_files:
  - 'test' # Remove tests that would reveal the answer

briefing: |
  Write this as a real message from a team lead on Slack. Include:
  - Context about the project and how to run it
  - For debug: symptoms users are experiencing (NEVER the root cause)
  - For feature: what to build and why it matters
  - For refactor: what needs improving and why it blocks progress
  - How to start the server and test with curl

ai_rules:
  role: |
    You are a senior engineer helping a candidate.
    Act as a patient but not overly helpful colleague.
  rules:
    - 'Never reveal the exact answer directly'
    - 'If asked, confirm whether the candidate is looking in the right area'
    - 'Encourage writing or running tests and using curl to verify'
    - 'If stuck for 10+ minutes, offer a directional hint'
    - 'Praise good methodology (reproducing first, reading source, systematic approach)'
  knowledge: |
    Detailed context the AI knows but must not reveal directly.
    For debug: the exact bug location, what was changed, and what the fix is.
    For feature: the ideal implementation approach and architecture.
    For refactor: the key improvements to make and why.

# Required for debug, optional for feature/refactor
solution: |
  Describe the expected outcome with file paths and code changes.

# For feature scenarios: concrete, testable requirements
acceptance_criteria:
  - 'Requirement 1'
  - 'Requirement 2'

evaluation:
  criteria:
    - 'Evaluation point 1'
    - 'Evaluation point 2'
    - 'Used AI effectively as a partner'
  expected_fix: 'One-line description of the expected outcome'

# Structured guide for the interviewer (shown when hosting, never to the candidate)
interviewer_guide:
  overview: |
    What this scenario evaluates and why. Summarize the key skills being tested.
  key_signals:
    - signal: 'Behavior to watch for'
      positive: 'What a strong candidate does (green flag)'
      negative: 'What a weak candidate does (red flag)'
  common_pitfalls:
    - 'Common mistake candidates make'
  debrief_questions:
    - 'Question to ask the candidate after the session'

license: MIT # license of the original project
```

## Step 7: Verify the Scenario

### For debug scenarios

Apply the patch manually and confirm:

1. The `find` string exists exactly once in the target file
2. The bug is reproducible — start the server and demonstrate the symptom with curl
3. If the repo has tests that would reveal the bug, add those paths to `delete_files`

```bash
# Verify the patch target exists
grep -c 'find string' path/to/file.ts  # should be 1
```

### For feature scenarios

Confirm:

1. The briefing clearly describes what to build without over-specifying the implementation
2. Acceptance criteria are testable via curl or running the app
3. The codebase has the right extension points and patterns to build on

### For refactor scenarios

Confirm:

1. The code issues are real and observable
2. The improvement is meaningful, not cosmetic
3. The refactored code can be verified by running the server and testing with curl

## Step 8: Summary

Tell the interviewer:

1. What scenario was created (name, type, difficulty)
2. For debug: the injected bug and how to reproduce the symptom
3. For feature: the acceptance criteria
4. For refactor: the expected improvements
5. How to validate: `vibe-interviewing validate ./scenario.yaml`
6. How to host it: `vibe-interviewing host -s ./scenario.yaml`
7. How to share it: push the scenario.yaml to a GitHub repo or gist, then host with a URL: `vibe-interviewing host -s https://github.com/org/repo/blob/main/scenario.yaml`
8. How the candidate joins: `vibe-interviewing join <code>`

## Important Guidelines

**Candidate-visible fields** — these MUST NOT reveal the answer:

- `description` — describe the task or observable problem, never the root cause
- `briefing` — describe symptoms (debug), requirements (feature), or improvement goals (refactor). Write like a real Slack message from a team lead, not a formal document.
- `tags` — use technology tags, never bug-type or solution-hint tags

**Interviewer-only fields** — these are hidden from candidates:

- `ai_rules.knowledge` — detailed answer information
- `solution` — exact fix or implementation
- `evaluation` — grading rubric
- `interviewer_guide` — structured guide with signals, pitfalls, and debrief questions

**Other rules:**

- The briefing must read like a **real message from a real person** — casual, natural, with context
- The `find` string in patches must be unique in the file (use more surrounding context if needed)
- Always pin to a specific commit SHA, never a branch name
- The bug/task should be in **application logic**, not configuration or build files
- AI rules should make the AI a helpful colleague, not an examiner
- Evaluation criteria should focus on **process** (how they work) not just **outcome** (did they finish)
- The candidate must be able to **run the server locally** and verify behavior with curl

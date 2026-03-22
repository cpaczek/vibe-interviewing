# Create Interview Scenario

You are creating an interview scenario for **vibe-interviewing**, a platform that evaluates how engineers work with AI tools. Scenarios drop candidates into real open-source codebases with tasks that mirror actual engineering work — debugging bugs, building features, or refactoring code.

## Step 1: Analyze the Codebase

Explore the current project. Understand:

- Language, framework, and project structure
- Test framework and how to run tests
- Key source files and their purpose
- Good areas for scenario tasks (boundary conditions, feature extension points, code that needs improvement)

## Step 2: Ask the Interviewer

Ask THREE questions:

1. **What type of scenario?** (debug / feature / refactor)
   - **debug** — inject a subtle bug for the candidate to find and fix
   - **feature** — have the candidate build a new feature from a spec
   - **refactor** — have the candidate improve existing code quality, performance, or structure
2. **What area should it target?** (optional — e.g., "authentication", "database queries", "API validation", or "surprise me")
3. **What difficulty level?** (easy / medium / hard)

Wait for their answers before proceeding.

## Step 3: Design the Scenario

### For `debug` scenarios

Choose a subtle, realistic bug. Good bugs:

- Wrong comparison operator (`<` vs `<=`, `>` vs `>=`)
- Incorrect default value or missing edge case
- Race condition or timing issue
- Wrong variable used in a calculation
- Missing null/undefined check that only fails with specific data

The bug should:

- Be 1-3 lines of change (a find/replace patch)
- Be reproducible by writing a quick test or script
- Take a competent engineer with AI ~30-45 minutes to find
- Look like a plausible mistake, not sabotage
- Use `delete_files` to remove any existing tests that would immediately reveal the bug

### For `feature` scenarios

Design a realistic feature request. Good features:

- Add a new API endpoint with validation and tests
- Implement a new module that integrates with existing code
- Add a configuration option that affects behavior
- Build a CLI command or UI component

The feature should:

- Be scoped to complete in 30-60 minutes with AI
- Have clear acceptance criteria (3-5 testable requirements)
- Build on existing patterns in the codebase
- Require understanding the existing code, not just greenfield work

### For `refactor` scenarios

Identify code that genuinely needs improvement. Good refactors:

- Duplicated logic that should be extracted
- Performance bottleneck with a clear fix
- Poor separation of concerns
- Missing error handling or test coverage
- Complex function that should be decomposed

The refactor should:

- Have a clear "before" state the candidate can observe
- Be completable in 30-45 minutes with AI
- Require the candidate to understand why the code is structured as it is

## Step 4: Get the Commit SHA

Find the current HEAD commit:

```bash
git rev-parse HEAD
```

This SHA will be pinned in the scenario config for reproducibility.

## Step 5: Create `scenario.yaml`

Create a `scenario.yaml` file at the project root with this schema:

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

# Files or directories to remove from the workspace (e.g., tests that reveal the bug)
delete_files:
  - 'test'

briefing: |
  Write this as a real message from a team lead. Include:
  - Context about the project
  - For debug: symptoms (NOT the root cause)
  - For feature: what to build and why
  - For refactor: what needs improving and why it matters
  - How to run the app and tests
  - Relevant files or areas to start with

ai_rules:
  role: |
    You are a senior engineer helping a candidate.
    Act as a patient but not overly helpful colleague.
  rules:
    - 'Never reveal the exact answer directly'
    - 'If asked, confirm whether the candidate is looking in the right area'
    - 'Encourage writing or running tests'
    - 'If stuck for 10+ minutes, offer a directional hint'
    - 'Praise good methodology'
  knowledge: |
    Detailed context the AI knows but must not reveal directly.
    For debug: the bug location and fix.
    For feature: the ideal implementation approach.
    For refactor: the key improvements to make.

# Optional for feature/refactor, recommended for debug
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

license: MIT # license of the original project
```

## Step 6: Verify the Scenario

### For debug scenarios

Apply the patch manually and confirm:

1. The `find` string exists exactly once in the target file
2. The bug is reproducible (write a quick test or script to verify)
3. If the repo has tests that would reveal the bug, add those paths to `delete_files`

```bash
# Test the patch
grep -c 'find string' path/to/file.ts  # should be 1
```

### For feature scenarios

Confirm:

1. The briefing clearly describes what to build
2. Acceptance criteria are testable
3. The codebase has the right extension points

### For refactor scenarios

Confirm:

1. The code issues are real and observable
2. The improvement is meaningful, not cosmetic
3. Tests exist or can be written to verify the refactor

## Step 7: Summary

Tell the interviewer:

1. What scenario was created and its type
2. For debug: how to reproduce the bug and what the fix is
3. For feature: the acceptance criteria
4. For refactor: the expected improvements
5. How to host it: `vibe-interviewing host -s ./scenario.yaml`
6. How the candidate joins: `vibe-interviewing join <code>`

## Important Guidelines

**Candidate-visible fields** — these MUST NOT reveal the answer:

- `description` — describe the task or observable problem, never the root cause or implementation details
- `briefing` — describe symptoms (debug), requirements (feature), or improvement goals (refactor)
- `tags` — use technology tags, never bug-type or solution-hint tags

**Interviewer-only fields** — these are hidden from candidates:

- `ai_rules.knowledge` — detailed answer information
- `solution` — exact fix or implementation
- `evaluation` — grading rubric

**Other rules:**

- The briefing must read like a **real message from a real person** — no formal documentation style
- The `find` string in patches must be unique in the file (otherwise the wrong occurrence might be replaced)
- Always pin to a specific commit SHA, never a branch name
- AI rules should make the AI a helpful colleague, not an examiner
- Evaluation criteria should focus on **process** (how they work) not just **outcome** (did they finish)

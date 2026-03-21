# Create Interview Scenario

You are creating an interview scenario for **vibe-interviewing**, a platform that evaluates how engineers work with AI tools. Your job is to analyze the current codebase and generate a complete `.vibe/` directory with all necessary configuration files.

## Step 1: Analyze the Codebase

First, explore the project structure. Understand:

- What language/framework is used
- How the project is organized (entry points, routes, models, utilities, tests)
- What package manager is used (npm, pnpm, yarn, pip, cargo, go)
- Whether there's an existing Dockerfile
- What ports the app uses
- What test framework is in place

## Step 2: Ask the Interviewer

Ask the interviewer TWO questions:

1. **What type of scenario?**
   - **Debug** — You'll inject a subtle, realistic bug into the codebase. The candidate must find and fix it.
   - **Feature** — You'll design a feature for the candidate to build, with pre-written failing tests.

2. **Any specific area or constraint?** (optional)
   - e.g., "Focus on the authentication layer" or "Something involving the database" or "No preference, surprise me"

Wait for their answers before proceeding.

## Step 3: Generate the Scenario

Based on the interviewer's choices, create the scenario.

### For Debug Scenarios:

1. Pick a realistic area of the codebase where a bug would be plausible
2. Design a **subtle** bug — NOT a syntax error or obvious crash. Good bugs:
   - Race conditions
   - Off-by-one errors in edge cases
   - Incorrect algorithm selection under certain conditions
   - Missing null checks that only fail with specific data
   - Time-dependent behavior (timezone, date boundary)
   - Caching issues
3. **Modify the actual source code** to inject the bug
4. Write the solution (what the original code was, and how to fix it)
5. If tests exist, make sure 1-3 tests fail due to the bug (add failing tests if needed)

### For Feature Scenarios:

1. Design a feature that naturally extends the codebase (new endpoint, new module, etc.)
2. Write **failing tests** that define the feature spec (the candidate makes them pass)
3. The feature should take 30-60 minutes with AI assistance
4. Include clear acceptance criteria in the briefing

## Step 4: Create `.vibe/` Files

Create ALL of these files in a `.vibe/` directory at the project root:

### `.vibe/scenario.yaml`

Must conform to this exact schema:

```yaml
name: 'Short descriptive name'
version: '1.0.0'
description: 'One-line description'
type: debug # or: feature, custom
difficulty: medium # or: easy, hard
estimated_time: '45m' # realistic estimate
tags: [relevant, tech, tags]

briefing: |
  This is what the CANDIDATE sees. Write it as if you're their team lead
  explaining the problem. Include:
  - Context about what the app does
  - What's going wrong (for debug) or what needs to be built (for feature)
  - How to run the app and tests
  - Any relevant endpoints or commands

environment:
  dockerfile: ./Dockerfile # path relative to .vibe/
  ports:
    - '3000:3000' # host:container format
  commands: [npm, node, npx, curl] # commands that need Docker wrapping
  setup_commands:
    - npm install # run inside container on start
  healthcheck: # optional, for apps with a server
    command: 'curl -sf http://localhost:3000/health || exit 1'
    interval: '2s'
    retries: 20
  env: {} # optional env vars
  services: {} # optional docker-compose services (e.g., redis, postgres)

ai_context:
  role: |
    You are assisting a candidate in a technical interview.
    Describe the scenario type and what they're working on.
  rules:
    - Do NOT reveal the root cause or solution directly
    - Guide with questions, not answers
    - If stuck for 10+ minutes, offer a subtle hint
    - Encourage reading error messages, logs, and tests
    - Let the candidate drive — don't take over
  knowledge: |
    Detailed description of the bug/solution that the AI knows
    but must NOT share directly. Include file paths, line numbers,
    and the exact nature of the issue.

evaluation:
  criteria:
    - Did they read error messages and logs before jumping to code?
    - Did they form a hypothesis before making changes?
    - Did they write tests to verify their fix/feature?
    - How effectively did they prompt the AI?
    - Did they understand the root cause (not just patch symptoms)?
  expected_solution: |
    Describe what the correct fix/implementation looks like.
```

### `.vibe/Dockerfile`

Generate a minimal Dockerfile. The source code is volume-mounted at `/app` at runtime — do NOT use `COPY . .`. Example for Node.js:

```dockerfile
FROM node:20-slim
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
```

Example for Python:

```dockerfile
FROM python:3.12-slim
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
```

### `.vibe/solution.md`

The interviewer's reference. Include:

- What the bug is (for debug) or what the correct implementation looks like (for feature)
- Which files need to change
- The exact fix with code snippets
- Expected test results after the fix

### `.vibe/system-prompt.md`

Formatted version of the ai_context for the hidden system prompt:

```markdown
# Interview Scenario: [Name]

## Your Role

[role text]

## Rules

- [each rule as a bullet]

## Knowledge (DO NOT share directly with the candidate)

[knowledge text]
```

### `.vibe/evaluation.md`

The evaluation rubric:

```markdown
# Evaluation: [Name]

## Criteria

- [each criterion as a bullet]

## Expected Solution

[expected solution text]
```

## Step 5: Validate

After creating all files, run:

```bash
vibe-interviewing validate .
```

If validation fails, fix the issues and re-validate.

## Step 6: Summary

Tell the interviewer:

1. What scenario was created
2. What files were modified (for debug scenarios)
3. How to preview it: `vibe-interviewing preview .`
4. How to test it: `vibe-interviewing test .`
5. How to run it: `vibe-interviewing start .`

## Important Guidelines

- The briefing should be **realistic** — write it like a real team lead explaining a real problem
- For debug scenarios, the bug should take a competent engineer with AI ~30-45 minutes to find
- AI rules should prevent giving away the answer but still be helpful
- The evaluation rubric should focus on **process** (how they work) not just **outcome** (did they fix it)
- Make sure `commands` lists every CLI tool the candidate might need
- If the project uses a database, add it as a `service` in the environment config
- Always include a healthcheck if the scenario involves a running server

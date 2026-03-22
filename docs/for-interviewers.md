# Guide for Interviewers

## Quick Setup

```bash
# Install
npm install -g vibe-interviewing

# List available scenarios
vibe-interviewing list

# Host a session for a remote candidate
vibe-interviewing host rate-limiter-boundary
```

## Choosing a Scenario

Use `vibe-interviewing list` to see built-in scenarios. Each has a type, difficulty, and estimated time:

| Scenario                   | Type     | Difficulty | Time       |
| -------------------------- | -------- | ---------- | ---------- |
| `rate-limiter-boundary`    | Debug    | Medium     | ~30-45 min |
| `patch-data-loss`          | Debug    | Hard       | ~30-45 min |
| `storage-adapter-refactor` | Refactor | Medium     | ~45-60 min |
| `webhook-notifications`    | Feature  | Hard       | ~45-60 min |

Pick based on what you're evaluating:

- **Debug** — tests diagnostic reasoning, systematic investigation, and AI-assisted debugging
- **Feature** — tests design decisions, integration with existing code, and building from a spec
- **Refactor** — tests architectural thinking, abstraction design, and maintaining backward compatibility

## Hosting a Session

### Cloud mode (default)

```bash
vibe-interviewing host patch-data-loss
```

This uploads the prepared workspace to the cloud and gives you a session code. Share the code with the candidate — they don't need to be on your network.

```
Session code: VIBE-A3X9K2
Session expires in 24 hours.
Give this code to the candidate: vibe-interviewing join VIBE-A3X9K2
```

You can close your terminal after hosting. The session lives in the cloud.

### LAN mode

If you prefer direct transfer on the same network:

```bash
vibe-interviewing host --local patch-data-loss
```

This starts an HTTP server on your machine. You'll need to keep the terminal open until the candidate downloads.

### Using custom scenarios

```bash
vibe-interviewing host -s ./my-scenario.yaml
```

## What the Candidate Sees

1. They run `vibe-interviewing join VIBE-A3X9K2`
2. The workspace downloads and setup commands run (e.g., `npm install`)
3. They see the briefing — a Slack-style message describing the problem/task
4. Claude Code launches with hidden behavioral rules
5. They work in a real codebase with AI as their partner

The candidate **never** sees: the scenario config, the solution, the evaluation criteria, or the AI behavioral rules.

## What to Watch For

Focus on **how** the candidate works with AI, not what they have memorized:

- **Problem decomposition** — Are they breaking the problem into manageable pieces?
- **Prompting quality** — Are they giving clear, specific instructions to AI? Do they iterate?
- **Critical evaluation** — Do they review AI-generated code, or accept it blindly?
- **Debugging approach** — When AI output is wrong, how do they course-correct?
- **Verification** — Do they test their work by running the server and hitting it with curl?
- **Tool fluency** — Are they comfortable with the AI tools, or fighting them?

## Evaluation Tips

- Use the scenario's evaluation rubric as a starting point, not a rigid checklist.
- Weight the **process** over the final output. A candidate who methodically debugs with AI shows more than one who gets lucky.
- Note specific moments — a great prompt, a smart correction, or a missed opportunity. These make feedback concrete.
- Compare against the difficulty level. A junior candidate using AI effectively is different from a senior candidate doing the same.

## Creating Custom Scenarios

### Using the Claude Code skill (recommended)

Open Claude Code in any project and run:

```
/create-scenario
```

The skill guides you through:

1. Choosing a starting point (built-in template, current repo, or GitHub URL)
2. Selecting scenario type (debug / feature / refactor)
3. Designing the challenge with type-specific questions
4. Generating and verifying the `scenario.yaml`

### Manual creation

See [Creating Scenarios](creating-scenarios.md) for the full schema reference and manual authoring guide.

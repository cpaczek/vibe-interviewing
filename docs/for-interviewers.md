# Guide for Interviewers

## Quick Setup

```bash
# Install
pnpm install -g vibe-interviewing

# List available scenarios
vibe-interviewing scenarios

# Preview a scenario before the interview
vibe-interviewing preview <scenario>

# Start an interview session
vibe-interviewing start <scenario>
```

## What Happens During a Session

1. **Environment provisioning** -- A Docker container is built and started with the scenario's codebase and tooling.
2. **Briefing** -- The candidate sees the scenario briefing describing the problem and expected deliverables.
3. **AI tool launch** -- The candidate's AI assistant (Claude Code, Open Code, etc.) is configured with scenario-specific rules and context.
4. **Work period** -- The candidate works in the provisioned workspace using their AI tools. The session is timed.
5. **Wrap-up** -- The candidate's final workspace state is captured for evaluation.

## What to Watch For

Focus on **how** the candidate works with AI, not what they have memorized:

- **Prompting quality** -- Are they giving clear, specific instructions to AI? Do they iterate on prompts?
- **Critical evaluation** -- Do they review AI-generated code, or accept it blindly?
- **Problem decomposition** -- Are they breaking the problem into manageable pieces for AI?
- **Debugging approach** -- When AI output is wrong, how do they course-correct?
- **Tool fluency** -- Are they comfortable with the AI tools, or fighting them?

## Evaluation Tips

- Use the scenario's evaluation rubric as a starting point, not a rigid checklist.
- Weight the process over the final output. A candidate who methodically debugs with AI shows more than one who gets lucky.
- Note specific moments -- a great prompt, a smart correction, or a missed opportunity. These make feedback concrete.
- Compare against the difficulty level. A junior candidate using AI effectively is different from a senior candidate doing the same.

## Using Preview

Before an interview, always preview the scenario:

```bash
vibe-interviewing preview <scenario>
```

This shows you:

- The briefing the candidate will see
- The environment setup
- The evaluation criteria
- AI rules that will be injected

Use this to prepare your own understanding of the problem and calibrate your expectations.

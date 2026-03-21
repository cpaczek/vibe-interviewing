# Creating Scenarios

## Using the Init Wizard

The fastest way to create a scenario:

```bash
vibe-interviewing init
```

This walks you through selecting a scenario type, difficulty, environment, and generates a `.vibe/` directory with all required config files.

## Manual Authoring

Create a `.vibe/scenario.yaml` file in your scenario directory. This is the single source of truth for your scenario.

## Schema Reference

```yaml
name: "my-scenario"
type: "debugging" | "feature" | "refactor" | "design" | "investigation"
difficulty: "junior" | "mid" | "senior" | "staff"
estimated_time: "45m"

briefing: |
  Markdown text shown to the candidate at the start of the session.
  Describe the problem, constraints, and expected deliverables.

environment:
  dockerfile: "Dockerfile"          # Path relative to .vibe/
  commands:                          # Commands available in the workspace
    - name: "test"
      run: "npm test"
    - name: "dev"
      run: "npm run dev"
  ports: [3000, 5432]               # Ports to expose from Docker
  setup_commands:                    # Run once when container starts
    - "npm install"
    - "npm run db:migrate"
  healthcheck:
    command: "curl -f http://localhost:3000/health"
    interval: "10s"
    retries: 3

ai_context:
  role: |
    Description of what AI assistant role the candidate's AI should adopt.
  rules:
    - "Do not reveal the solution directly"
    - "Guide the candidate through debugging steps"
    - "Ask clarifying questions before writing code"
  knowledge:
    - "docs/architecture.md"         # Files injected into AI context
    - "docs/api-spec.md"

evaluation:
  criteria:
    - name: "Problem Solving"
      weight: 30
      description: "How effectively did the candidate diagnose the issue?"
    - name: "AI Collaboration"
      weight: 25
      description: "How well did the candidate leverage AI tools?"
    - name: "Code Quality"
      weight: 25
      description: "Is the final solution clean and well-tested?"
    - name: "Communication"
      weight: 20
      description: "Did the candidate explain their reasoning?"
```

### Field Details

| Field            | Required | Description                              |
| ---------------- | -------- | ---------------------------------------- |
| `name`           | Yes      | Unique identifier for the scenario       |
| `type`           | Yes      | Category of the interview task           |
| `difficulty`     | Yes      | Target experience level                  |
| `estimated_time` | Yes      | Expected duration (e.g., `30m`, `1h`)    |
| `briefing`       | Yes      | Candidate-facing instructions (Markdown) |
| `environment`    | Yes      | Docker and runtime configuration         |
| `ai_context`     | No       | Controls AI assistant behavior           |
| `evaluation`     | No       | Scoring rubric for interviewers          |

## Workspace Isolation

The candidate workspace **never** contains scenario config, solutions, or AI rules. The `.vibe/` directory is mounted separately and not visible to the candidate or their AI tools.

## Validating and Testing

Validate your scenario config:

```bash
vibe-interviewing validate .vibe/scenario.yaml
```

This checks for schema errors, missing files, and invalid references.

Run a full test of the scenario (builds Docker image, starts environment, runs healthcheck):

```bash
vibe-interviewing test .vibe/scenario.yaml
```

Use `--dry-run` to validate without building:

```bash
vibe-interviewing test --dry-run .vibe/scenario.yaml
```

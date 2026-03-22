# Generating Screenshots

Screenshots are generated from simulation scripts using [termshot](https://github.com/homeport/termshot).

## Prerequisites

Install termshot:

```bash
# macOS
brew install homeport/tap/termshot

# Go install
go install github.com/homeport/termshot/cmd/termshot@latest

# Or download a binary from https://github.com/homeport/termshot/releases
```

## How it works

Each `sim-*.mjs` script simulates a CLI command's terminal output using raw ANSI escape codes. These scripts don't run the actual CLI — they just print what the output looks like, so screenshots can be generated without network access or real scenarios.

| Script                | Screenshot             | Shows                                |
| --------------------- | ---------------------- | ------------------------------------ |
| `sim-interviewer.mjs` | `interviewer-list.png` | `vibe-interviewing list`             |
| `sim-host.mjs`        | `interviewer-host.png` | `vibe-interviewing host <scenario>`  |
| `sim-candidate.mjs`   | `candidate-start.png`  | `vibe-interviewing join <code>`      |
| `sim-start.mjs`       | `candidate-local.png`  | `vibe-interviewing start <scenario>` |

## Regenerating all screenshots

```bash
cd docs/screenshots

node sim-interviewer.mjs | termshot --raw-read /dev/stdin -C 90 -f interviewer-list.png
node sim-host.mjs        | termshot --raw-read /dev/stdin -C 90 -f interviewer-host.png
node sim-candidate.mjs   | termshot --raw-read /dev/stdin -C 90 -f candidate-start.png
node sim-start.mjs       | termshot --raw-read /dev/stdin -C 90 -f candidate-local.png
```

## Editing a screenshot

1. Edit the corresponding `sim-*.mjs` file
2. Run the script to preview: `node sim-host.mjs`
3. Regenerate the PNG with the termshot command above

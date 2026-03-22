# vibe-interviewing

The CLI for [vibe-interviewing](https://github.com/cpaczek/vibe-interviewing) — AI-era technical interviews.

This is the main user-facing package. It provides the `vibe-interviewing` command.

## Install

```bash
npm install -g vibe-interviewing
```

Requires Node.js 20+ and [Claude Code](https://docs.anthropic.com/en/docs/claude-code).

## Commands

```
vibe-interviewing start [scenario]     Start a local interview session
vibe-interviewing host [scenario]      Host a session for a remote candidate
vibe-interviewing join <code>          Join a hosted session using a session code
vibe-interviewing list                 List available scenarios
vibe-interviewing validate <path>      Validate a scenario.yaml file
vibe-interviewing sessions list        List sessions
vibe-interviewing sessions clean       Remove completed sessions
```

See the [main README](https://github.com/cpaczek/vibe-interviewing#readme) for full documentation.

## License

MIT

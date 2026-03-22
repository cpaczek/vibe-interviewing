# @vibe-interviewing/cloudflare

Cloudflare Worker for [vibe-interviewing](https://github.com/cpaczek/vibe-interviewing) cloud-hosted session relay.

Deployed at `api.vibe-interviewing.iar.dev`.

## What it does

When an interviewer runs `vibe-interviewing host`, the prepared workspace is uploaded to this Worker. It stores the session data in a Durable Object and returns a session code. The candidate then runs `vibe-interviewing join <code>` to download the workspace from this relay.

## Routes

- `POST /sessions` — create a new session (upload workspace)
- `GET /sessions/:code` — download a session by code
- `DELETE /sessions/:code` — clean up a session
- `GET /` — health check

## Development

```bash
pnpm dev     # start local dev server via wrangler
pnpm deploy  # deploy to Cloudflare
```

## License

MIT

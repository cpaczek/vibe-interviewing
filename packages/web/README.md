# @vibe-interviewing/web

Landing page for [vibe-interviewing](https://github.com/cpaczek/vibe-interviewing).

Live at [vibe-interviewing.iar.dev](https://vibe-interviewing.iar.dev).

## What it is

An interactive landing page with a simulated terminal that demos both the interviewer and interviewee CLI flows. Built with React + Vite, deployed to Cloudflare Pages.

Users pick a role (interviewer or interviewee) and step through the CLI experience using keyboard or mouse — selecting scenarios, watching spinners, reading briefings, and confirming prompts.

## Development

```bash
pnpm dev       # start Vite dev server
pnpm build     # build for production
pnpm preview   # preview production build
```

## Deployment

Deployed automatically via GitHub Actions to Cloudflare Pages on push to `main`.

## License

MIT

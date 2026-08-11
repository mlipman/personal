# Simple Log

A small, strongly typed log and chat app built with Next.js, React, Prisma, and PostgreSQL.

## Setup

1. Copy `.env.example` to `.env.local` and make sure all keys have values.
2. Run `pnpm install`, `pnpm prisma:migrate -- --name init`, then `pnpm dev`.

Logs accept plain text and newlines. Images use Markdown image syntax: `![description](https://...)`. The chat sends the text-only content of all logs to OpenAI; image markup is removed before the prompt is built.

## Deployment

Deploy this directory as its own Vercel project:

- Repository: `mlipman/personal`
- Root Directory: `projects/simple-log`
- Framework Preset: Next.js
- Production Branch: `main`
- Environment variables: `DATABASE_URL`, `OPENAI_API_KEY`, and `CLOUDINARY_URL`
- Preferred production domain: `simple-log.mlipman.com`

Use Vercel's Git integration rather than deploying from a developer machine. Branch pushes create preview deployments; merging a reviewed branch into `main` promotes the same workflow to production. This also gives coding agents a safe deployment path: push a `codex/...` branch, verify its preview, and merge only after approval.

### Privacy requirement

The app currently has no application-level authentication. Do not attach the public production domain until authentication protects the page and all three API routes. Vercel Standard Protection can protect preview deployment URLs, but on the Hobby plan it does not protect the production custom domain.

### Cloudflare DNS

After authentication is in place, add `simple-log.mlipman.com` to the Vercel project first. Vercel will display the exact DNS record it expects. Create that record in Cloudflare and leave it **DNS only** while Vercel verifies the domain and provisions TLS. The Cloudflare proxy can be evaluated separately after the domain is working.

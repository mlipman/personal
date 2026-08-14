# Simple Log

A small, strongly typed log and chat app built with Next.js, React, Prisma, and PostgreSQL.

## Setup

1. Copy `.env.example` to `.env.local` and make sure all keys have values.
2. Choose a strong, unique `SIMPLE_LOG_PASSWORD` and generate
   `SIMPLE_LOG_SESSION_SECRET` with `node scripts/generate-session-secret.mjs`.
3. Run `pnpm install`, `pnpm prisma:migrate -- --name init`, then `pnpm dev`.

Logs accept plain text and newlines. Images use Markdown image syntax: `![description](https://...)`. The chat sends the text-only content of all logs to OpenAI; image markup is removed before the prompt is built.

## Authentication

Simple Log has one shared owner password. Visiting a page without a valid session redirects to
`/login`; unauthenticated API requests receive JSON `401` responses. A successful login sets a
signed, `HttpOnly`, `Secure`, `SameSite=Lax` cookie that lasts for one year, so each normal browser
or device should need the password only once. Clearing site data or choosing **Log out** removes
that device's session.

The password is stored directly in the server-only `SIMPLE_LOG_PASSWORD` environment variable.
`SIMPLE_LOG_SESSION_SECRET` is a separate random value used only to sign and verify cookies; it is
never typed by the user or sent to the browser.

- Changing only `SIMPLE_LOG_PASSWORD` changes future logins but leaves current sessions active.
- Changing `SIMPLE_LOG_SESSION_SECRET` immediately invalidates every existing session.
- Sessions are stateless, so one lost device cannot be revoked independently.
- There is no password-reset flow. The owner can set a new Vercel environment value and redeploy.

## Deployment

Deploy this directory as its own Vercel project:

- Repository: `mlipman/personal`
- Root Directory: `projects/simple-log`
- Framework Preset: Next.js
- Production Branch: `main`
- Environment variables: `DATABASE_URL`, `OPENAI_API_KEY`, `CLOUDINARY_URL`,
  `SIMPLE_LOG_PASSWORD`, and `SIMPLE_LOG_SESSION_SECRET`
- Production domain: `simple-log.mlipman.com`

Use Vercel's Git integration rather than deploying from a developer machine. Branch pushes create preview deployments; merging a reviewed branch into `main` promotes the same workflow to production. This also gives coding agents a safe deployment path: push a `codex/...` branch, verify its preview, and merge only after approval.

### Environment layout

- Local development uses `.env.local` and its own Neon database.
- Vercel Preview uses a Neon preview branch. Set its `DATABASE_URL` scope to Preview only.
- Vercel Production uses the production Neon branch. Set its `DATABASE_URL` scope to Production only.
- `OPENAI_API_KEY` and `CLOUDINARY_URL` currently apply to both Preview and Production.
- `SIMPLE_LOG_PASSWORD` and `SIMPLE_LOG_SESSION_SECRET` must be set for both Preview and
  Production. They may use the same values unless preview sessions should be isolated.

Never copy secrets into source control, documentation, build output, or issue/PR text. Changing a Vercel environment variable only affects new deployments, so redeploy each affected environment afterward.

### Database setup

The repository contains committed Prisma migrations. Initialize each new database before serving traffic:

```sh
DATABASE_URL="<target database URL>" pnpm exec prisma migrate deploy
```

Use `migrate deploy`, not `migrate dev`, for Preview and Production. The initial migration creates the `Log` table and its timestamp index.

### Cloudflare DNS

Add `simple-log.mlipman.com` to the Vercel project first, assigned to Production. Vercel displays a project-specific CNAME target. Create the following in the `mlipman.com` Cloudflare zone:

- Type: `CNAME`
- Name: `simple-log`
- Target: the current value shown by Vercel
- Proxy status: **DNS only**
- TTL: Auto

Wait for Vercel to report a valid configuration and provision TLS before considering Cloudflare proxying.

### Repeatable deployment checklist

1. Import `mlipman/personal` as a new Vercel project. If it is missing, add only this repository to the Vercel GitHub app permissions; entering an inaccessible repository URL can lead to a clone/new-repository flow instead of an import.
2. Set the project name and select `projects/simple-log` as the Root Directory. Confirm Vercel detects Next.js.
3. Create separate Neon Preview and Production branches/databases and run `pnpm exec prisma migrate deploy` against each.
4. Add `DATABASE_URL` twice in Vercel, once for Preview and once for Production. Add the remaining
   service credentials and both `SIMPLE_LOG_*` values with the intended scopes.
5. Deploy `main` to Production and a non-production branch to Preview. Verify that both load and read their empty databases.
6. Add the custom domain in Vercel, then create the DNS-only CNAME in Cloudflare using Vercel's exact target.
7. Verify the login redirect, wrong-password response, browser restart persistence, logout,
   unauthenticated API response, log creation, chat, and image upload in each environment.

### Agent workflow

Agents should work on a `codex/...` branch and push it to `origin`. Vercel automatically creates a Preview deployment with Preview-scoped variables. Review and test that URL before merging to `main`; the merge triggers Production. Schema changes must include a committed Prisma migration and an explicit migration step for each target database.

### Known gaps

- Login attempts are not rate-limited, so the configured password must be strong and unique.
- Authentication protects the app but not Cloudinary delivery URLs already obtained from a log.
- Stateless sessions can be revoked only as a group by rotating `SIMPLE_LOG_SESSION_SECRET`.
- Database migrations are currently a manual deployment step.
- Preview and Production share the OpenAI and Cloudinary credentials, so their usage is not isolated.

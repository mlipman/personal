# Simple Log authentication recommendations

Status: implementation spikes only. Nothing in this directory is imported by the deployed app.

Target: `projects/simple-log`, a one-person Next.js app deployed on Vercel at
`simple-log.mlipman.com`.

## Recommendation

Start with **Option 1: an app-local password that creates a signed, one-year cookie**.
It matches the actual use case, adds no service or database dependency, and is small enough to
audit. Generate a high-entropy password, save it in the password manager, and enter it once on
each device. Rotating the session secret signs every device out.

Move to **Option 2: database-backed device sessions** only if the inability to revoke one lost
device becomes uncomfortable. It preserves the same login experience but makes each request do a
database lookup and adds session lifecycle code.

Options 3 and 4 are useful reference points, but neither currently fits as well:

| Option | New-device experience | Remembered for | Per-device revoke | New dependency | Main drawback |
| --- | --- | ---: | --- | --- | --- |
| 1. Signed cookie | Enter app password | 1 year | No | None | Secret rotation signs out every device |
| 2. DB device sessions | Enter app password | 1 year | Yes | Existing Postgres | DB lookup and more code on every request |
| 3. Cloudflare Access | Email OTP or IdP login | At most 1 month | Yes, externally | Cloudflare Access + `jose` | Monthly reauthentication and DNS/platform setup |
| 4. Vercel Password Protection | Enter app password | Per deployment | Platform-managed | Paid Vercel feature | Advanced protection is expensive for this use case |

## What implementing the spikes revealed

1. Authentication must cover the server-rendered home page **and** all three API routes. Hiding
   the UI alone would still expose database writes, image uploads, and OpenAI spend.
2. The app already uses relative API URLs, so all four options can authenticate browser requests
   without client changes.
3. A stateless session is especially attractive because there is only one identity. The cookie
   needs to assert only "the owner previously supplied the password," not carry a user record.
4. Database sessions buy one concrete feature: revoking a single device without changing the
   password or signing every other device out.
5. Auth on Simple Log does not make existing Cloudinary URLs private. The app currently stores
   normal Cloudinary delivery URLs. Someone who already has one can request it without going
   through Simple Log. Treat those as unlisted capability URLs, or separately change Cloudinary
   delivery if the images themselves must be access-controlled.
6. Preview deployments matter. Whichever option is selected must fail closed when its production
   environment variables are absent, and the auth variables must be configured for Vercel Preview
   as well as Production.

## Shared security choices

- Store a scrypt password hash, never the login password, in Vercel environment variables.
- Generate a random password rather than reusing a human password from another account.
- Set session cookies `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`, and with the `__Host-`
  prefix.
- Return JSON `401` responses from APIs and redirects only for browser page requests.
- Exclude only immutable Next.js assets from middleware; protect all data-bearing routes.
- Use HTTPS only. The current Vercel custom domain already provides it.
- Add a modest login rate limit before using a short or guessable password. The prepared local
  options instead assume the generated high-entropy password.

## Prepared artifacts

- [`option-1-signed-cookie`](./option-1-signed-cookie/README.md): complete middleware, login,
  logout, password hashing, and secret generation code.
- [`option-2-db-sessions`](./option-2-db-sessions/README.md): Prisma model/migration, persistent
  opaque sessions, middleware, and a session-revocation API.
- [`option-3-cloudflare-access`](./option-3-cloudflare-access/README.md): origin JWT validation and
  exact platform settings.
- [`option-4-vercel-protection`](./option-4-vercel-protection/README.md): the current project API
  payload and rollout checks; no application code is needed by design.

Each option is intentionally isolated. Copy only the selected option's mapped files into
`projects/simple-log`, then make the small integration edits listed in that option's README.

## Current platform facts checked on 2026-08-14

- Next.js 15.5 supports the Node.js middleware runtime, which makes the Prisma-backed option
  technically possible: <https://nextjs.org/blog/next-15-5>
- Cloudflare Access application, policy, and global sessions have a one-month maximum:
  <https://developers.cloudflare.com/cloudflare-one/access-controls/access-settings/session-management/>
- Cloudflare recommends validating the `Cf-Access-Jwt-Assertion` header at the origin:
  <https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/>
- Vercel Password Protection remembers a password with a cookie, but protecting production is an
  Advanced Deployment Protection feature. Vercel currently documents the Pro add-on at
  $150/month: <https://vercel.com/docs/deployment-protection>

## Suggested decision sequence

1. Apply Option 1 to a preview deployment.
2. Test login, refresh, browser restart, image upload, chat, a wrong password, and direct unauthenticated API calls.
3. Use it on the normal devices for a week.
4. If device loss/revocation feels like a real concern rather than a theoretical one, replace it
   with Option 2. The login UI and password hash format can remain the same.

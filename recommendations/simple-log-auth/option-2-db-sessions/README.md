# Option 2: app password + database-backed device sessions

This keeps Option 1's login experience but replaces the self-contained cookie with a random,
opaque token whose SHA-256 hash is stored in Postgres. The raw token exists only in the browser
cookie. Deleting one session row revokes that device on its next request.

## Apply

Copy the prepared `lib`, `middleware.ts`, `app`, and `scripts` files to the matching paths under
`projects/simple-log`. Append `prisma/schema.addition.prisma` to `prisma/schema.prisma`, create a
normal Prisma migration using the prepared SQL as the expected result, and deploy that migration
before deploying the app code.

The middleware uses Next.js 15.5's stable Node.js runtime so it can query Prisma. It protects the
existing page and every API route without requiring guards scattered through route handlers.

Generate and configure only the password hash:

```sh
node scripts/generate-password.mjs
```

```dotenv
SIMPLE_LOG_PASSWORD_HASH=scrypt$16384$8$1$...
```

The session-revocation API is prepared at `GET/DELETE /api/auth/sessions`. A later UI can list the
returned devices and submit `{ "id": "..." }` to delete one. The current session is identified in
the GET response.

## Pros

- Revoke a single lost device without disrupting the others.
- Show a device list, creation timestamps, and expiry timestamps.
- A database leak reveals only hashes of random session tokens, not usable raw tokens.
- Changing the login password and revoking sessions are independent operations.

## Cons

- One database lookup occurs before every dynamic page/API request.
- Adds a schema migration, cleanup behavior, and more code to own.
- A user-agent label is approximate and is not a trustworthy device identity.
- Still uses one shared password; the session store improves revocation, not login phishing resistance.

## Verification

1. Run `pnpm prisma:generate`, `pnpm typecheck`, `pnpm lint`, and `pnpm build`.
2. Apply the migration to a preview database before deploying the preview code.
3. Confirm missing, random, expired, and revoked tokens all fail closed.
4. Log in with two browsers, revoke one session ID, and confirm only that browser is signed out.
5. Confirm API requests get JSON `401` rather than an HTML redirect.
6. Check request latency; this option deliberately spends a DB lookup to get immediate revocation.

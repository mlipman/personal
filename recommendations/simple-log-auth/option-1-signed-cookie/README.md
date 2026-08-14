# Option 1: app password + signed long-lived cookie

This is the recommended first implementation.

## How it works

The login action verifies a scrypt password hash and sets a signed `HttpOnly` cookie. Middleware
verifies the HMAC signature and expiry before any page or API code runs. There is no user row and
no session row because the app has only one identity.

The prepared cookie lasts 365 days. A browser can still discard it early, and clearing site data
signs that device out.

## Apply

Copy these files into `projects/simple-log`:

| Prepared file | Destination |
| --- | --- |
| `lib/auth.ts` | `lib/auth.ts` |
| `lib/password.ts` | `lib/password.ts` |
| `middleware.ts` | `middleware.ts` |
| `app/login/actions.ts` | `app/login/actions.ts` |
| `app/login/page.tsx` | `app/login/page.tsx` |
| `app/logout-button.tsx` | `app/logout-button.tsx` |
| `scripts/generate-auth-secrets.mjs` | `scripts/generate-auth-secrets.mjs` |

Then optionally import and render `LogoutButton` in the existing header. Logout is useful but is
not required for protection.

Run the generator once:

```sh
node scripts/generate-auth-secrets.mjs
```

Save the printed password in the password manager. Put only the two generated environment values
in Vercel Preview and Production:

```dotenv
SIMPLE_LOG_PASSWORD_HASH=scrypt$16384$8$1$...
SIMPLE_LOG_SESSION_SECRET=...
```

Do not put the printed password in Vercel or Git. Locally, add the same two values to `.env.local`.

## Pros

- The smallest code and operational surface.
- No auth vendor, extra package, schema migration, or request-time database lookup.
- Precisely matches "enter a password once on each device."
- Rotating `SIMPLE_LOG_SESSION_SECRET` immediately invalidates every existing cookie.
- Changing only the password hash affects new logins without signing out current devices.

## Cons

- A lost device cannot be revoked individually.
- There is no device inventory or login audit trail.
- One shared password is weaker than phishing-resistant passkeys if it is reused or guessable.
- Stateless logout cannot invalidate a copied cookie; global secret rotation can.

## Verification

1. `pnpm typecheck && pnpm lint && pnpm build`.
2. Without a cookie, `/` redirects to `/login` and `/api/logs` returns `401` JSON.
3. A wrong password returns to the login screen with a generic error.
4. A correct password survives refresh and browser restart.
5. Changing the session secret invalidates the old cookie.
6. The login page never appears in response logs with the submitted password.

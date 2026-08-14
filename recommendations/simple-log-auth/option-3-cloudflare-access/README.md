# Option 3: Cloudflare Access with email OTP or an identity provider

Cloudflare displays the login screen before the request reaches Vercel. Configure a policy that
allows only the owner's exact email address. A new device authenticates with an emailed one-time
code or the selected identity provider.

The prepared middleware independently validates Cloudflare's signed Access JWT at the origin.
That check is important: DNS/proxy configuration alone must not let someone bypass Access by
requesting the generated `*.vercel.app` deployment URL directly.

## Apply

1. Add `jose` to `projects/simple-log`: `pnpm add jose`. The prepared middleware uses the stable
   Next.js 15.5 Node.js middleware runtime to avoid Edge-runtime warnings from the current bundle.
2. Copy the prepared `middleware.ts` to the project root.
3. In Cloudflare Zero Trust, add a self-hosted HTTP application for
   `simple-log.mlipman.com` and an Allow policy containing only the owner's exact email.
4. Choose One-time PIN or configure the preferred identity provider.
5. Set the application, policy, and global sessions to one month (the current maximum).
6. Copy the application's Audience (AUD) tag and the full team-domain origin into Vercel Preview
   and Production:

```dotenv
CLOUDFLARE_ACCESS_AUD=the-application-audience-tag
CLOUDFLARE_ACCESS_TEAM_DOMAIN=https://your-team.cloudflareaccess.com
```

7. Proxy the custom-domain DNS record through Cloudflare. Verify the Access login on the custom
   domain and a `401` on direct Vercel deployment URLs.

Cloudflare's setup screens and terminology can change; use the linked current runbooks rather than
treating these notes as a click-by-click snapshot:

- <https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/>
- <https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/>

## Pros

- No password or session implementation inside Simple Log.
- Per-device/session revocation, identity logs, and optional MFA are owned by Cloudflare.
- A new device needs only email or an existing identity-provider login.
- Origin JWT verification closes the direct-Vercel-URL bypass.

## Cons

- Cloudflare currently caps the relevant session durations at one month, shorter than requested.
- Adds a control plane, proxied DNS, environment configuration, and a runtime dependency.
- Email OTP makes access depend on email availability; an IdP adds that account as a dependency.
- Debugging separates the public hostname, Cloudflare policy, JWT validation, and Vercel origin.

## Verification

1. `pnpm typecheck && pnpm lint && pnpm build`.
2. The custom domain prompts for Access authentication in a clean browser.
3. Only the exact allowlisted email is accepted.
4. `/`, `/api/logs`, `/api/images`, and `/api/chat` work after login.
5. A direct `*.vercel.app` URL and a forged/missing Access header return `401`.
6. A wrong AUD or team domain fails closed.

# Option 4: Vercel Password Protection

This is the closest product-level match to the original idea: Vercel shows a password screen and
sets its own cookie, with no Simple Log code or secrets to maintain.

It is not the recommendation because the current pricing and cookie scope are poor fits for a
small personal app. As of 2026-08-14, Vercel documents production Password Protection as an
Enterprise feature or part of the Advanced Deployment Protection add-on for Pro, currently
$150/month. It also documents password persistence as once **per deployment**, so a fresh
deployment URL may require another login rather than behaving like a one-year app session.

Sources:

- <https://vercel.com/docs/deployment-protection>
- <https://vercel.com/docs/deployment-protection/methods-to-protect-deployments/password-protection>

## Prepared configuration

No application code is required by design. `configure.mjs` prepares the documented project-update
API call with `deploymentType: "all"`, which protects production and previews. It has not been run.

If the account has the required plan/add-on, set these values in a temporary shell and run the
script with Node 22+:

```dotenv
VERCEL_TOKEN=temporary-api-token
VERCEL_PROJECT_ID=project-id-or-name
VERCEL_TEAM_ID=optional-team-id
VERCEL_PROTECTION_PASSWORD=the-password-to-configure
```

Prefer configuring it in the Vercel dashboard unless repeatability is important. Do not commit an
API token or password. The script deliberately does not print the password.

## Pros

- Zero application auth code and no schema migration.
- Vercel protects requests before middleware, pages, or API routes execute.
- Password changes and cookies are platform-managed.
- It can protect generated Vercel URLs as well as the custom production domain.

## Cons

- Disproportionately expensive for this one-user side project.
- Cookie scope is tied to deployment URLs, not a durable app identity across every deployment.
- Adds Vercel plan lock-in for a basic capability.
- Disabling or mis-scoping Deployment Protection can expose the entire app at once.

## Verification

1. Confirm the account's exact plan and price before enabling anything billable.
2. Select All Deployments, not Standard Protection; Standard excludes the production domain.
3. Test both `simple-log.mlipman.com` and generated production/preview URLs in a clean browser.
4. Direct API requests without Vercel's auth cookie must be rejected before the app runs.
5. Make a new preview deployment and observe whether the re-login frequency is acceptable.

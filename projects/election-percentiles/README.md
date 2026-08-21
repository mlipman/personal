# Possible Futures

An interactive prototype that maps Silver Bulletin's August 20, 2026 FLIPR Deluxe forecast onto three percentile lines:

- Democratic Senate seats, using exact seat outcomes with the small tails grouped;
- Democratic House seats, grouped into six readable ranges; and
- control of Congress, simplified to Democratic sweep, divided Congress, and Republican sweep.

A single shared percentile slider moves the marker and selected-outcome readout on all three lines together. It aligns the three marginal distributions; it is not a claim that equal percentiles are the same joint simulation.

Two experimental joint views extend the original line:

- a Senate-route coordinate that holds the total fixed and separates conventional/chalk combinations from inside-out/upset combinations among IA, TX, OH, AK, ME, and MI; and
- a House–Senate plane that rotates standardized chamber performance into overall partisan outcome and House-versus-Senate tilt.

The joint views use 10,000 aligned posterior draws from Mac Tan's MIT-licensed open model. A transparent raking step calibrates those draws to Silver's published race marginals, seat bands, and joint-control cells. The result is clearly labeled as an approximation—not Silver's unpublished simulations. Full methodology, source review, and acquisition recommendations are in [`research/orthogonal-dimensions.md`](research/orthogonal-dimensions.md).

The source snapshot is based on 40,000 simulations. The rendered line widths are rounded to whole percentile points. The rare 0.6% Republican House + Democratic Senate outcome is deliberately omitted from the one-dimensional congressional-control line and labeled as such in the interface; it remains present in the joint plane.

The extracted source values and precision notes are in [`data/`](data/README.md).

## Local development

Requires Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

Use `npm run build` for a production build and `npm test` after building to verify the rendered content and social metadata.

## Rebuild the joint data

The derivation scripts use only Node's standard library:

```bash
node scripts/build-orthogonal-data.mjs
node scripts/calibrate-open-draws-to-silver.mjs
```

The first command streams the pinned open posterior files (about 137 MB combined). See [`data/README.md`](data/README.md) for output schemas, licenses, snapshot rules, and calibration diagnostics.

## Cloudflare deployment

This site is deployed directly from the working copy to Cloudflare Workers. GitHub and Vercel are not part of the deployment path.

`wrangler.jsonc` is the checked-in source of truth for the Worker name, runtime configuration, and custom domain:

```jsonc
"workers_dev": false,
"routes": [
  {
    "pattern": "percentiles.mlipman.com",
    "custom_domain": true
  }
]
```

Install dependencies and authenticate Wrangler once on each machine that will deploy interactively:

```bash
npm install
npx wrangler login
```

`wrangler login` opens Cloudflare's OAuth page and stores the authorization locally; credentials are not added to the repository. Then build and deploy with:

```bash
npm run deploy
```

The deploy script runs the vinext production build and then `wrangler deploy`. Subsequent deployments from the same authenticated machine normally need only `npm run deploy`.

On another computer, clone the repository, run `npm install`, and run `npx wrangler login` before the first deployment. For CI or another non-interactive environment, create a scoped Cloudflare API token that can deploy the Worker and manage its custom-domain route, provide it as the `CLOUDFLARE_API_TOKEN` environment variable, and run `npm run deploy` instead of using browser login. Keep the token in that environment's secret store, never in a checked-in `.env` file.

Cloudflare credentials, generated build output, and local Wrangler state are not checked into the repository.

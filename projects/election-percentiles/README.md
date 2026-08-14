# Possible Futures

An interactive prototype for viewing 2026 congressional election forecasts as percentile spaces. The current version contains:

- a standalone Democratic Senate-seat percentile line;
- a simplified three-outcome congressional-control line;
- a conceptual House × Senate correlation surface; and
- a six-race explorer for IA, TX, OH, AK, MI, and ME that contrasts a naive one-dimensional ordering with 100 correlated model worlds.

All probabilities currently shown are illustrative. They are deliberately labeled in the interface and should not be interpreted as a live forecast.

## Local development

Requires Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

Use `npm run build` for a production build and `npm test` after building to verify the rendered content and social metadata.

## Planned data inputs

The illustrative constants in `app/page.tsx` are intended to be replaced with normalized source data. The planned source set is Nate Silver's Silver Bulletin/FLPR export plus Kalshi and Polymarket snapshots. Senate-seat tail probabilities will be converted to exact-seat probabilities by differencing adjacent thresholds before blending.

Simulation-level exports are preferable for the multidimensional views because they retain the correlations between chamber totals and individual Senate races. If only marginal probabilities are available, the interface should continue to label any assumed dependence model explicitly.

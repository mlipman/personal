# Forecast data snapshots and derived joint outcomes

The project now keeps three kinds of data separate:

1. rendered Silver Bulletin chart snapshots;
2. reproducible joint posterior draws from an open model; and
3. an explicitly labeled approximation that calibrates the open joint draws to Silver's published marginals.

Never describe the third category as Silver Bulletin simulation output.

## Current Silver Bulletin snapshot

[`silver-bulletin-2026-08-20/`](silver-bulletin-2026-08-20/) contains the public chart feeds used for the current interface:

- `toplines.csv`: chamber control probabilities and expected seats;
- `seat-distribution.csv`: the full displayed House and Senate seat histograms;
- `joint-control.csv`: all four combinations of chamber control; and
- `senate-races.csv`: candidate-level forecast rows, including the six target races.

Source: <https://www.natesilver.net/p/nate-silver-2026-midterm-election-polls-model>. The rows identify the run as August 20, 2026 at 12:23 p.m. ET and the Deluxe model as 40,000 simulations.

## Open joint posterior

[`derived/mac-tan-2026-08-21/`](derived/mac-tan-2026-08-21/) is generated from Mac Tan's MIT-licensed [`US-2026`](https://github.com/thisismactan/US-2026) model at commit `bf20a3e321fb0cac0f45b8ed9dc04dbfa764f494`:

- `six-state-combinations.csv`: all 64 IA/TX/OH/AK/ME/MI winner combinations;
- `senate-total-routes.csv`: each combination conditioned on every modeled Senate total;
- `house-senate-joint-grid.csv`: the exact joint chamber seat-count surface;
- `joint-simulations.csv`: 10,000 compact aligned draws; and
- `metadata.json`: source, conventions, diagnostics, and dimension definitions.

The two large upstream posterior files are not checked in. Rebuild with:

```bash
node scripts/build-orthogonal-data.mjs
```

The script streams the pinned Git LFS files by default. Local paths can be supplied with `--senate` and `--house`.

The upstream House and Senate rows share `sim_id`; the model itself uses those IDs to calculate joint control. This is why the grid is a joint distribution rather than a pairing of marginal percentiles.

Mac Tan's MIT notice is in [`licenses/mac-tan-US-2026-LICENSE.txt`](licenses/mac-tan-US-2026-LICENSE.txt). The upstream project credits the New York Times polling tracker under CC BY 4.0.

## Silver-calibrated approximation

[`derived/silver-calibrated-mac-tan-2026-08-20/`](derived/silver-calibrated-mac-tan-2026-08-20/) is a minimum-information hybrid. Iterative proportional fitting reweights the 10,000 open joint draws until they match:

- the six Silver Deluxe state win probabilities;
- ten displayed Senate seat bands;
- six displayed House seat bands; and
- the four joint-control cells.

It converges to a maximum constraint error below `1e-10`, with effective sample size 3,821 and a maximum draw weight 17.67 times uniform. Those diagnostics are healthy enough for an exploratory prototype, but rare routes with little open-model support remain fragile. The approximation cannot recreate a dependence pattern absent from the source draws and does not reveal Silver's unpublished joint model.

Rebuild it after the open derivation with:

```bash
node scripts/calibrate-open-draws-to-silver.mjs
```

The script also writes the compact client bundle at [`app/data/orthogonal-outcomes.json`](../app/data/orthogonal-outcomes.json).

## Earlier authenticated extraction

These files contain the **Deluxe** model values displayed on Nate Silver's 2026 midterm election model on August 14, 2026.

- Source: <https://www.natesilver.net/p/nate-silver-2026-midterm-election-polls-model>
- Model: Deluxe only
- Simulations: 40,000
- Extraction method: read from the rendered, authenticated chart DOM. The seat-distribution bars expose their displayed values as `data-seat-low`, `data-seat-high`, and `data-prob` attributes.

## Files

- `silver-bulletin-flipr-2026-08-14-deluxe-seat-distribution.csv`: probability displayed for each rendered Democratic seat-count bar in the Senate and House histograms.
- `silver-bulletin-flipr-2026-08-14-deluxe-toplines.csv`: displayed Democratic control probabilities and average seat counts.
- `silver-bulletin-flipr-2026-08-14-deluxe-joint-control.csv`: displayed probabilities for the four combinations of House and Senate control.

## Precision notes

These are the chart's displayed probabilities, not unrounded simulation counts. The values therefore do not necessarily sum to exactly 100%. Values displayed as `<0.01` are preserved as text rather than converted to zero. Seat counts with no rendered bar are absent and should not automatically be treated as exact zero without choosing an explicit tail policy.

For calculations, keep this raw snapshot unchanged and create a derived numeric file with documented rules for `<0.01` values, missing bins, and normalization.

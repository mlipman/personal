# Orthogonal election outcomes: research and implementation memo

_Findings and model snapshots are current through August 21, 2026._

## Recommendation

Keep the original 0–100 “how well did Democrats do?” axis, but do not force one universal second axis onto both problems.

For the six Senate races, use:

1. **battlefield conventionality** as the signed second coordinate—inside-out/upset route at one end, expected/chalk route at the other; and
2. **conditional route rarity** as probability/visual emphasis rather than a competing political direction.

For the House–Senate space, use:

1. **overall partisan performance** as the first coordinate; and
2. **chamber tilt**—Senate-heavy at one end, House-heavy at the other—as the second.

These share a general design principle (“overall level” plus “composition”), but they should not share a forced label. The Senate problem is a six-dimensional discrete cube; the chamber problem is already a natural two-dimensional plane.

The best production data path is:

1. use [Mac Tan's MIT-licensed `US-2026` model](https://github.com/thisismactan/US-2026) now because it publishes genuinely aligned House and Senate draws;
2. treat those draws as an open dependence backbone, not unquestionable final marginals;
3. acquire a licensed thin extract from FiftyPlusOne, VoteHub, DDHQ, or Silver Bulletin; and
4. preserve each source as a separate model or model mixture rather than blending cells without provenance.

## Why these dimensions work

### 1. Senate battlefield conventionality

Let `x_i` be 1 when Democrats win race `i`, and let `p_i` be the model's marginal Democratic win probability. Define:

```text
K = Σ x_i
w_i = logit(p_i) - mean_j(logit(p_j))
C = Σ w_i x_i
```

`K` is the number of the six races Democrats win. Because the `w_i` sum to zero, the composition vector is algebraically orthogonal to the equal-weight/count direction. Within any fixed `K` (or any fixed total Senate outcome), high `C` means Democratic wins are concentrated in the races the model thought were easier; low `C` means Democrats won harder races while losing easier ones.

Using Silver Bulletin Deluxe's August 20 marginals, the scaled loadings are:

| Race | D win probability | Conventionality loading |
|---|---:|---:|
| IA | 44.0% | -1.000 |
| AK | 52.6% | -0.466 |
| TX | 60.5% | +0.041 |
| OH | 60.7% | +0.050 |
| ME | 68.2% | +0.560 |
| MI | 71.6% | +0.816 |

The display uses a conditional percentile of `C` among outcomes with the selected Senate total. Its interpretation therefore remains stable at 47, 51, or 54 seats: low is an inverted battlefield; high is the expected battlefield. At the all-win and all-loss extremes there is correctly no composition variation.

This is preferable to naming the axis after a region. A residual PCA on the six continuous race margins found no dominant geography: the first component explains only 24.0% of variance after removing the common direction, and the remaining shares are 22.4%, 18.5%, 18.2%, and 16.9%. Presenting any one of those as _the_ geographic dimension would imply more structure than the model contains.

### 2. Senate route rarity

For a six-state combination `x` and Senate total `s`:

```text
R(x, s) = -log P(X=x | Senate=s)
```

This supplies a universal “chalk to chaos” measure and, more importantly, the dot size or opacity. It should not replace conventionality: two equally unlikely routes can be politically opposite. A probability-weighted conditional midrank maps rarity to 0–100 without pretending that a zero count in 10,000 draws is impossible.

### 3. House–Senate chamber tilt

Standardize Democratic House and Democratic/independent-aligned Senate seats:

```text
z_H = (H - mean(H)) / sd(H)
z_S = (S - mean(S)) / sd(S)

overall = (z_H + z_S) / sqrt(2)
tilt    = (z_H - z_S) / sqrt(2)
```

The display reverses `overall` into the project's familiar 0 = best Democratic, 100 = best Republican percentile. Low tilt means Senate overperformance; high tilt means House overperformance.

This is a true 45-degree rotation, remains invertible, and is uncorrelated by construction because the two inputs are standardized. If a future design requires statistically independent uniform coordinates rather than a readable geometric rotation, apply a conditional probability transform such as `F(tilt | overall)` in narrow overall-performance bands.

## What is publicly obtainable

### Ranked inventory

| Rank | Source | Directly obtainable now | Exact six-state 64? | Full House×Senate? | Reuse status |
|---:|---|---|:---:|:---:|---|
| 1 | [Election Statsheet / Mac Tan](https://www.electionstatsheet.com/model) | 10,000 aligned race-level posterior draws | Yes | Yes | [MIT](https://github.com/thisismactan/US-2026/blob/main/LICENSE); preserve upstream NYT attribution |
| 2 | [VoteHub](https://votehub.com/2026-forecast-senate-scenario-builder/) | Public scenario builder contains a 100,000-run correlated combination table | Yes | Internally yes; not exposed | [Terms](https://votehub.com/terms/) require permission for extraction/derivatives |
| 3 | [FiftyPlusOne](https://blog.fiftyplusone.news/p/2026-forecast-methodology) | Public dashboard; paid API/custom data | On request | Yes | Paid/custom license; request public-display rights |
| 4 | [Decision Desk HQ](https://votes-docs.decisiondeskhq.com/2026-forecast-methodology) | Public summaries and some chart CSVs; custom products | On request | Yes | Commercial license required |
| 5 | [Split Ticket / The Argument](https://www.theargumentmag.com/p/split-ticket-2026-midterms-model) | Official downloadable race marginals and separate seat distributions | No | No | Intentionally downloadable, but no explicit reuse license found |
| 6 | [Silver Bulletin / FLIPR](https://www.natesilver.net/p/flipr-midterms-model-methodology) | Paid dashboard and public chart feeds, no raw draws | On request | Yes | Subscription is viewing access, not export permission |
| 7 | [The Economist](https://www.economist.com/interactive/2026/us-midterms/prediction-model/senate) | Subscription dashboard, no raw 2026 download found | On request | Alignment not established | Terms prohibit scraping/unlicensed derivatives |
| 8 | [Race to the WH](https://www.racetothewh.com/senate/26) | Free dashboard; Senate and House simulations are described separately | No | No documented joint IDs | Ask directly; no download/API found |
| 9 | [ElectIndex](https://github.com/ElectIndex/26_us_forecast_data) | Tiny ready-made 10,000-row `house_dem,senate_dem` file | Not at race level | Yes | No license; default copyright applies |
| 10 | [Grant's Election Forecast](https://github.com/grantbw4/2026-midterms-forecast) | MIT source for a correlated simulator | After a small export patch | Coupling needs work | MIT |

### The unusually strong open source

[Mac Tan's repository](https://github.com/thisismactan/US-2026) publishes:

- [House posterior draws](https://media.githubusercontent.com/media/thisismactan/US-2026/main/output/house_district_posterior.csv): 4.35 million rows (`435 × 10,000`);
- [Senate posterior draws](https://media.githubusercontent.com/media/thisismactan/US-2026/main/output/senate_state_posterior.csv): 350,000 rows (`35 × 10,000`); and
- model code that explicitly joins the two chambers by the same `sim_id` in [`forecast_summary_results.R`](https://github.com/thisismactan/US-2026/blob/main/src/forecast_summary_results.R#L159-L172).

At pinned commit `bf20a3e321fb0cac0f45b8ed9dc04dbfa764f494` (August 21):

- mean House Democratic seats: 222.69;
- mean Senate non-Republican seats: 48.86;
- House/Senate seat correlation: 0.673;
- 5th/50th/95th percentiles: House 199/220/255, Senate 44/49/53; and
- joint control: D/D 25.94%, D House/R Senate 31.27%, R House/D-or-non-R Senate 2.93%, R/R 39.86%.

The model tracks a possible Nebraska independent separately. This project uses `100 - Republican seats` for the control-oriented Senate total and labels it “Democratic / independent-aligned,” not literal Democratic seats.

### The most valuable permission request

[VoteHub's scenario builder](https://votehub.com/2026-forecast-senate-scenario-builder/) already has all 64 fully specified six-race patterns in its correlated 100,000-run table. Its [methodology](https://votehub.com/wp-content/uploads/2026/05/2026_votehub_midterm_methodology.pdf) is particularly relevant: it creates a positive-semidefinite covariance structure from political, demographic, socioeconomic, geographic, chamber, and same-state similarity.

The data is technically available in the page, but the site's terms prohibit copying, reverse engineering, and derivative works without permission. Do not ship an extraction. Ask `contact@votehub.com` for personal-project display and caching rights. VoteHub Pro is currently advertised at $74.99/year, but subscription alone does not grant export rights.

### Best paid/custom prospects

#### FiftyPlusOne

[FiftyPlusOne's methodology](https://blog.fiftyplusone.news/p/2026-forecast-methodology) describes 40,000 joint simulations of all 470 House and Senate contests. Each simulation draws a national shock shared across chambers, then chamber, region, state, House-cluster, and individual errors. This is the closest published design match to the project.

The [downloads/API page](https://fiftyplusone.news/downloads) lists Standard at $100/month and Premium at $150/month, but the current catalog does not promise raw forecast draws. Contact `data@fiftyplusone.news`. Its [terms](https://fiftyplusone.news/terms) allow personal noncommercial use but restrict scraping and redistribution; get explicit permission before publishing even derived API data.

#### Decision Desk HQ

DDHQ runs one million correlated simulations and uses a common national latent shock across House and Senate. Its analysis says it can condition on arbitrary combinations such as Iowa-plus-Ohio outcomes. [Products](https://www.decisiondeskhq.com/products) advertises APIs and custom data; contact `info@decisiondeskhq.com`.

Useful official public checks include [joint chamber control](https://datawrapper.dwcdn.net/mAnzX/2/dataset.csv) and a [generic-ballot conditional scenario](https://datawrapper.dwcdn.net/OX2at/1/dataset.csv), but neither is raw output.

#### Silver Bulletin

FLIPR's 40,000 simulations are analytically ideal: national drift and Election Day error, a same-state shock shared by House/Senate/governor races, race-local error, and CANTOR demographic/geographic correlation. No raw export or forecast API was found. The dashboard publishes exact chamber histograms, state marginals, and four joint-control cells, which are sufficient for calibration but not enough to identify the 64 combinations or full chamber grid. Ask `silverbulletin.media@gmail.com` for pre-aggregated tables or aligned draws.

#### Split Ticket

The best freely downloadable expert marginals found were Split Ticket's Datawrapper feeds:

- [Senate race probabilities](https://datawrapper.dwcdn.net/Hus3x/12/dataset.csv)
- [Senate seat distribution](https://datawrapper.dwcdn.net/X2WrG/11/dataset.csv)
- [House race probabilities](https://datawrapper.dwcdn.net/Cy0fK/16/dataset.csv)
- [House seat distribution](https://datawrapper.dwcdn.net/gKHb7/15/dataset.csv)

They describe national, state, and demographic correlation, but separate public marginals cannot recover joint combinations. The visible downloads also appeared to lag later editorial model updates. Contact `info@splitticket.org` for a timestamped raw or pre-aggregated extract.

## Prediction markets: useful constraints, not a substitute for draws

Markets can inform calibration or model disagreement, but they do not identify a full joint distribution and their data licenses need care.

- [Polymarket's balance-of-power event](https://polymarket.com/event/balance-of-power-2026-midterms) and [Gamma API response](https://gamma-api.polymarket.com/events/slug/balance-of-power-2026-midterms) provide the four control cells. A separate [13-outcome House/Senate seat-bin event](https://polymarket.com/event/how-many-senate-and-house-seats-will-republicans-have-after-the-midterms-20260625152833634) is a valuable coarse two-dimensional constraint. Normalize mutually exclusive prices and retain bid/ask spread/liquidity as uncertainty.
- [Kalshi's public market-data API](https://docs.kalshi.com/getting_started/quick_start_market_data) has chamber seat bins, control outcomes, and a 16-outcome joint event over AK/TX/IA/OH. Its developer agreement restricts non-trading collection and public display without authorization.
- The [Iowa Electronic Markets](https://iemweb.biz.uiowa.edu/markets) `Congress26` contracts offer a second five-way control distribution.

Do not multiply six state marginals independently. With Silver's current marginals, independence gives only 4.15% for a six-state Democratic sweep and 0.37% for a six-state Republican sweep. The calibrated correlated prototype gives 14.26% and 4.82%, respectively. The magnitude is model-dependent, but the direction is the core point: shared shocks move substantial probability into coherent tails.

## The implemented open-plus-calibrated prototype

### Direct outputs

[`scripts/build-orthogonal-data.mjs`](../scripts/build-orthogonal-data.mjs) streams the pinned Mac Tan posterior files and writes:

- all 64 unconditional combinations;
- every combination conditioned on every Senate total;
- the exact House×Senate grid;
- a compact 10,000-row aligned file; and
- the empirical residual component/loadings metadata.

These are direct transformations of an external MIT-licensed model.

### Calibrated approximation

[`scripts/calibrate-open-draws-to-silver.mjs`](../scripts/calibrate-open-draws-to-silver.mjs) uses iterative proportional fitting, equivalently a minimum-KL reweighting of the available support:

```text
minimize  Σ_i w_i log(w_i / q_i)
subject to published marginal and joint-control constraints
```

It matches:

- six Silver Deluxe race-win marginals;
- ten Senate seat bands;
- six House seat bands; and
- four House/Senate control cells.

Diagnostics:

- convergence in 78 iterations;
- maximum absolute constraint error: `9.8e-11`;
- effective sample size: 3,821 of 10,000; and
- maximum weight: 17.67 times uniform.

This is a useful empirical-copula approximation, not Silver output. Raking cannot invent routes absent from Mac Tan's draws, and a cell supported by only a handful of open simulations can remain unstable even when the global effective sample size is reasonable.

For the illustrative 51-seat slice, the most common calibrated routes are:

| Democratic winners among the six | Losses | `P(route | 51 seats)` | Open draws supporting cell |
|---|---|---:|---:|
| TX, OH, ME, MI | IA, AK | 12.5% | 199 |
| OH, AK, ME, MI | IA, TX | 10.2% | 95 |
| TX, ME, MI | IA, OH, AK | 4.8% | 31 |
| TX, OH, AK, ME | IA, MI | 4.5% | 30 |
| IA, TX, AK, MI | OH, ME | 4.5% | 6 |

The last line is exactly why the UI flags thin open-model support and why a licensed second model—especially VoteHub—is worth acquiring.

## Suggested outreach request

Send essentially the same narrow request to FiftyPlusOne, VoteHub, DDHQ, and Silver:

> I am building a personal, noncommercial 2026 election visualization. I do not need model code or proprietary inputs. Could you license either (a) aligned simulation rows containing `simulation_id`, House Democratic seats, Senate Democratic/caucus seats, and the IA/TX/OH/AK/ME/MI winners, or (b) two pre-aggregated files: the 64 six-state combination probabilities and the exact House-D-seats × Senate-D-seats contingency table? I would attribute the model prominently. Please specify whether public display of derived probabilities is allowed, along with caching, refresh frequency, and redistribution limits.

Ask for these metadata fields too:

```text
model_name
model_version
run_timestamp
simulation_count
senate_seat_definition
probability_precision
```

Pre-aggregates are much easier for a provider to approve than unrestricted race-level draws and contain everything this visualization needs.

## Next implementation steps

1. Keep the current research prototype behind an “approximation” label until a second joint source validates route probabilities.
2. Obtain VoteHub permission first; it is the fastest exact 64-state comparison.
3. Contact FiftyPlusOne next for the full joint chamber surface, then DDHQ and Silver.
4. Add a model/source selector rather than averaging cell probabilities. A model-mixture ensemble should first sample a source, then sample a draw, preserving within-model dependence and exposing between-model disagreement.
5. Add bootstrap intervals or support badges for route probabilities; do not show `0/10,000` as literal impossibility.
6. Decide and document the Senate convention: literal Democratic seats, D-caucusing seats, or all non-Republican seats. The current prototype uses the last for control consistency.
7. Snapshot every dynamic feed by date and model version. Never overwrite a prior run silently.

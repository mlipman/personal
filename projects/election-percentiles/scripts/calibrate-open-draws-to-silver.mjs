#!/usr/bin/env node

import { readFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const openDataDir = resolve(projectRoot, "data", "derived", "mac-tan-2026-08-21");
const silverDataDir = resolve(projectRoot, "data", "silver-bulletin-2026-08-20");
const outputDir = resolve(projectRoot, "data", "derived", "silver-calibrated-mac-tan-2026-08-20");
const appDataDir = resolve(projectRoot, "app", "data");
const raceCodes = ["IA", "TX", "OH", "AK", "ME", "MI"];

function parseCsvLine(line) {
  const fields = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (quoted && character === '"' && line[index + 1] === '"') {
      field += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === "," && !quoted) {
      fields.push(field);
      field = "";
    } else {
      field += character;
    }
  }
  fields.push(field);
  return fields;
}

async function readCsv(path) {
  const lines = (await readFile(path, "utf8")).trim().split(/\r?\n/);
  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map((line) => Object.fromEntries(
    parseCsvLine(line).map((value, index) => [headers[index], value]),
  ));
}

function csvEscape(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return "";
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function toCsv(rows, columns) {
  return [columns.join(","), ...rows.map((row) => columns.map((column) => csvEscape(row[column])).join(","))].join("\n") + "\n";
}

function round(value, digits = 8) {
  return Number(value.toFixed(digits));
}

function logit(probability) {
  return Math.log(probability / (1 - probability));
}

function senateBand(seats) {
  if (seats <= 46) return "46_or_fewer";
  if (seats >= 55) return "55_or_more";
  return String(seats);
}

function houseBand(seats) {
  if (seats <= 209) return "209_or_fewer";
  if (seats <= 217) return "210_to_217";
  if (seats <= 229) return "218_to_229";
  if (seats <= 239) return "230_to_239";
  if (seats <= 249) return "240_to_249";
  return "250_or_more";
}

function controlCell(houseSeats, senateSeats) {
  return `${houseSeats >= 218 ? "D" : "R"}_house_${senateSeats >= 51 ? "D" : "R"}_senate`;
}

function weightedMean(values, weights) {
  return values.reduce((sum, value, index) => sum + value * weights[index], 0);
}

function weightedStandardDeviation(values, weights, average = weightedMean(values, weights)) {
  return Math.sqrt(values.reduce((sum, value, index) => sum + weights[index] * (value - average) ** 2, 0));
}

function weightedMidrankPercentiles(values, weights, order = "ascending") {
  const sorted = values.map((value, index) => ({ value, weight: weights[index], index }))
    .sort((left, right) => order === "ascending" ? left.value - right.value : right.value - left.value);
  const result = new Float64Array(values.length);
  let cumulative = 0;
  let start = 0;
  while (start < sorted.length) {
    let end = start + 1;
    while (end < sorted.length && Math.abs(sorted[end].value - sorted[start].value) < 1e-12) end += 1;
    const groupWeight = sorted.slice(start, end).reduce((sum, item) => sum + item.weight, 0);
    const percentile = 100 * (cumulative + groupWeight / 2);
    for (let index = start; index < end; index += 1) result[sorted[index].index] = percentile;
    cumulative += groupWeight;
    start = end;
  }
  return result;
}

function weightedGroupedMidranks(items, valueKey, weightKey, order = "ascending") {
  const observed = items.filter((item) => item[weightKey] > 0)
    .sort((left, right) => order === "ascending" ? left[valueKey] - right[valueKey] : right[valueKey] - left[valueKey]);
  const total = observed.reduce((sum, item) => sum + item[weightKey], 0);
  const result = new Map();
  let cumulative = 0;
  let start = 0;
  while (start < observed.length) {
    let end = start + 1;
    while (end < observed.length && Math.abs(observed[end][valueKey] - observed[start][valueKey]) < 1e-12) end += 1;
    const groupWeight = observed.slice(start, end).reduce((sum, item) => sum + item[weightKey], 0);
    const percentile = 100 * (cumulative + groupWeight / 2) / total;
    for (let index = start; index < end; index += 1) result.set(observed[index].key, percentile);
    cumulative += groupWeight;
    start = end;
  }
  return result;
}

function buildTargets(seatRows, jointRows, raceRows) {
  const senate = new Map();
  const house = new Map();
  for (const row of seatRows.filter((item) => item.model === "deluxe")) {
    const probability = Number(row.prob) / 100;
    const seats = Number(row.seats);
    const target = row.chamber === "Senate" ? senate : house;
    const band = row.chamber === "Senate" ? senateBand(seats) : houseBand(seats);
    target.set(band, (target.get(band) ?? 0) + probability);
  }

  const joint = new Map();
  for (const row of jointRows.filter((item) => item.model === "deluxe")) {
    joint.set(`${row.house}_house_${row.senate}_senate`, Number(row.probability) / 100);
  }

  const races = new Map();
  for (const code of raceCodes) {
    const probability = raceRows
      .filter((row) => row.expression === "deluxe" && row.state_district === code && row.candidate_party === "D")
      .reduce((sum, row) => sum + Number(row.win_probability), 0);
    races.set(code, probability);
  }

  return { senate, house, joint, races };
}

function normalize(weights) {
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  for (let index = 0; index < weights.length; index += 1) weights[index] /= total;
}

function rakeConstraint(weights, categories, targets, label) {
  const current = new Map();
  for (let index = 0; index < weights.length; index += 1) {
    current.set(categories[index], (current.get(categories[index]) ?? 0) + weights[index]);
  }
  for (const [category, target] of targets) {
    if (!(current.get(category) > 0) && target > 0) {
      throw new Error(`${label} target ${category} has no support in the open simulations`);
    }
  }
  for (let index = 0; index < weights.length; index += 1) {
    weights[index] *= targets.get(categories[index]) / current.get(categories[index]);
  }
}

function achievedByCategory(weights, categories) {
  const achieved = new Map();
  for (let index = 0; index < weights.length; index += 1) {
    achieved.set(categories[index], (achieved.get(categories[index]) ?? 0) + weights[index]);
  }
  return achieved;
}

function maximumConstraintError(weights, constraints) {
  let maximum = 0;
  for (const constraint of constraints) {
    const achieved = achievedByCategory(weights, constraint.categories);
    for (const [category, target] of constraint.targets) {
      maximum = Math.max(maximum, Math.abs((achieved.get(category) ?? 0) - target));
    }
  }
  return maximum;
}

async function main() {
  const [simRows, seatRows, jointRows, raceRows] = await Promise.all([
    readCsv(resolve(openDataDir, "joint-simulations.csv")),
    readCsv(resolve(silverDataDir, "seat-distribution.csv")),
    readCsv(resolve(silverDataDir, "joint-control.csv")),
    readCsv(resolve(silverDataDir, "senate-races.csv")),
  ]);
  const targets = buildTargets(seatRows, jointRows, raceRows);
  const houseSeats = simRows.map((row) => Number(row.democratic_house_seats));
  const senateSeats = simRows.map((row) => Number(row.democratic_aligned_senate_seats));
  const combos = simRows.map((row) => row.six_state_combo);
  const senateCategories = senateSeats.map(senateBand);
  const houseCategories = houseSeats.map(houseBand);
  const jointCategories = houseSeats.map((value, index) => controlCell(value, senateSeats[index]));
  const raceCategories = Object.fromEntries(raceCodes.map((code) => [
    code,
    combos.map((combo) => combo.includes(`${code}-D`) ? "D" : "R"),
  ]));

  const constraints = [
    { label: "Senate bands", categories: senateCategories, targets: targets.senate },
    { label: "House bands", categories: houseCategories, targets: targets.house },
    { label: "Joint control", categories: jointCategories, targets: targets.joint },
    ...raceCodes.map((code) => ({
      label: `${code} winner`,
      categories: raceCategories[code],
      targets: new Map([["D", targets.races.get(code)], ["R", 1 - targets.races.get(code)]]),
    })),
  ];

  const weights = new Float64Array(simRows.length);
  weights.fill(1 / simRows.length);
  let iterations = 0;
  let maximumError = Number.POSITIVE_INFINITY;
  for (; iterations < 10_000; iterations += 1) {
    for (const constraint of constraints) rakeConstraint(weights, constraint.categories, constraint.targets, constraint.label);
    normalize(weights);
    maximumError = maximumConstraintError(weights, constraints);
    if (maximumError < 1e-10) break;
  }
  if (maximumError >= 1e-7) throw new Error(`Raking did not converge; maximum error is ${maximumError}`);

  const rawLogOdds = raceCodes.map((code) => logit(targets.races.get(code)));
  const meanLogOdds = rawLogOdds.reduce((sum, value) => sum + value, 0) / rawLogOdds.length;
  const centeredLogOdds = rawLogOdds.map((value) => value - meanLogOdds);
  const loadingScale = Math.max(...centeredLogOdds.map(Math.abs));
  const conventionalityLoadings = centeredLogOdds.map((value) => value / loadingScale);
  const comboConventionality = (combo) => raceCodes.reduce(
    (score, code, index) => score + (combo.includes(`${code}-D`) ? conventionalityLoadings[index] : 0),
    0,
  );

  const houseMean = weightedMean(houseSeats, weights);
  const senateMean = weightedMean(senateSeats, weights);
  const houseSd = weightedStandardDeviation(houseSeats, weights, houseMean);
  const senateSd = weightedStandardDeviation(senateSeats, weights, senateMean);
  const houseZ = houseSeats.map((value) => (value - houseMean) / houseSd);
  const senateZ = senateSeats.map((value) => (value - senateMean) / senateSd);
  const overallScores = houseZ.map((value, index) => (value + senateZ[index]) / Math.sqrt(2));
  const tiltScores = houseZ.map((value, index) => (value - senateZ[index]) / Math.sqrt(2));
  const overallPercentiles = weightedMidrankPercentiles(overallScores, weights, "descending");
  const tiltPercentiles = weightedMidrankPercentiles(tiltScores, weights, "ascending");
  const senateOnlyPercentiles = weightedMidrankPercentiles(senateSeats, weights, "descending");

  const comboWeights = new Map();
  const comboCounts = new Map();
  const comboSenateWeightedSums = new Map();
  const totalWeights = new Map();
  const totalComboWeights = new Map();
  const totalComboCounts = new Map();
  const jointGrid = new Map();
  for (let index = 0; index < simRows.length; index += 1) {
    const combo = combos[index];
    const senateTotal = senateSeats[index];
    const houseTotal = houseSeats[index];
    const weight = weights[index];
    comboWeights.set(combo, (comboWeights.get(combo) ?? 0) + weight);
    comboCounts.set(combo, (comboCounts.get(combo) ?? 0) + 1);
    comboSenateWeightedSums.set(combo, (comboSenateWeightedSums.get(combo) ?? 0) + weight * senateTotal);
    totalWeights.set(senateTotal, (totalWeights.get(senateTotal) ?? 0) + weight);
    const routeKey = `${senateTotal}|${combo}`;
    totalComboWeights.set(routeKey, (totalComboWeights.get(routeKey) ?? 0) + weight);
    totalComboCounts.set(routeKey, (totalComboCounts.get(routeKey) ?? 0) + 1);
    const gridKey = `${houseTotal}|${senateTotal}`;
    if (!jointGrid.has(gridKey)) jointGrid.set(gridKey, { count: 0, weight: 0, overallRank: 0, tiltRank: 0 });
    const cell = jointGrid.get(gridKey);
    cell.count += 1;
    cell.weight += weight;
    cell.overallRank += weight * overallPercentiles[index];
    cell.tiltRank += weight * tiltPercentiles[index];
  }

  const comboIds = [...new Set(combos)].sort();
  const comboRows = comboIds.map((combo) => {
    const weight = comboWeights.get(combo) ?? 0;
    return {
      combo_id: combo,
      democratic_winners: raceCodes.filter((code) => combo.includes(`${code}-D`)).join(" "),
      republican_winners: raceCodes.filter((code) => combo.includes(`${code}-R`)).join(" "),
      democratic_wins_among_six: raceCodes.filter((code) => combo.includes(`${code}-D`)).length,
      open_simulation_count: comboCounts.get(combo) ?? 0,
      calibrated_probability: round(weight),
      conventionality_score: round(comboConventionality(combo), 6),
      mean_democratic_aligned_senate_seats: weight ? round(comboSenateWeightedSums.get(combo) / weight, 3) : null,
    };
  });

  const minimumSenate = Math.min(...senateSeats);
  const maximumSenate = Math.max(...senateSeats);
  const routeRows = [];
  for (let senateTotal = minimumSenate; senateTotal <= maximumSenate; senateTotal += 1) {
    const totalWeight = totalWeights.get(senateTotal) ?? 0;
    const rowsForTotal = comboIds.map((combo) => {
      const key = `${senateTotal}|${combo}`;
      const weight = totalComboWeights.get(key) ?? 0;
      const conditional = totalWeight ? weight / totalWeight : 0;
      return {
        key,
        democratic_aligned_senate_seats: senateTotal,
        combo_id: combo,
        democratic_winners: raceCodes.filter((code) => combo.includes(`${code}-D`)).join(" "),
        republican_winners: raceCodes.filter((code) => combo.includes(`${code}-R`)).join(" "),
        democratic_wins_among_six: raceCodes.filter((code) => combo.includes(`${code}-D`)).length,
        open_simulation_count: totalComboCounts.get(key) ?? 0,
        calibrated_joint_probability: weight,
        calibrated_probability_given_senate_total: conditional,
        calibrated_probability_senate_total_given_combo: comboWeights.get(combo) ? weight / comboWeights.get(combo) : 0,
        conventionality_score: comboConventionality(combo),
        route_surprisal_nats: conditional ? -Math.log(conditional) : null,
      };
    });
    const conventionalityRanks = weightedGroupedMidranks(rowsForTotal, "conventionality_score", "calibrated_joint_probability", "ascending");
    const rarityRanks = weightedGroupedMidranks(rowsForTotal, "calibrated_probability_given_senate_total", "calibrated_joint_probability", "descending");
    for (const row of rowsForTotal) {
      routeRows.push({
        ...row,
        calibrated_joint_probability: round(row.calibrated_joint_probability),
        calibrated_probability_given_senate_total: round(row.calibrated_probability_given_senate_total),
        calibrated_probability_senate_total_given_combo: round(row.calibrated_probability_senate_total_given_combo),
        conventionality_score: round(row.conventionality_score, 6),
        conventionality_percentile_given_senate_total: conventionalityRanks.has(row.key) ? round(conventionalityRanks.get(row.key), 3) : null,
        route_surprisal_nats: row.route_surprisal_nats === null ? null : round(row.route_surprisal_nats, 6),
        rarity_percentile_given_senate_total: rarityRanks.has(row.key) ? round(rarityRanks.get(row.key), 3) : null,
      });
    }
  }

  const gridRows = [...jointGrid.entries()].map(([key, cell]) => {
    const [houseTotal, senateTotal] = key.split("|").map(Number);
    return {
      democratic_house_seats: houseTotal,
      democratic_aligned_senate_seats: senateTotal,
      open_simulation_count: cell.count,
      calibrated_probability: round(cell.weight),
      overall_dem_to_gop_percentile: round(cell.overallRank / cell.weight, 3),
      house_vs_senate_tilt_percentile: round(cell.tiltRank / cell.weight, 3),
    };
  }).sort((left, right) => left.democratic_aligned_senate_seats - right.democratic_aligned_senate_seats ||
    left.democratic_house_seats - right.democratic_house_seats);

  const simulationRows = simRows.map((row, index) => ({
    sim_id: row.sim_id,
    weight: round(weights[index], 12),
    democratic_house_seats: houseSeats[index],
    democratic_aligned_senate_seats: senateSeats[index],
    six_state_combo: combos[index],
    overall_dem_to_gop_percentile: round(overallPercentiles[index], 3),
    house_vs_senate_tilt_percentile: round(tiltPercentiles[index], 3),
    conventionality_score: round(comboConventionality(combos[index]), 6),
  }));

  const constraintDiagnostics = Object.fromEntries(constraints.map((constraint) => {
    const achieved = achievedByCategory(weights, constraint.categories);
    return [constraint.label, Object.fromEntries([...constraint.targets].map(([category, target]) => [
      category,
      { target: round(target), achieved: round(achieved.get(category) ?? 0), error: round((achieved.get(category) ?? 0) - target, 12) },
    ]))];
  }));
  const effectiveSampleSize = 1 / weights.reduce((sum, weight) => sum + weight ** 2, 0);
  const maxWeight = Math.max(...weights);
  const metadata = {
    generated_at: new Date().toISOString(),
    status: "Approximation, not Silver Bulletin simulation output",
    method: "Iterative proportional fitting (raking) of Mac Tan's 10,000 shared House/Senate draws",
    source_draws: {
      model: "Mac Tan US-2026",
      repository: "https://github.com/thisismactan/US-2026",
      commit: "bf20a3e321fb0cac0f45b8ed9dc04dbfa764f494",
      license: "MIT",
    },
    calibration_targets: {
      model: "Silver Bulletin FLIPR Deluxe",
      forecast_date: "2026-08-20",
      page: "https://www.natesilver.net/p/nate-silver-2026-midterm-election-polls-model",
      constraints: "Six individual Senate win probabilities, ten Senate seat bands, six House seat bands, and four joint-control cells",
    },
    diagnostics: {
      iterations: iterations + 1,
      maximum_absolute_constraint_error: maximumError,
      effective_sample_size: round(effectiveSampleSize, 1),
      maximum_draw_weight: round(maxWeight, 8),
      maximum_weight_multiple_of_uniform: round(maxWeight * weights.length, 2),
      constraint_results: constraintDiagnostics,
    },
    dimensions: {
      conventionality: {
        description: "At a fixed number of wins, high values put Democratic wins in the races where Silver gives Democrats better marginal odds; low values invert the expected battlefield",
        derivation: "Sum of centered Silver Democratic-win logits for races won by Democrats; centering makes the loading vector sum to zero and therefore orthogonal to raw win count",
        loadings_scaled_to_max_abs_one: Object.fromEntries(raceCodes.map((code, index) => [code, round(conventionalityLoadings[index], 6)])),
      },
      house_senate: {
        description: "Standardized 45-degree rotation of the two chamber seat totals",
        house_mean: round(houseMean, 3),
        house_standard_deviation: round(houseSd, 3),
        senate_mean: round(senateMean, 3),
        senate_standard_deviation: round(senateSd, 3),
      },
    },
    caveats: [
      "Raking changes draw weights but cannot create outcome patterns absent from the open simulations.",
      "The calibration targets are rounded/public chart outputs and do not identify Silver's unpublished dependence structure.",
      "Large or concentrated weights reduce effective simulation size; consult diagnostics before using rare-route estimates.",
      "A zero open-simulation count means not observed in 10,000 draws, not impossible.",
    ],
  };

  const senatePercentileByTotal = Object.fromEntries([...new Set(senateSeats)].map((total) => {
    const index = senateSeats.indexOf(total);
    return [total, round(senateOnlyPercentiles[index], 3)];
  }));
  const explorerData = {
    updated: "2026-08-20",
    simulations: simRows.length,
    effectiveSampleSize: round(effectiveSampleSize, 1),
    status: "Silver-calibrated approximation using open Mac Tan joint draws",
    conventionalityLoadings: Object.fromEntries(raceCodes.map((code, index) => [code, round(conventionalityLoadings[index], 6)])),
    senateTotals: [...totalWeights.entries()]
      .filter(([, probability]) => probability >= 0.0005)
      .map(([seats, probability]) => ({
        seats,
        probability: round(probability),
        mainPercentile: senatePercentileByTotal[seats],
      }))
      .sort((left, right) => right.seats - left.seats),
    senateRoutes: routeRows
      .filter((row) => row.calibrated_joint_probability > 0 && (totalWeights.get(row.democratic_aligned_senate_seats) ?? 0) >= 0.0005)
      .map((row) => ({
        seats: row.democratic_aligned_senate_seats,
        combo: row.combo_id,
        dem: row.democratic_winners,
        rep: row.republican_winners,
        count: row.open_simulation_count,
        probabilityGivenTotal: row.calibrated_probability_given_senate_total,
        conventionalityPercentile: row.conventionality_percentile_given_senate_total,
        rarityPercentile: row.rarity_percentile_given_senate_total,
      })),
    chamberCells: gridRows.map((row) => ({
      house: row.democratic_house_seats,
      senate: row.democratic_aligned_senate_seats,
      count: row.open_simulation_count,
      probability: row.calibrated_probability,
      mainPercentile: row.overall_dem_to_gop_percentile,
      tiltPercentile: row.house_vs_senate_tilt_percentile,
    })),
  };

  await Promise.all([mkdir(outputDir, { recursive: true }), mkdir(appDataDir, { recursive: true })]);
  await Promise.all([
    writeFile(resolve(outputDir, "six-state-combinations.csv"), toCsv(comboRows, [
      "combo_id", "democratic_winners", "republican_winners", "democratic_wins_among_six", "open_simulation_count",
      "calibrated_probability", "conventionality_score", "mean_democratic_aligned_senate_seats",
    ])),
    writeFile(resolve(outputDir, "senate-total-routes.csv"), toCsv(routeRows, [
      "democratic_aligned_senate_seats", "combo_id", "democratic_winners", "republican_winners",
      "democratic_wins_among_six", "open_simulation_count", "calibrated_joint_probability",
      "calibrated_probability_given_senate_total", "calibrated_probability_senate_total_given_combo",
      "conventionality_score", "conventionality_percentile_given_senate_total", "route_surprisal_nats",
      "rarity_percentile_given_senate_total",
    ])),
    writeFile(resolve(outputDir, "house-senate-joint-grid.csv"), toCsv(gridRows, [
      "democratic_house_seats", "democratic_aligned_senate_seats", "open_simulation_count", "calibrated_probability",
      "overall_dem_to_gop_percentile", "house_vs_senate_tilt_percentile",
    ])),
    writeFile(resolve(outputDir, "joint-simulation-weights.csv"), toCsv(simulationRows, [
      "sim_id", "weight", "democratic_house_seats", "democratic_aligned_senate_seats", "six_state_combo",
      "overall_dem_to_gop_percentile", "house_vs_senate_tilt_percentile", "conventionality_score",
    ])),
    writeFile(resolve(outputDir, "metadata.json"), JSON.stringify(metadata, null, 2) + "\n"),
    writeFile(resolve(appDataDir, "orthogonal-outcomes.json"), JSON.stringify(explorerData) + "\n"),
  ]);

  console.log(`Converged in ${iterations + 1} iterations; max error ${maximumError.toExponential(2)}; ESS ${effectiveSampleSize.toFixed(1)}`);
  console.log(`Wrote calibrated approximation to ${outputDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

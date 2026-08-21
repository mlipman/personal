#!/usr/bin/env node

import { createReadStream } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Readable } from "node:stream";
import { createInterface } from "node:readline";

const MODEL_COMMIT = "bf20a3e321fb0cac0f45b8ed9dc04dbfa764f494";
const MODEL_DATE = "2026-08-21";
const POSTERIOR_ROOT = `https://media.githubusercontent.com/media/thisismactan/US-2026/${MODEL_COMMIT}/output`;
const DEFAULT_SENATE = `${POSTERIOR_ROOT}/senate_state_posterior.csv`;
const DEFAULT_HOUSE = `${POSTERIOR_ROOT}/house_district_posterior.csv`;
const EXPECTED_SIMULATIONS = 10_000;
const FIXED_REPUBLICAN_SENATE_SEATS = 31;

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const defaultOutputDir = resolve(projectRoot, "data", "derived", `mac-tan-${MODEL_DATE}`);

const races = [
  { state: "Iowa", code: "IA" },
  { state: "Texas", code: "TX" },
  { state: "Ohio", code: "OH" },
  { state: "Alaska", code: "AK" },
  { state: "Maine", code: "ME" },
  { state: "Michigan", code: "MI" },
];

function parseArgs(argv) {
  const options = {
    senate: DEFAULT_SENATE,
    house: DEFAULT_HOUSE,
    outputDir: defaultOutputDir,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === "--senate" && next) options.senate = next;
    else if (arg === "--house" && next) options.house = next;
    else if (arg === "--output-dir" && next) options.outputDir = isAbsolute(next) ? next : resolve(next);
    else if (arg === "--help") {
      console.log(`Usage: node scripts/build-orthogonal-data.mjs [options]\n\n` +
        `  --senate PATH_OR_URL   Senate state posterior CSV\n` +
        `  --house PATH_OR_URL    House district posterior CSV\n` +
        `  --output-dir PATH      Destination directory\n`);
      process.exit(0);
    } else if (arg.startsWith("--")) {
      throw new Error(`Unknown or incomplete option: ${arg}`);
    } else {
      continue;
    }

    index += 1;
  }

  return options;
}

async function lineStream(source) {
  if (/^https?:\/\//.test(source)) {
    const response = await fetch(source);
    if (!response.ok || !response.body) {
      throw new Error(`Could not download ${source}: ${response.status} ${response.statusText}`);
    }
    return createInterface({ input: Readable.fromWeb(response.body), crlfDelay: Infinity });
  }

  return createInterface({ input: createReadStream(resolve(source)), crlfDelay: Infinity });
}

async function readSenate(source) {
  const selectedIndex = new Map(races.map((race, index) => [race.state, index]));
  const republicanSeats = new Int16Array(EXPECTED_SIMULATIONS);
  republicanSeats.fill(FIXED_REPUBLICAN_SENATE_SEATS);
  const raceMargins = Array.from(
    { length: EXPECTED_SIMULATIONS },
    () => new Float64Array(races.length).fill(Number.NaN),
  );
  const rowsPerSimulation = new Int16Array(EXPECTED_SIMULATIONS);
  let lineNumber = 0;

  for await (const line of await lineStream(source)) {
    lineNumber += 1;
    if (lineNumber === 1 || !line) continue;
    const [state, , simIdText, republicanTwoPartyText] = line.split(",");
    const simIndex = Number(simIdText) - 1;
    const republicanTwoParty = Number(republicanTwoPartyText);
    if (simIndex < 0 || simIndex >= EXPECTED_SIMULATIONS || !Number.isFinite(republicanTwoParty)) {
      throw new Error(`Invalid Senate row ${lineNumber}: ${line}`);
    }

    rowsPerSimulation[simIndex] += 1;
    if (republicanTwoParty > 0.5) republicanSeats[simIndex] += 1;

    const raceIndex = selectedIndex.get(state);
    if (raceIndex !== undefined) {
      // Positive values are better for Democrats.
      raceMargins[simIndex][raceIndex] = 0.5 - republicanTwoParty;
    }
  }

  for (let simIndex = 0; simIndex < EXPECTED_SIMULATIONS; simIndex += 1) {
    if (rowsPerSimulation[simIndex] !== 35) {
      throw new Error(`Senate simulation ${simIndex + 1} has ${rowsPerSimulation[simIndex]} rows; expected 35`);
    }
    for (let raceIndex = 0; raceIndex < races.length; raceIndex += 1) {
      if (!Number.isFinite(raceMargins[simIndex][raceIndex])) {
        throw new Error(`Senate simulation ${simIndex + 1} is missing ${races[raceIndex].state}`);
      }
    }
  }

  // Mac Tan reports Nebraska's possible independent winner separately. For the
  // same control-oriented convention used by most forecast charts, count every
  // non-Republican seat on the Democratic/independent-aligned side.
  const democraticAlignedSeats = republicanSeats.map((seats) => 100 - seats);
  return { democraticAlignedSeats, raceMargins };
}

async function readHouse(source) {
  const democraticSeats = new Int16Array(EXPECTED_SIMULATIONS);
  const rowsPerSimulation = new Int16Array(EXPECTED_SIMULATIONS);
  let lineNumber = 0;

  for await (const line of await lineStream(source)) {
    lineNumber += 1;
    if (lineNumber === 1 || !line) continue;
    const [, , simIdText, republicanTwoPartyText] = line.split(",");
    const simIndex = Number(simIdText) - 1;
    const republicanTwoParty = Number(republicanTwoPartyText);
    if (simIndex < 0 || simIndex >= EXPECTED_SIMULATIONS || !Number.isFinite(republicanTwoParty)) {
      throw new Error(`Invalid House row ${lineNumber}: ${line}`);
    }

    rowsPerSimulation[simIndex] += 1;
    if (republicanTwoParty <= 0.5) democraticSeats[simIndex] += 1;
  }

  for (let simIndex = 0; simIndex < EXPECTED_SIMULATIONS; simIndex += 1) {
    if (rowsPerSimulation[simIndex] !== 435) {
      throw new Error(`House simulation ${simIndex + 1} has ${rowsPerSimulation[simIndex]} rows; expected 435`);
    }
  }

  return democraticSeats;
}

function mean(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function sampleStandardDeviation(values, average = mean(values)) {
  return Math.sqrt(values.reduce((sum, value) => sum + (value - average) ** 2, 0) / (values.length - 1));
}

function covarianceMatrix(rows) {
  const columns = rows[0].length;
  const means = Array.from({ length: columns }, (_, column) => mean(rows.map((row) => row[column])));
  const covariance = Array.from({ length: columns }, () => Array(columns).fill(0));

  for (const row of rows) {
    for (let left = 0; left < columns; left += 1) {
      for (let right = left; right < columns; right += 1) {
        covariance[left][right] += (row[left] - means[left]) * (row[right] - means[right]);
      }
    }
  }

  for (let left = 0; left < columns; left += 1) {
    for (let right = left; right < columns; right += 1) {
      covariance[left][right] /= rows.length - 1;
      covariance[right][left] = covariance[left][right];
    }
  }

  return { means, covariance };
}

function multiplyMatrices(left, right) {
  return left.map((row) => right[0].map((_, column) =>
    row.reduce((sum, value, index) => sum + value * right[index][column], 0)));
}

function projectedCovariance(covariance) {
  const size = covariance.length;
  const projection = Array.from({ length: size }, (_, row) =>
    Array.from({ length: size }, (_, column) => (row === column ? 1 : 0) - 1 / size));
  return multiplyMatrices(multiplyMatrices(projection, covariance), projection);
}

// Jacobi rotations are compact and deterministic for this six-by-six symmetric matrix.
function symmetricEigenDecomposition(input) {
  const matrix = input.map((row) => [...row]);
  const size = matrix.length;
  const vectors = Array.from({ length: size }, (_, row) =>
    Array.from({ length: size }, (_, column) => (row === column ? 1 : 0)));

  for (let iteration = 0; iteration < 10_000; iteration += 1) {
    let pivotRow = 0;
    let pivotColumn = 1;
    let largest = 0;
    for (let row = 0; row < size; row += 1) {
      for (let column = row + 1; column < size; column += 1) {
        if (Math.abs(matrix[row][column]) > largest) {
          largest = Math.abs(matrix[row][column]);
          pivotRow = row;
          pivotColumn = column;
        }
      }
    }
    if (largest < 1e-14) break;

    const angle = 0.5 * Math.atan2(
      2 * matrix[pivotRow][pivotColumn],
      matrix[pivotColumn][pivotColumn] - matrix[pivotRow][pivotRow],
    );
    const sine = Math.sin(angle);
    const cosine = Math.cos(angle);

    for (let index = 0; index < size; index += 1) {
      if (index === pivotRow || index === pivotColumn) continue;
      const rowValue = matrix[index][pivotRow];
      const columnValue = matrix[index][pivotColumn];
      matrix[index][pivotRow] = matrix[pivotRow][index] = cosine * rowValue - sine * columnValue;
      matrix[index][pivotColumn] = matrix[pivotColumn][index] = sine * rowValue + cosine * columnValue;
    }

    const rowDiagonal = matrix[pivotRow][pivotRow];
    const columnDiagonal = matrix[pivotColumn][pivotColumn];
    const offDiagonal = matrix[pivotRow][pivotColumn];
    matrix[pivotRow][pivotRow] = cosine ** 2 * rowDiagonal - 2 * sine * cosine * offDiagonal + sine ** 2 * columnDiagonal;
    matrix[pivotColumn][pivotColumn] = sine ** 2 * rowDiagonal + 2 * sine * cosine * offDiagonal + cosine ** 2 * columnDiagonal;
    matrix[pivotRow][pivotColumn] = matrix[pivotColumn][pivotRow] = 0;

    for (let index = 0; index < size; index += 1) {
      const rowVector = vectors[index][pivotRow];
      const columnVector = vectors[index][pivotColumn];
      vectors[index][pivotRow] = cosine * rowVector - sine * columnVector;
      vectors[index][pivotColumn] = sine * rowVector + cosine * columnVector;
    }
  }

  return Array.from({ length: size }, (_, column) => ({
    value: matrix[column][column],
    vector: vectors.map((row) => row[column]),
  })).sort((left, right) => right.value - left.value);
}

function normalizeAndOrientGeographyVector(vector) {
  const westernIndices = races
    .map((race, index) => ({ ...race, index }))
    .filter((race) => race.code === "AK" || race.code === "TX")
    .map((race) => race.index);
  const easternIndices = races
    .map((race, index) => ({ ...race, index }))
    .filter((race) => race.code === "ME" || race.code === "MI")
    .map((race) => race.index);
  const westernLoading = westernIndices.reduce((sum, index) => sum + vector[index], 0);
  const easternLoading = easternIndices.reduce((sum, index) => sum + vector[index], 0);
  const direction = westernLoading >= easternLoading ? 1 : -1;
  const oriented = vector.map((value) => value * direction);
  const maximum = Math.max(...oriented.map(Math.abs));
  return oriented.map((value) => value / maximum);
}

function empiricalMidrankPercentiles(values, order = "ascending") {
  const sorted = values
    .map((value, index) => ({ value, index }))
    .sort((left, right) => order === "ascending" ? left.value - right.value : right.value - left.value);
  const result = new Float64Array(values.length);
  let start = 0;
  while (start < sorted.length) {
    let end = start + 1;
    while (end < sorted.length && Math.abs(sorted[end].value - sorted[start].value) < 1e-12) end += 1;
    const percentile = 100 * (start + (end - start) / 2) / sorted.length;
    for (let index = start; index < end; index += 1) result[sorted[index].index] = percentile;
    start = end;
  }
  return result;
}

function popcount(mask) {
  let value = mask;
  let count = 0;
  while (value) {
    count += value & 1;
    value >>= 1;
  }
  return count;
}

function comboId(mask) {
  return races.map((race, index) => `${race.code}-${mask & (1 << index) ? "D" : "R"}`).join("_");
}

function comboWinners(mask, winner) {
  return races
    .filter((_, index) => Boolean(mask & (1 << index)) === (winner === "D"))
    .map((race) => race.code)
    .join(" ");
}

function comboScore(mask, weights) {
  return weights.reduce((score, weight, index) => score + weight * (mask & (1 << index) ? 1 : 0), 0);
}

function csvEscape(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return "";
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function toCsv(rows, columns) {
  return [
    columns.join(","),
    ...rows.map((row) => columns.map((column) => csvEscape(row[column])).join(",")),
  ].join("\n") + "\n";
}

function round(value, digits = 6) {
  return Number(value.toFixed(digits));
}

function weightedGroupedMidranks(items, valueKey, countKey, order = "ascending") {
  const observed = items
    .filter((item) => item[countKey] > 0)
    .sort((left, right) => order === "ascending"
      ? left[valueKey] - right[valueKey]
      : right[valueKey] - left[valueKey]);
  const total = observed.reduce((sum, item) => sum + item[countKey], 0);
  const result = new Map();
  let cumulative = 0;
  let start = 0;
  while (start < observed.length) {
    let end = start + 1;
    while (end < observed.length && Math.abs(observed[end][valueKey] - observed[start][valueKey]) < 1e-12) end += 1;
    const groupCount = observed.slice(start, end).reduce((sum, item) => sum + item[countKey], 0);
    const percentile = 100 * (cumulative + groupCount / 2) / total;
    for (let index = start; index < end; index += 1) result.set(observed[index].key, percentile);
    cumulative += groupCount;
    start = end;
  }
  return result;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  console.log("Reading Senate posterior draws…");
  const senate = await readSenate(options.senate);
  console.log("Reading House posterior draws…");
  const houseSeats = await readHouse(options.house);

  const { covariance } = covarianceMatrix(senate.raceMargins);
  const residualCovariance = projectedCovariance(covariance);
  const eigenpairs = symmetricEigenDecomposition(residualCovariance)
    .filter((pair) => pair.value > 1e-12);
  const geographyWeights = normalizeAndOrientGeographyVector(eigenpairs[0].vector);
  const residualVariance = eigenpairs.reduce((sum, pair) => sum + pair.value, 0);

  const senateSeats = Array.from(senate.democraticAlignedSeats);
  const houseSeatValues = Array.from(houseSeats);
  const senateMean = mean(senateSeats);
  const houseMean = mean(houseSeatValues);
  const senateSd = sampleStandardDeviation(senateSeats, senateMean);
  const houseSd = sampleStandardDeviation(houseSeatValues, houseMean);
  const senateZ = senateSeats.map((value) => (value - senateMean) / senateSd);
  const houseZ = houseSeatValues.map((value) => (value - houseMean) / houseSd);
  const rootTwo = Math.sqrt(2);
  const overallDemScore = senateZ.map((value, index) => (value + houseZ[index]) / rootTwo);
  const houseVsSenateTilt = senateZ.map((value, index) => (houseZ[index] - value) / rootTwo);
  const overallPercentile = empiricalMidrankPercentiles(overallDemScore, "descending");
  const tiltPercentile = empiricalMidrankPercentiles(houseVsSenateTilt, "ascending");
  const geographyContinuousScore = senate.raceMargins.map((margins) =>
    margins.reduce((sum, margin, index) => sum + margin * geographyWeights[index], 0));

  const masks = senate.raceMargins.map((margins) => margins.reduce(
    (mask, margin, index) => mask | (margin >= 0 ? 1 << index : 0),
    0,
  ));
  const comboCounts = new Int32Array(64);
  const comboSenateSeatSums = new Float64Array(64);
  const totalCounts = new Map();
  const totalComboCounts = new Map();
  const jointChamberCounts = new Map();

  for (let simIndex = 0; simIndex < EXPECTED_SIMULATIONS; simIndex += 1) {
    const mask = masks[simIndex];
    const senateTotal = senateSeats[simIndex];
    const houseTotal = houseSeatValues[simIndex];
    comboCounts[mask] += 1;
    comboSenateSeatSums[mask] += senateTotal;
    totalCounts.set(senateTotal, (totalCounts.get(senateTotal) ?? 0) + 1);
    const totalComboKey = `${senateTotal}|${mask}`;
    totalComboCounts.set(totalComboKey, (totalComboCounts.get(totalComboKey) ?? 0) + 1);
    const jointKey = `${houseTotal}|${senateTotal}`;
    jointChamberCounts.set(jointKey, (jointChamberCounts.get(jointKey) ?? 0) + 1);
  }

  const countBySixWins = Array(7).fill(0);
  for (let mask = 0; mask < 64; mask += 1) countBySixWins[popcount(mask)] += comboCounts[mask];

  const comboRows = Array.from({ length: 64 }, (_, mask) => {
    const count = comboCounts[mask];
    const sixWins = popcount(mask);
    return {
      combo_id: comboId(mask),
      bitmask: mask.toString(2).padStart(6, "0"),
      democratic_winners: comboWinners(mask, "D"),
      republican_winners: comboWinners(mask, "R"),
      democratic_wins_among_six: sixWins,
      simulation_count: count,
      probability: round(count / EXPECTED_SIMULATIONS),
      probability_given_six_win_count: round(countBySixWins[sixWins] ? count / countBySixWins[sixWins] : 0),
      geography_path_score: round(comboScore(mask, geographyWeights)),
      mean_democratic_aligned_senate_seats: count ? round(comboSenateSeatSums[mask] / count, 3) : null,
      monte_carlo_standard_error: round(Math.sqrt((count / EXPECTED_SIMULATIONS) * (1 - count / EXPECTED_SIMULATIONS) / EXPECTED_SIMULATIONS)),
    };
  });

  const minimumSenate = Math.min(...senateSeats);
  const maximumSenate = Math.max(...senateSeats);
  const routeRows = [];
  for (let senateTotal = minimumSenate; senateTotal <= maximumSenate; senateTotal += 1) {
    const totalCount = totalCounts.get(senateTotal) ?? 0;
    const rowsForTotal = Array.from({ length: 64 }, (_, mask) => {
      const key = `${senateTotal}|${mask}`;
      const count = totalComboCounts.get(key) ?? 0;
      const conditionalProbability = totalCount ? count / totalCount : 0;
      return {
        key,
        combo_id: comboId(mask),
        democratic_aligned_senate_seats: senateTotal,
        democratic_winners: comboWinners(mask, "D"),
        republican_winners: comboWinners(mask, "R"),
        democratic_wins_among_six: popcount(mask),
        simulation_count: count,
        joint_probability: count / EXPECTED_SIMULATIONS,
        probability_given_senate_total: conditionalProbability,
        probability_senate_total_given_combo: comboCounts[mask] ? count / comboCounts[mask] : 0,
        geography_path_score: comboScore(mask, geographyWeights),
        route_surprisal_nats: conditionalProbability ? -Math.log(conditionalProbability) : null,
      };
    });
    const geographyRanks = weightedGroupedMidranks(rowsForTotal, "geography_path_score", "simulation_count", "ascending");
    const rarityRanks = weightedGroupedMidranks(rowsForTotal, "probability_given_senate_total", "simulation_count", "descending");
    for (const row of rowsForTotal) {
      routeRows.push({
        ...row,
        joint_probability: round(row.joint_probability),
        probability_given_senate_total: round(row.probability_given_senate_total),
        probability_senate_total_given_combo: round(row.probability_senate_total_given_combo),
        geography_path_score: round(row.geography_path_score),
        geography_percentile_given_senate_total: geographyRanks.has(row.key) ? round(geographyRanks.get(row.key), 3) : null,
        route_surprisal_nats: row.route_surprisal_nats === null ? null : round(row.route_surprisal_nats),
        rarity_percentile_given_senate_total: rarityRanks.has(row.key) ? round(rarityRanks.get(row.key), 3) : null,
      });
    }
  }

  const overallRanksByCell = new Map();
  const tiltRanksByCell = new Map();
  for (let index = 0; index < EXPECTED_SIMULATIONS; index += 1) {
    const key = `${houseSeatValues[index]}|${senateSeats[index]}`;
    if (!overallRanksByCell.has(key)) overallRanksByCell.set(key, []);
    if (!tiltRanksByCell.has(key)) tiltRanksByCell.set(key, []);
    overallRanksByCell.get(key).push(overallPercentile[index]);
    tiltRanksByCell.get(key).push(tiltPercentile[index]);
  }
  const jointRows = [...jointChamberCounts.entries()]
    .map(([key, count]) => {
      const [houseTotal, senateTotal] = key.split("|").map(Number);
      return {
        democratic_house_seats: houseTotal,
        democratic_aligned_senate_seats: senateTotal,
        simulation_count: count,
        probability: round(count / EXPECTED_SIMULATIONS),
        overall_dem_to_gop_percentile: round(mean(overallRanksByCell.get(key)), 3),
        house_vs_senate_tilt_percentile: round(mean(tiltRanksByCell.get(key)), 3),
      };
    })
    .sort((left, right) => left.democratic_aligned_senate_seats - right.democratic_aligned_senate_seats ||
      left.democratic_house_seats - right.democratic_house_seats);

  const simulationRows = Array.from({ length: EXPECTED_SIMULATIONS }, (_, index) => ({
    sim_id: index + 1,
    democratic_house_seats: houseSeatValues[index],
    democratic_aligned_senate_seats: senateSeats[index],
    six_state_combo: comboId(masks[index]),
    democratic_wins_among_six: popcount(masks[index]),
    overall_dem_score: round(overallDemScore[index]),
    overall_dem_to_gop_percentile: round(overallPercentile[index], 3),
    house_vs_senate_tilt_score: round(houseVsSenateTilt[index]),
    house_vs_senate_tilt_percentile: round(tiltPercentile[index], 3),
    six_state_geography_continuous_score: round(geographyContinuousScore[index]),
    six_state_geography_combo_score: round(comboScore(masks[index], geographyWeights)),
  }));

  const covarianceHouseSenate = mean(houseZ.map((value, index) => value * senateZ[index]));
  const positiveRaces = races
    .map((race, index) => ({ code: race.code, weight: geographyWeights[index] }))
    .filter((race) => race.weight > 0)
    .sort((left, right) => right.weight - left.weight);
  const negativeRaces = races
    .map((race, index) => ({ code: race.code, weight: geographyWeights[index] }))
    .filter((race) => race.weight < 0)
    .sort((left, right) => left.weight - right.weight);

  const metadata = {
    generated_at: new Date().toISOString(),
    model: {
      name: "Mac Tan US-2026",
      repository: "https://github.com/thisismactan/US-2026",
      commit: MODEL_COMMIT,
      snapshot_date: MODEL_DATE,
      license: "MIT",
      simulations: EXPECTED_SIMULATIONS,
      senate_posterior_source: DEFAULT_SENATE,
      house_posterior_source: DEFAULT_HOUSE,
      senate_posterior_sha256: "a31b98537f1cede36fe766080aefea7c2643c21faca6a8b0a16465d3215374e8",
      house_posterior_sha256: "d4074c9222620623daad05bb1dc3b0add5c26de0559e5bcc9e4efd7f9deed580",
    },
    conventions: {
      race_order: races.map((race) => race.code),
      democratic_win_test: "r2p_pred <= 0.5",
      senate_total: "100 minus Republican seats; includes a possible Nebraska independent on the non-Republican side",
      primary_axis: "0 is the strongest Democratic joint chamber performance; 100 is the strongest Republican performance",
      chamber_tilt_axis: "0 is Senate overperformance; 100 is House overperformance",
      geography_axis: `low emphasizes ${negativeRaces.map((race) => race.code).join("/")}; high emphasizes ${positiveRaces.map((race) => race.code).join("/")}`,
      zero_count: "Not observed in 10,000 draws; not proof of zero probability",
    },
    dimensions: {
      six_state_geography: {
        derivation: "First principal component of the six continuous Democratic race margins after projecting out the equal-weight/common direction",
        explained_share_of_residual_variance: round(eigenpairs[0].value / residualVariance),
        loadings_scaled_to_max_abs_one: Object.fromEntries(races.map((race, index) => [race.code, round(geographyWeights[index])])),
        other_residual_component_shares: eigenpairs.slice(1).map((pair) => round(pair.value / residualVariance)),
      },
      house_senate: {
        derivation: "Standardize chamber seat totals, then rotate 45 degrees: overall=(House z + Senate z)/sqrt(2); tilt=(House z - Senate z)/sqrt(2)",
        house_mean: round(houseMean, 3),
        house_standard_deviation: round(houseSd, 3),
        senate_mean: round(senateMean, 3),
        senate_standard_deviation: round(senateSd, 3),
        house_senate_correlation: round(covarianceHouseSenate, 3),
      },
      route_rarity: {
        derivation: "-ln P(six-state combination | Democratic-aligned Senate total), with a probability-weighted conditional midrank percentile",
      },
    },
  };

  await mkdir(options.outputDir, { recursive: true });
  await Promise.all([
    writeFile(resolve(options.outputDir, "six-state-combinations.csv"), toCsv(comboRows, [
      "combo_id", "bitmask", "democratic_winners", "republican_winners", "democratic_wins_among_six",
      "simulation_count", "probability", "probability_given_six_win_count", "geography_path_score",
      "mean_democratic_aligned_senate_seats", "monte_carlo_standard_error",
    ])),
    writeFile(resolve(options.outputDir, "senate-total-routes.csv"), toCsv(routeRows, [
      "democratic_aligned_senate_seats", "combo_id", "democratic_winners", "republican_winners",
      "democratic_wins_among_six", "simulation_count", "joint_probability", "probability_given_senate_total",
      "probability_senate_total_given_combo", "geography_path_score", "geography_percentile_given_senate_total",
      "route_surprisal_nats", "rarity_percentile_given_senate_total",
    ])),
    writeFile(resolve(options.outputDir, "house-senate-joint-grid.csv"), toCsv(jointRows, [
      "democratic_house_seats", "democratic_aligned_senate_seats", "simulation_count", "probability",
      "overall_dem_to_gop_percentile", "house_vs_senate_tilt_percentile",
    ])),
    writeFile(resolve(options.outputDir, "joint-simulations.csv"), toCsv(simulationRows, [
      "sim_id", "democratic_house_seats", "democratic_aligned_senate_seats", "six_state_combo",
      "democratic_wins_among_six", "overall_dem_score", "overall_dem_to_gop_percentile",
      "house_vs_senate_tilt_score", "house_vs_senate_tilt_percentile", "six_state_geography_continuous_score",
      "six_state_geography_combo_score",
    ])),
    writeFile(resolve(options.outputDir, "metadata.json"), JSON.stringify(metadata, null, 2) + "\n"),
  ]);

  console.log(`Wrote ${comboRows.length} combinations, ${routeRows.length} Senate routes, ` +
    `${jointRows.length} chamber cells, and ${simulationRows.length} aligned simulations to ${options.outputDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

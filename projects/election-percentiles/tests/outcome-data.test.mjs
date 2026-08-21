import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const base = new URL("../data/derived/mac-tan-2026-08-21/", import.meta.url);
const calibrated = new URL("../data/derived/silver-calibrated-mac-tan-2026-08-20/", import.meta.url);

async function csvRows(url) {
  const lines = (await readFile(url, "utf8")).trim().split(/\r?\n/);
  const headers = lines.shift().split(",");
  return lines.map((line) => Object.fromEntries(line.split(",").map((value, index) => [headers[index], value])));
}

function sum(rows, field) {
  return rows.reduce((total, row) => total + Number(row[field]), 0);
}

test("open posterior derivation preserves a complete probability distribution", async () => {
  const combinations = await csvRows(new URL("six-state-combinations.csv", base));
  const chamberCells = await csvRows(new URL("house-senate-joint-grid.csv", base));

  assert.equal(combinations.length, 64);
  assert.ok(Math.abs(sum(combinations, "probability") - 1) < 1e-8);
  assert.ok(Math.abs(sum(chamberCells, "probability") - 1) < 1e-8);
  assert.ok(combinations.every((row) => Number(row.simulation_count) >= 0));
});

test("Silver-calibrated approximation converges without collapsing its support", async () => {
  const metadata = JSON.parse(await readFile(new URL("metadata.json", calibrated), "utf8"));
  const combinations = await csvRows(new URL("six-state-combinations.csv", calibrated));
  const chamberCells = await csvRows(new URL("house-senate-joint-grid.csv", calibrated));
  const routes = (await csvRows(new URL("senate-total-routes.csv", calibrated)))
    .filter((row) => Number(row.democratic_aligned_senate_seats) === 51);

  assert.equal(metadata.status, "Approximation, not Silver Bulletin simulation output");
  assert.ok(metadata.diagnostics.maximum_absolute_constraint_error < 1e-8);
  assert.ok(metadata.diagnostics.effective_sample_size > 3_000);
  assert.ok(metadata.diagnostics.maximum_weight_multiple_of_uniform < 20);
  assert.ok(Math.abs(sum(combinations, "calibrated_probability") - 1) < 1e-6);
  assert.ok(Math.abs(sum(chamberCells, "calibrated_probability") - 1) < 1e-6);
  assert.ok(Math.abs(sum(routes, "calibrated_probability_given_senate_total") - 1) < 1e-6);

  const loadings = Object.values(metadata.dimensions.conventionality.loadings_scaled_to_max_abs_one);
  assert.ok(Math.abs(loadings.reduce((total, value) => total + value, 0)) < 1e-5);
});

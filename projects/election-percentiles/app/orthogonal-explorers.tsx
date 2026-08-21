"use client";

import { useMemo, useState } from "react";
import outcomeData from "./data/orthogonal-outcomes.json";

type SenateTotal = {
  seats: number;
  probability: number;
  mainPercentile: number;
};

type SenateRoute = {
  seats: number;
  combo: string;
  dem: string;
  rep: string;
  count: number;
  probabilityGivenTotal: number;
  conventionalityPercentile: number;
  rarityPercentile: number;
};

type ChamberCell = {
  house: number;
  senate: number;
  count: number;
  probability: number;
  mainPercentile: number;
  tiltPercentile: number;
};

type ExplorerData = {
  updated: string;
  simulations: number;
  effectiveSampleSize: number;
  status: string;
  conventionalityLoadings: Record<string, number>;
  senateTotals: SenateTotal[];
  senateRoutes: SenateRoute[];
  chamberCells: ChamberCell[];
};

const data = outcomeData as ExplorerData;
const percent = new Intl.NumberFormat("en-US", { style: "percent", maximumFractionDigits: 1 });

function partyList(value: string) {
  return value ? value.split(" ").join(" · ") : "none";
}

function routeLane(combo: string) {
  let hash = 0;
  for (const character of combo) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return hash % 7;
}

function RoutePlot({ routes, selected, onSelect }: {
  routes: SenateRoute[];
  selected: SenateRoute;
  onSelect: (combo: string) => void;
}) {
  const left = 72;
  const width = 756;

  return (
    <div className="route-plot-wrap">
      <svg
        className="route-plot"
        viewBox="0 0 900 252"
        role="img"
        aria-label="Senate routes placed from inverted battlefield outcomes to conventional outcomes"
      >
        <line className="plot-axis" x1={left} x2={left + width} y1="194" y2="194" />
        {[0, 25, 50, 75, 100].map((tick) => (
          <g key={tick}>
            <line className="plot-gridline" x1={left + tick * width / 100} x2={left + tick * width / 100} y1="34" y2="194" />
            <text className="plot-tick" x={left + tick * width / 100} y="216" textAnchor="middle">{tick}</text>
          </g>
        ))}
        {routes.map((route) => {
          const radius = 4 + Math.sqrt(route.probabilityGivenTotal) * 28;
          const x = left + route.conventionalityPercentile * width / 100;
          const y = 48 + routeLane(route.combo) * 21;
          const isSelected = route.combo === selected.combo;
          return (
            <circle
              className={`route-dot ${isSelected ? "selected" : ""}`}
              cx={x}
              cy={y}
              r={radius}
              key={route.combo}
              onClick={() => onSelect(route.combo)}
            />
          );
        })}
        <text className="plot-end-label" x={left} y="244" textAnchor="start">Inside-out / upset route</text>
        <text className="plot-end-label" x={left + width} y="244" textAnchor="end">Expected / chalk route</text>
      </svg>
    </div>
  );
}

function SenateRouteExplorer() {
  const [seats, setSeats] = useState(51);
  const [selectedCombo, setSelectedCombo] = useState<string | null>(null);
  const routes = useMemo(
    () => data.senateRoutes
      .filter((route) => route.seats === seats)
      .sort((left, right) => right.probabilityGivenTotal - left.probabilityGivenTotal),
    [seats],
  );
  const selected = routes.find((route) => route.combo === selectedCombo) ?? routes[0];
  const total = data.senateTotals.find((item) => item.seats === seats)!;

  return (
    <section className="orthogonal-panel" aria-labelledby="senate-route-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">A second Senate coordinate</p>
          <h2 id="senate-route-title">Same seat count, different route.</h2>
        </div>
        <p className="source-note">Research approximation<br /><span>August 20, 2026</span></p>
      </div>
      <p className="section-intro">
        Hold the Senate result fixed, then order the six close races from an inside-out battlefield to the model’s expected battlefield. The weights sum to zero, so this coordinate changes the route without changing the number of wins.
      </p>

      <div className="orthogonal-controls">
        <label htmlFor="senate-total-select">Democratic / independent-aligned Senate seats</label>
        <select
          id="senate-total-select"
          value={seats}
          onChange={(event) => {
            setSeats(Number(event.target.value));
            setSelectedCombo(null);
          }}
        >
          {data.senateTotals.map((item) => (
            <option value={item.seats} key={item.seats}>
              {item.seats} seats · {percent.format(item.probability)} of calibrated outcomes
            </option>
          ))}
        </select>
        <p>Main-axis position: <strong>{total.mainPercentile.toFixed(1)}</strong> percentile</p>
      </div>

      <div className="route-readout" aria-live="polite">
        <div>
          <p className="readout-kicker">Selected {seats}-seat route</p>
          <p className="route-result">D wins {partyList(selected.dem)}</p>
          <p>D loses {partyList(selected.rep)}</p>
        </div>
        <div className="route-probability">
          <strong>{percent.format(selected.probabilityGivenTotal)}</strong>
          <span>of modeled {seats}-seat outcomes</span>
        </div>
      </div>

      <RoutePlot routes={routes} selected={selected} onSelect={setSelectedCombo} />

      <div className="route-list" aria-label={`Most common modeled routes to ${seats} seats`}>
        {routes.slice(0, 8).map((route) => (
          <button
            type="button"
            className={route.combo === selected.combo ? "selected" : ""}
            onClick={() => setSelectedCombo(route.combo)}
            key={route.combo}
          >
            <span>D: {partyList(route.dem)}</span>
            <strong>{percent.format(route.probabilityGivenTotal)}</strong>
            {route.count < 20 && <small>thin open-model support</small>}
          </button>
        ))}
      </div>

      <p className="rounding-note">
        Circle area represents conditional probability. “Expected” means wins concentrated in Silver’s more Democratic-favored contests (especially MI and ME); “inside-out” emphasizes harder contests (especially IA and AK). Exact route probabilities are an explicitly labeled calibration, not unpublished Silver simulations.
      </p>
    </section>
  );
}

function ChamberPlanePlot({ cells, selected }: { cells: ChamberCell[]; selected: ChamberCell }) {
  const frame = { x: 74, y: 32, width: 760, height: 390 };

  return (
    <div className="chamber-plane-wrap">
      <svg
        className="chamber-plane"
        viewBox="0 0 900 490"
        role="img"
        aria-label="Joint House and Senate outcomes rotated into overall partisan performance and chamber tilt"
      >
        <rect className="plot-frame" x={frame.x} y={frame.y} width={frame.width} height={frame.height} />
        {[0, 25, 50, 75, 100].map((tick) => {
          const x = frame.x + tick * frame.width / 100;
          const y = frame.y + (100 - tick) * frame.height / 100;
          return (
            <g key={tick}>
              <line className="plot-gridline" x1={x} x2={x} y1={frame.y} y2={frame.y + frame.height} />
              <line className="plot-gridline" x1={frame.x} x2={frame.x + frame.width} y1={y} y2={y} />
              <text className="plot-tick" x={x} y={frame.y + frame.height + 22} textAnchor="middle">{tick}</text>
              <text className="plot-tick" x={frame.x - 13} y={y + 4} textAnchor="end">{tick}</text>
            </g>
          );
        })}
        {cells.filter((cell) => cell.probability >= 0.000025).map((cell) => {
          const x = frame.x + cell.mainPercentile * frame.width / 100;
          const y = frame.y + (100 - cell.tiltPercentile) * frame.height / 100;
          const radius = Math.max(1.4, Math.sqrt(cell.probability) * 92);
          const side = cell.mainPercentile < 38 ? "dem" : cell.mainPercentile > 62 ? "gop" : "split";
          const isSelected = cell.house === selected.house && cell.senate === selected.senate;
          return (
            <circle
              className={`chamber-dot ${side} ${isSelected ? "selected" : ""}`}
              cx={x}
              cy={y}
              r={radius}
              key={`${cell.house}-${cell.senate}`}
            />
          );
        })}
        <text className="plot-axis-title" x={frame.x + frame.width / 2} y="481" textAnchor="middle">Overall Democratic → Republican outcome percentile</text>
        <text className="plot-axis-title vertical" x="17" y={frame.y + frame.height / 2} textAnchor="middle">Senate-heavy → House-heavy</text>
      </svg>
    </div>
  );
}

function HouseSenateExplorer() {
  const [mainPercentile, setMainPercentile] = useState(50);
  const [tiltPercentile, setTiltPercentile] = useState(50);
  const selected = useMemo(() => data.chamberCells.reduce((closest, cell) => {
    const distance = (cell.mainPercentile - mainPercentile) ** 2 + (cell.tiltPercentile - tiltPercentile) ** 2;
    const closestDistance = (closest.mainPercentile - mainPercentile) ** 2 + (closest.tiltPercentile - tiltPercentile) ** 2;
    return distance < closestDistance ? cell : closest;
  }), [mainPercentile, tiltPercentile]);

  return (
    <section className="orthogonal-panel" aria-labelledby="chamber-plane-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">The joint chamber plane</p>
          <h2 id="chamber-plane-title">Overall result, plus chamber tilt.</h2>
        </div>
        <p className="source-note">10,000 aligned draws<br /><span>Calibrated ESS {Math.round(data.effectiveSampleSize).toLocaleString()}</span></p>
      </div>
      <p className="section-intro">
        Standardize the two seat totals and rotate the plane 45 degrees. Left-to-right still means better for Democrats to better for Republicans; bottom-to-top asks whether that result came more through the Senate or the House.
      </p>

      <div className="plane-controls">
        <label htmlFor="overall-plane-control">
          <span>Overall D → R percentile</span>
          <output htmlFor="overall-plane-control">{mainPercentile}</output>
        </label>
        <input
          id="overall-plane-control"
          type="range"
          min="0"
          max="100"
          value={mainPercentile}
          onChange={(event) => setMainPercentile(Number(event.target.value))}
        />
        <label htmlFor="tilt-plane-control">
          <span>Senate-heavy → House-heavy</span>
          <output htmlFor="tilt-plane-control">{tiltPercentile}</output>
        </label>
        <input
          id="tilt-plane-control"
          type="range"
          min="0"
          max="100"
          value={tiltPercentile}
          onChange={(event) => setTiltPercentile(Number(event.target.value))}
        />
      </div>

      <div className="plane-readout" aria-live="polite">
        <p><strong>{selected.house}</strong> Democratic House seats</p>
        <span>+</span>
        <p><strong>{selected.senate}</strong> Democratic / independent-aligned Senate seats</p>
        <small>{percent.format(selected.probability)} of calibrated draws land on this exact cell</small>
      </div>

      <ChamberPlanePlot cells={data.chamberCells} selected={selected} />
      <p className="rounding-note">
        Dot area represents joint probability. The common simulation ID is what makes this a real two-chamber surface; pairing separate marginal percentiles cannot do that. Cells below 0.0025% are hidden visually but remain in the data.
      </p>
    </section>
  );
}

export default function OrthogonalExplorers() {
  return (
    <div className="orthogonal-explorers">
      <div className="orthogonal-intro">
        <p className="intro-kicker">Beyond the single line</p>
        <h2>The outcome tells you how well. The second coordinate tells you how.</h2>
        <p>
          These are research prototypes built from <a href="https://github.com/thisismactan/US-2026">Mac Tan’s open, aligned 2026 posterior draws</a> and calibrated to <a href="https://www.natesilver.net/p/nate-silver-2026-midterm-election-polls-model">Silver Bulletin’s published Deluxe marginals</a>. They preserve the original 0–100 idea while making the hidden composition of an outcome visible.
        </p>
      </div>
      <SenateRouteExplorer />
      <HouseSenateExplorer />
    </div>
  );
}

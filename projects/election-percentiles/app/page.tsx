"use client";

import { useState } from "react";
import OrthogonalExplorers from "./orthogonal-explorers";

type OutcomeSide = "dem" | "split" | "gop";

type Band = {
  label: string;
  shortLabel: string;
  start: number;
  end: number;
  side: OutcomeSide;
  color: string;
  detail?: string;
};

type LineDefinition = {
  id: string;
  eyebrow: string;
  title: string;
  intro: string;
  bands: Band[];
  bracketWidth: number;
  bracketLabel: string;
  note: string;
  verticalLabels?: boolean;
};

// Whole-percent widths derived from the displayed Silver Bulletin Deluxe
// distribution. Tiny tails are grouped so every outcome remains legible.
const senateBands: Band[] = [
  { label: "55 or more Democratic Senate seats", shortLabel: "55+", start: 0, end: 8, side: "dem", color: "#123b80" },
  { label: "54 Democratic Senate seats", shortLabel: "54", start: 8, end: 16, side: "dem", color: "#174898" },
  { label: "53 Democratic Senate seats", shortLabel: "53", start: 16, end: 28, side: "dem", color: "#2059b7" },
  { label: "52 Democratic Senate seats", shortLabel: "52", start: 28, end: 42, side: "dem", color: "#2d69ce" },
  { label: "51 Democratic Senate seats", shortLabel: "51", start: 42, end: 57, side: "dem", color: "#7399db" },
  { label: "50 Democratic Senate seats", shortLabel: "50", start: 57, end: 70, side: "gop", color: "#e28a83" },
  { label: "49 Democratic Senate seats", shortLabel: "49", start: 70, end: 81, side: "gop", color: "#dd6c64" },
  { label: "48 Democratic Senate seats", shortLabel: "48", start: 81, end: 89, side: "gop", color: "#d3514c" },
  { label: "47 Democratic Senate seats", shortLabel: "47", start: 89, end: 94, side: "gop", color: "#be3738" },
  { label: "46 or fewer Democratic Senate seats", shortLabel: "≤46", start: 94, end: 100, side: "gop", color: "#8f1f2b" },
];

const houseBands: Band[] = [
  { label: "250 or more Democratic House seats", shortLabel: "250+", start: 0, end: 11, side: "dem", color: "#123b80" },
  { label: "240–249 Democratic House seats", shortLabel: "240–249", start: 11, end: 27, side: "dem", color: "#1c4b99" },
  { label: "230–239 Democratic House seats", shortLabel: "230–239", start: 27, end: 53, side: "dem", color: "#2d66c5" },
  { label: "218–229 Democratic House seats", shortLabel: "218–229", start: 53, end: 84, side: "dem", color: "#7599d8" },
  { label: "210–217 Democratic House seats", shortLabel: "210–217", start: 84, end: 95, side: "gop", color: "#e2867f" },
  { label: "209 or fewer Democratic House seats", shortLabel: "≤209", start: 95, end: 100, side: "gop", color: "#a92632" },
];

const congressBands: Band[] = [
  {
    label: "Democratic sweep",
    shortLabel: "D sweep",
    start: 0,
    end: 56,
    side: "dem",
    color: "#285fb5",
    detail: "Democrats control the House and Senate",
  },
  {
    label: "Divided Congress",
    shortLabel: "Divided",
    start: 56,
    end: 84,
    side: "split",
    color: "#8d7b91",
    detail: "Democratic House · Republican Senate",
  },
  {
    label: "Republican sweep",
    shortLabel: "R sweep",
    start: 84,
    end: 100,
    side: "gop",
    color: "#b7353c",
    detail: "Republicans control the House and Senate",
  },
];

const lines: LineDefinition[] = [
  {
    id: "senate",
    eyebrow: "Senate seats",
    title: "How many Senate seats do Democrats win?",
    intro: "Exact seat outcomes across the model’s 40,000 simulations, with only the low-probability tails grouped together.",
    bands: senateBands,
    bracketWidth: 57,
    bracketLabel: "57% Democratic Senate control",
    note: "Rounded to whole percentile points from the Deluxe histogram. The source topline is 56.8% Democratic control.",
    verticalLabels: true,
  },
  {
    id: "house",
    eyebrow: "House seats",
    title: "How many House seats do Democrats win?",
    intro: "The same idea, with individual seat counts collected into six readable ranges.",
    bands: houseBands,
    bracketWidth: 84,
    bracketLabel: "84% Democratic House control",
    note: "Grouped from the Deluxe seat histogram and rounded to whole percentile points. The source topline is 84.0% Democratic control.",
    verticalLabels: true,
  },
  {
    id: "congress",
    eyebrow: "Control of Congress",
    title: "Who controls the two chambers?",
    intro: "The joint forecast reduced to the three outcomes that fit naturally on a Democratic-to-Republican line.",
    bands: congressBands,
    bracketWidth: 56,
    bracketLabel: "56% Democratic sweep",
    note: "Rounded from 56.2%, 27.8%, and 15.4%. The 0.6% Republican House + Democratic Senate outcome is deliberately omitted.",
  },
];

const findBand = (bands: Band[], percentile: number) =>
  bands.find((band) => percentile >= band.start && percentile < band.end) ?? bands.at(-1)!;

function DirectionLabels() {
  return (
    <div className="direction-labels" aria-hidden="true">
      <span><i className="arrow left" /> Better for Democrats</span>
      <span>Better for Republicans <i className="arrow right" /></span>
    </div>
  );
}

function OutcomeReadout({ percentile, selected }: { percentile: number; selected: Band }) {
  const width = selected.end - selected.start;

  return (
    <div className="outcome-readout" aria-live="polite">
      <div className={`percentile-disc ${selected.side}`}>
        <span>{percentile}</span>
        <small>percentile</small>
      </div>
      <div className="readout-copy">
        <p className="readout-kicker">This point lands on</p>
        <p className="readout-outcome">{selected.label}</p>
        <p className="readout-detail">
          {selected.detail && <>{selected.detail} · </>}
          About <strong>{width}%</strong> of modeled outcomes
        </p>
      </div>
    </div>
  );
}

function PercentileAxis({
  bands,
  percentile,
  bracketWidth,
  bracketLabel,
  verticalLabels = false,
}: {
  bands: Band[];
  percentile: number;
  bracketWidth: number;
  bracketLabel: string;
  verticalLabels?: boolean;
}) {
  return (
    <div className="percentile-wrap">
      <div className="boundary-labels" aria-hidden="true">
        {bands.slice(0, -1).map((band) => (
          <span key={band.end} style={{ left: `${band.end}%` }}>{band.end}</span>
        ))}
      </div>

      <div className={`outcome-bands ${verticalLabels ? "vertical-labels" : ""}`} aria-hidden="true">
        {bands.map((band) => (
          <div
            className={`outcome-band ${band.side}`}
            key={band.label}
            style={{ width: `${band.end - band.start}%`, background: band.color }}
          >
            <span>{band.shortLabel}</span>
          </div>
        ))}
      </div>

      <div className="control-bracket" style={{ width: `${bracketWidth}%` }} aria-hidden="true">
        <span>{bracketLabel}</span>
      </div>

      <div className="percentile-marker" style={{ left: `${percentile}%` }} aria-hidden="true" />

      <div className="axis-ticks" aria-hidden="true">
        {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((tick) => <span key={tick}>{tick}</span>)}
      </div>
    </div>
  );
}

function OutcomeLine({ definition, percentile }: { definition: LineDefinition; percentile: number }) {
  const selected = findBand(definition.bands, percentile);

  return (
    <section className="outcome-section" id={definition.id} aria-labelledby={`${definition.id}-title`}>
      <div className="section-heading">
        <div>
          <p className="eyebrow">{definition.eyebrow}</p>
          <h2 id={`${definition.id}-title`}>{definition.title}</h2>
        </div>
        <p className="source-note">Silver Bulletin Deluxe<br /><span>August 20, 2026</span></p>
      </div>

      <p className="section-intro">{definition.intro}</p>
      <OutcomeReadout percentile={percentile} selected={selected} />
      <DirectionLabels />
      <PercentileAxis
        bands={definition.bands}
        percentile={percentile}
        bracketWidth={definition.bracketWidth}
        bracketLabel={definition.bracketLabel}
        verticalLabels={definition.verticalLabels}
      />
      <p className="rounding-note">{definition.note}</p>
    </section>
  );
}

function GlobalPercentileControl({ percentile, onChange }: { percentile: number; onChange: (value: number) => void }) {
  return (
    <div className="global-control">
      <div className="global-control-heading">
        <label htmlFor="shared-percentile">One point, three outcomes</label>
        <output htmlFor="shared-percentile"><strong>{percentile}</strong> percentile</output>
      </div>
      <div className="global-slider-labels" aria-hidden="true">
        <span>0 · Better for Democrats</span>
        <span>Better for Republicans · 100</span>
      </div>
      <input
        id="shared-percentile"
        className="global-percentile-input"
        type="range"
        min="0"
        max="100"
        step="1"
        value={percentile}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-label={`Shared election percentile: ${percentile}`}
      />
    </div>
  );
}

export default function Home() {
  const [percentile, setPercentile] = useState(50);

  return (
    <main className="page-shell">
      <header className="site-header">
        <a className="wordmark" href="#top" aria-label="Possible Futures home">
          <span className="wordmark-mark">PF</span>
          <span>Possible Futures</span>
        </a>
        <p>2026 congressional forecast</p>
      </header>

      <div className="page-intro" id="top">
        <p className="intro-kicker">One hundred equally likely points</p>
        <h1>Three ways to walk through the election forecast.</h1>
        <p className="intro-copy">Every point on each line is equally likely. The width of each band is the chance of that outcome. The shared slider aligns marginal percentiles; the joint views below show which outcomes actually travel together.</p>
        <GlobalPercentileControl percentile={percentile} onChange={setPercentile} />
      </div>

      {lines.map((definition) => <OutcomeLine definition={definition} percentile={percentile} key={definition.id} />)}

      <OrthogonalExplorers />

      <footer className="site-footer">
        <span>Possible Futures</span>
        <p>Silver Bulletin FLIPR Deluxe · 40,000 simulations · updated August 20, 2026</p>
      </footer>
    </main>
  );
}

"use client";

import { useMemo, useState } from "react";

type Party = "dem" | "gop";
type Band = { label: string; shortLabel: string; start: number; end: number; party: Party };
type Race = { state: string; demProbability: number; note: string };

const senateBands: Band[] = [
  { label: "55 or more Democratic seats", shortLabel: "55+", start: 0, end: 6, party: "dem" },
  { label: "54 Democratic seats", shortLabel: "54", start: 6, end: 15, party: "dem" },
  { label: "53 Democratic seats", shortLabel: "53", start: 15, end: 28, party: "dem" },
  { label: "52 Democratic seats", shortLabel: "52", start: 28, end: 40, party: "dem" },
  { label: "51 Democratic seats", shortLabel: "51", start: 40, end: 54, party: "dem" },
  { label: "50 Democratic seats", shortLabel: "50", start: 54, end: 68, party: "gop" },
  { label: "49 Democratic seats", shortLabel: "49", start: 68, end: 81, party: "gop" },
  { label: "48 Democratic seats", shortLabel: "48", start: 81, end: 90, party: "gop" },
  { label: "47 or fewer Democratic seats", shortLabel: "≤47", start: 90, end: 100, party: "gop" },
];

const congressBands: Band[] = [
  { label: "Democrats control both chambers", shortLabel: "D BOTH", start: 0, end: 54, party: "dem" },
  { label: "Democratic House · Republican Senate", shortLabel: "D HOUSE", start: 54, end: 85, party: "dem" },
  { label: "Republicans control both chambers", shortLabel: "R BOTH", start: 85, end: 100, party: "gop" },
];

const races: Race[] = [
  { state: "IA", demProbability: 44, note: "Iowa" },
  { state: "TX", demProbability: 38, note: "Texas" },
  { state: "OH", demProbability: 49, note: "Ohio" },
  { state: "AK", demProbability: 34, note: "Alaska" },
  { state: "MI", demProbability: 64, note: "Michigan" },
  { state: "ME", demProbability: 58, note: "Maine" },
];

const findBand = (bands: Band[], percentile: number) =>
  bands.find((band) => percentile >= band.start && percentile < band.end) ?? bands.at(-1)!;

function PercentileAxis({
  bands,
  percentile,
  onChange,
  bracket,
  ariaLabel,
}: {
  bands: Band[];
  percentile: number;
  onChange: (value: number) => void;
  bracket?: { width: number; label: string };
  ariaLabel: string;
}) {
  return (
    <div className="percentile-wrap">
      <div className="seat-bands" aria-hidden="true">
        {bands.map((band, index) => (
          <div
            className={`seat-band ${band.party} shade-${Math.min(index, 8)}`}
            key={band.label}
            style={{ width: `${band.end - band.start}%` }}
          >
            <span>{band.shortLabel}</span>
          </div>
        ))}
      </div>
      {bracket && (
        <div className="control-bracket" style={{ width: `${bracket.width}%` }} aria-hidden="true">
          <span>{bracket.label}</span>
        </div>
      )}
      <input
        className="percentile-input"
        type="range"
        min="0"
        max="100"
        step="1"
        value={percentile}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-label={ariaLabel}
      />
      <div className="axis-ticks" aria-hidden="true">
        {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((tick) => <span key={tick}>{tick}</span>)}
      </div>
    </div>
  );
}

function OutcomeReadout({ percentile, selected }: { percentile: number; selected: Band }) {
  return (
    <div className="outcome-readout" aria-live="polite">
      <div className={`percentile-disc ${selected.party}`}>
        <span>{percentile}</span>
        <small>percentile</small>
      </div>
      <div>
        <p className="readout-kicker">This point lands on</p>
        <p className="readout-outcome">{selected.label}</p>
        <p className="readout-detail">
          A <strong>{selected.end - selected.start}%</strong> slice of the simplified outcome space
        </p>
      </div>
    </div>
  );
}

function SenateLine() {
  const [percentile, setPercentile] = useState(37);
  const selected = findBand(senateBands, percentile);

  return (
    <section className="panel senate-section" id="senate" aria-labelledby="senate-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">01 · The original idea</p>
          <h2 id="senate-title">The Senate, on one line</h2>
        </div>
        <DataNote />
      </div>
      <p className="section-intro">
        Every point is equally likely. The width of each band is the chance of that exact seat count.
        Drag the marker to sample a possible election night.
      </p>
      <OutcomeReadout percentile={percentile} selected={selected} />
      <DirectionLabels />
      <PercentileAxis
        bands={senateBands}
        percentile={percentile}
        onChange={setPercentile}
        bracket={{ width: 54, label: "54% Democratic control" }}
        ariaLabel={`Senate percentile ${percentile}: ${selected.label}`}
      />
      <div className="threshold-cards">
        <article><span className="threshold-number">54%</span><p>chance of <strong>51+</strong> seats</p></article>
        <article><span className="threshold-number">40%</span><p>chance of <strong>52+</strong> seats</p></article>
        <article><span className="threshold-number">28%</span><p>chance of <strong>53+</strong> seats</p></article>
        <div className="difference-note"><span className="formula">40 − 28 = 12</span><p>Exactly 52 seats occupies the 12-point interval from 28 to 40.</p></div>
      </div>
    </section>
  );
}

function CongressLine() {
  const [percentile, setPercentile] = useState(67);
  const selected = findBand(congressBands, percentile);

  return (
    <section className="panel control-section" id="control" aria-labelledby="control-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">02 · Zooming out</p>
          <h2 id="control-title">Control of Congress</h2>
        </div>
        <DataNote label="Simplified 1D model" />
      </div>
      <p className="section-intro">
        Three outcomes fall naturally from left to right. This view assumes a Democratic Senate comes
        with a Democratic House, intentionally setting aside the rare cross-over case.
      </p>
      <OutcomeReadout percentile={percentile} selected={selected} />
      <DirectionLabels />
      <PercentileAxis
        bands={congressBands}
        percentile={percentile}
        onChange={setPercentile}
        ariaLabel={`Congress percentile ${percentile}: ${selected.label}`}
      />
      <div className="omitted-note">
        <span className="omitted-symbol">∅</span>
        <div><strong>Deliberate simplification</strong><p>Democratic Senate + Republican House is omitted because it does not fit the partisan line and is assumed to be below 3%.</p></div>
      </div>
    </section>
  );
}

function DirectionLabels() {
  return (
    <div className="line-labels" aria-hidden="true">
      <span><i className="arrow left" /> Better for Democrats</span>
      <span>Better for Republicans <i className="arrow right" /></span>
    </div>
  );
}

function DataNote({ label = "Illustrative probabilities" }: { label?: string }) {
  return <div className="data-note"><span className="status-dot" /> {label}</div>;
}

function JointSpace() {
  const [correlation, setCorrelation] = useState(72);
  const cells = useMemo(() => {
    return Array.from({ length: 100 }, (_, index) => {
      const x = index % 10;
      const y = Math.floor(index / 10);
      const diagonalDistance = Math.abs(x - y);
      const centerDistance = Math.abs(x - 4.5) + Math.abs(y - 4.5);
      const diagonal = Math.exp(-diagonalDistance * (0.17 + correlation / 170));
      const center = Math.max(0.28, 1 - centerDistance / 15);
      return Math.min(1, 0.06 + diagonal * center);
    });
  }, [correlation]);

  return (
    <section className="joint-section" id="joint" aria-labelledby="joint-title">
      <div className="joint-copy">
        <p className="eyebrow">03 · The two-dimensional bridge</p>
        <h2 id="joint-title">A square, pulled toward the diagonal</h2>
        <p>
          If House and Senate outcomes were independent, probability could spread across the full square.
          Correlation concentrates the plausible worlds into a diagonal band—but does not collapse them to a line.
        </p>
        <label className="correlation-control">
          <span><strong>Chamber correlation</strong><b>{correlation}%</b></span>
          <input type="range" min="0" max="100" value={correlation} onChange={(event) => setCorrelation(Number(event.target.value))} />
        </label>
        <div className="joint-legend"><i /> More joint probability <span /> Less joint probability</div>
      </div>
      <div className="matrix-shell">
        <div className="matrix-y"><span>House → D</span><span>House → R</span></div>
        <div className="joint-matrix" aria-label={`Conceptual House and Senate outcome field with ${correlation}% correlation`}>
          {cells.map((opacity, index) => <span key={index} style={{ opacity }} />)}
        </div>
        <div className="matrix-x"><span>Senate → D</span><span>Senate → R</span></div>
        <p>Concept sketch · not estimated data</p>
      </div>
    </section>
  );
}

function hash(seed: number) {
  const value = Math.sin(seed * 91.717 + 17.13) * 43758.5453;
  return value - Math.floor(value);
}

function modelWorld(row: number, column: number) {
  const national = (4.5 - column) / 1.65;
  const wins = races.map((race, raceIndex) => {
    const base = Math.log(race.demProbability / (100 - race.demProbability));
    const stateNoise = ([1, 2, 3, 4].reduce((sum, offset) => sum + hash((row + 1) * 47 + column * 13 + raceIndex * 101 + offset), 0) - 2) * 1.2;
    return base + national * 0.78 + stateNoise > 0;
  });
  return { row, column, wins, demWins: wins.filter(Boolean).length };
}

const worlds = Array.from({ length: 100 }, (_, index) => modelWorld(Math.floor(index / 10), index % 10));

function RaceDimensions() {
  const [selectedIndex, setSelectedIndex] = useState(46);
  const selected = worlds[selectedIndex];
  const unusualIndex = worlds.findIndex((world) => world.wins[0] && !world.wins[5]);
  const unusualCount = worlds.filter((world) => world.wins[0] && !world.wins[5]).length;

  return (
    <section className="race-section" id="races" aria-labelledby="races-title">
      <div className="race-heading">
        <div>
          <p className="eyebrow">04 · Six races, sixty-four combinations</p>
          <h2 id="races-title">A line is no longer enough.</h2>
        </div>
        <DataNote label="Illustrative latent model" />
      </div>
      <p className="race-intro">
        Iowa, Texas, Ohio, Alaska, Michigan, and Maine move together with the national environment—but not
        in lockstep. Compressing all six contests to one line quietly assumes perfect correlation.
      </p>

      <div className="naive-card">
        <div className="naive-copy">
          <span className="method-tag">The naive line</span>
          <h3>Six marginal probabilities. Only seven possible coalitions.</h3>
          <p>Placing each race at its own win probability forces every contest into one fixed order. Fifty-seven of the 64 possible combinations disappear.</p>
        </div>
        <div className="race-thresholds" aria-label="Illustrative Democratic win probabilities for six Senate races">
          {races.map((race) => (
            <div className="race-threshold" key={race.state}>
              <span>{race.state}</span>
              <div><i style={{ width: `${race.demProbability}%` }} /><b style={{ left: `${race.demProbability}%` }}>{race.demProbability}</b></div>
            </div>
          ))}
          <div className="threshold-direction"><span>← D-favorable worlds</span><span>R-favorable worlds →</span></div>
        </div>
      </div>

      <div className="worlds-card">
        <div className="worlds-copy">
          <span className="method-tag light">One possible compression</span>
          <h3>100 equally weighted model worlds</h3>
          <p>Left to right is the shared national environment. Up and down cycles through race-specific surprise configurations—a space-filling fold of the remaining dimensions.</p>
          <div className="selected-world" aria-live="polite">
            <span>Selected world <strong>{selectedIndex + 1}</strong></span>
            <b>{selected.demWins} of 6 Democratic wins</b>
            <div className="winner-chips">
              {races.map((race, raceIndex) => (
                <span className={selected.wins[raceIndex] ? "dem" : "gop"} key={race.state}>
                  {race.state} <i>{selected.wins[raceIndex] ? "D" : "R"}</i>
                </span>
              ))}
            </div>
          </div>
          <button className="split-example" type="button" disabled={unusualIndex < 0} onClick={() => unusualIndex >= 0 && setSelectedIndex(unusualIndex)}>
            Find IA–D + ME–R <span>{unusualCount}% in this toy model →</span>
          </button>
        </div>
        <div className="world-field-wrap">
          <div className="field-y"><span>More unusual</span><span>surprise patterns</span></div>
          <div className="world-field" aria-label="100 equally weighted correlated election simulations">
            {worlds.map((world, index) => (
              <button
                type="button"
                key={index}
                className={`world-cell wins-${world.demWins} ${selectedIndex === index ? "selected" : ""}`}
                aria-label={`World ${index + 1}: Democrats win ${world.demWins} of six races`}
                aria-pressed={selectedIndex === index}
                onMouseEnter={() => setSelectedIndex(index)}
                onFocus={() => setSelectedIndex(index)}
                onClick={() => setSelectedIndex(index)}
              ><span>{world.demWins}</span></button>
            ))}
          </div>
          <div className="field-x"><span>Better national environment for D</span><span>Better for R</span></div>
          <div className="field-key"><span>Cell color = Democratic wins among six</span><b>6</b><i /><i /><i /><i /><i /><i /><b>0</b></div>
        </div>
      </div>

      <div className="model-note">
        <strong>What real data unlocks</strong>
        <p>Nate Silver’s simulations could replace this toy latent model directly. Each simulation row becomes one equally weighted world, preserving state correlations and rare combinations without inventing independence.</p>
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <main>
      <header className="site-header">
        <a className="wordmark" href="#top" aria-label="Possible Futures home"><span className="wordmark-mark">PF</span><span>Possible Futures</span></a>
        <nav aria-label="Page sections"><a href="#senate">Senate</a><a href="#control">Congress</a><a href="#joint">2D</a><a href="#races">Six races</a></nav>
        <p>2026 outcome explorer</p>
      </header>

      <div id="top" className="hero">
        <p className="hero-kicker">One hundred equally likely points</p>
        <h1>An election forecast you can <em>walk through.</em></h1>
        <p className="hero-copy">Instead of a single number, see the full range of possible outcomes—from the bluest plausible night to the reddest—and how much probability lives in between.</p>
        <a className="start-link" href="#senate">Start with the Senate <span>↓</span></a>
      </div>

      <SenateLine />
      <CongressLine />
      <JointSpace />
      <RaceDimensions />

      <footer className="site-footer"><span>Possible Futures</span><p>Prototype · All probabilities are illustrative, not a current forecast.</p></footer>
    </main>
  );
}

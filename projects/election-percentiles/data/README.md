# Silver Bulletin FLIPR snapshot

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

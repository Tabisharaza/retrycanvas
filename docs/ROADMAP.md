# Small, reviewable next steps

These are contribution proposals, not assigned work or promised release dates.
The histogram-table work is tracked in [issue #1](https://github.com/Tabisharaza/retrycanvas/issues/1).
Check the current source and open discussions before starting; keep the first PR focused.

## 1. Accessible histogram data table

**Why:** SVG descriptions provide a summary, but a reader cannot inspect an
individual bucket's count without using the CSV and doing the aggregation.

**Scope:** Add an optional, semantic table of histogram buckets for the currently
displayed comparison. Include start time, exclusive end time, and the three
strategy counts. Keep the chart layout intact when the table is collapsed.

**Acceptance checks:**

- The table uses a caption and column headers that identify units and strategies.
- Its bucket counts match the engine exactly, including a retry on the horizon.
- Opening and closing it works with the keyboard and communicates expanded state.
- Up to 2,000 bins do not make the page unusable; choose and document a bounded
  presentation such as accessible pagination.
- Invalid or unapplied inputs do not change the table's displayed scenario.

**Starting points:** `src/Charts.tsx`, `src/App.tsx`, `src/engine.ts`.

## 2. Deterministic decorrelated jitter

**Why:** A stateful delay strategy is a useful next comparison and a good way to
learn the difference between a retry window and the previous actual delay.

**Scope:** First agree on a precise recurrence and its initialization. One common
candidate samples between `base` and `3 × previousDelay`, then caps the result.
Specify behavior when `cap < base`; do not silently reuse assumptions from the
current stateless formulas. Preserve the existing three strategies' outputs.

**Acceptance checks:**

- The recurrence, first delay, cap behavior, and retry indexing are documented.
- Each client has its own previous-delay state.
- Keyed samples are deterministic and strategy evaluation order is irrelevant.
- Tests cover the recurrence, bounds, cap/base edge cases, event counts, and
  unchanged existing strategies.
- Charts, shared scales, labels, export identifiers, and CSV row-count tests
  include the added strategy without implying measured recovery benefits.

**Starting points:** `src/engine.ts`, `src/Charts.tsx`, `docs/MODEL.md`.
This is a larger change than the data-table proposal; open a short design
conversation before implementing it.

## Deliberately outside the current scope

Real endpoint probing, production retry recommendations, billing, accounts,
trace ingestion, and recovery/throughput claims all need a different product or
model design. Keep them out of a small visualization PR. Future commercial ideas
are recorded as hypotheses in [Product notes](PRODUCT_NOTES.md).

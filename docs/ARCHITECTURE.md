# Architecture

A static React + TypeScript app built with Vite. The scheduling model has no
React, browser, wall-clock, or network dependency.

## The short tour

```text
Scenario form (editable strings)
    ↓ validate on Run comparison
Validated Config snapshot
    ↓ simulate(config)
Three StrategyResults on one shared horizon
    ├─ Timeline: first 40 clients
    ├─ Histograms and summaries: all clients
    └─ CSV: regenerate from the displayed Config
```

| Location | Responsibility |
| --- | --- |
| `src/engine.ts` | Types, limits, validation, deterministic sampling, delay schedules, binning, metrics, CSV serialization |
| `src/Charts.tsx` | SVG timeline and histograms, strategy labels/colors, display-only time formatting |
| `src/App.tsx` | Form state, last valid simulation, validation feedback, reset, CSV download, explanatory copy |
| `src/main.tsx` | React entry point |
| `src/style.css` | Responsive layout, typography, focus states, and colors |
| `src/engine.test.ts` | Deterministic model, validation, binning, and export tests |
| `src/App.test.tsx` | DOM-based form, status, and interaction tests |
| `tests/app.spec.ts` | Browser interaction and responsive-layout checks |
| `playwright.config.ts` | Desktop/mobile Chromium projects and local test server |
| `.github/workflows/ci.yml` | Dependency install, checks, browser tests, and test-report artifacts |
| `vite.config.ts` | React/Vite setup, `/retrycanvas/` base path, unit-test discovery |
| `docs/MODEL.md` | Human-readable specification and interpretation limits |

## Model boundary

`simulate(config)` validates inputs and returns a snapshot of the configuration,
a common no-jitter horizon, and results for all three strategies.
`simulateStrategy(config, strategy)` supports checking one strategy independently.
Invalid configurations fail before large arrays are allocated.

Each event contains a strategy ID, one-based client ID, zero-based retry index,
individual delay, and cumulative timestamp. Initial attempts exist as an
assumption at time zero and are deliberately absent from the event arrays.

The hash-based sampler is indexed by seed, client, and retry. It does not depend
on execution order or a shared mutable random stream. Full and equal jitter
therefore receive paired samples even when evaluated separately.

For `N` clients and `R` retries, there are `3 × N × R` stored retry events.
The input bounds limit this to 18,000 events across all strategies and at most
2,000 bins per strategy. The timeline samples the first 40 clients for legibility;
it does not sample the metric or export calculations.

## State and repeated actions

Form values remain strings until the user runs a comparison. This allows an
empty or invalid input to be displayed without corrupting the current result.
Successful validation replaces the entire simulation. Failed validation keeps
the last valid result and focuses the first invalid field.

Changing an input alone does not change the chart or exported data. The interface
shows that inputs have changed. Reset replaces both the inputs and the result
with the defaults and clears validation feedback. There is no save/load layer.

## Rendering and accessibility

The charts use SVG paths rather than a charting-library dependency. Time and
count axes are shared across strategies to preserve visual comparability.
Display formatting is kept separate from raw numeric calculations and CSV.

The UI includes labeled numeric inputs, connected hints and error text, a skip
link, a live status message, and SVG titles/descriptions. These are implemented
accessibility features, not a claim of conformance or a completed assistive-
technology audit. A tabular histogram is a proposed improvement in the
[roadmap](ROADMAP.md).

## Export boundary

`toCsv(config)` regenerates the deterministic simulation from validated config.
The UI supplies the displayed configuration and downloads a Blob through a
temporary object URL. It revokes that URL afterward. The serializer currently
emits controlled strategy labels and numeric cells; it does not accept arbitrary
CSV text fields.

See [the CSV contract](MODEL.md#csv-contract) for row order and columns. If
metadata or text fields are added later, update the schema, tests, documentation,
and spreadsheet-formula-injection review together.

## Runtime and hosting

There is no application server, remote API, database, telemetry SDK, or bundled
external font. A static host serves the build artifacts; the model then runs
inside the page. Clicking an external reference link is an ordinary navigation.
The local development server may have its own development connections.

Vite's base is `/retrycanvas/`. If deploying under another path, change the base
and verify asset loading there. `npm run build` generates the static output;
`npm run preview` is a local inspection tool. This repository does not itself
establish a public deployment or a hosted service.

## Extension rules of thumb

1. Put scheduling behavior in the engine, not the rendering components.
2. State the invariant and add a deterministic test before changing a formula.
3. Keep strategies on comparable axes and disclose any sampling.
4. Preserve the distinction between retry count, wait, timestamp, and outcome.
5. Call out new network or persistence behavior before introducing it.

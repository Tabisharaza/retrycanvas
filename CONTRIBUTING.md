# Contributing to RetryCanvas

Thanks for taking a look. A useful contribution can be a clearer explanation,
a reproducible bug, a keyboard-accessibility fix, or a small tested feature.
You do not need to add a new strategy to make the project better.

## Start here

1. Read the [model](docs/MODEL.md), especially its fixed event budget and limits.
2. Check the current source and existing discussions before starting a larger
   change. The [roadmap](docs/ROADMAP.md) contains proposals, not assigned issues.
3. Keep your first change small enough that its behavior and tests are easy to
   review. Explain assumptions, and keep reviews respectful and specific.

## Local setup

Use Node.js 24 and npm. `.nvmrc` contains the supported major version; use your
preferred version manager if you have one. From the repository root:

```sh
npm ci
npm run dev
```

Follow Vite's printed local URL, including the `/retrycanvas/` base path. No
credentials, environment secrets, or backend setup are required.

## Checks before a pull request

```sh
npm run lint
npm run typecheck
npm test
npm run build
```

Or run all four in sequence:

```sh
npm run check
```

For an interactive unit-test session, use `npx vitest`. For a production
build smoke check, run `npm run preview` after building and open its printed URL.

Browser tests have a separate command:

```sh
npx playwright install chromium
npm run test:e2e
```

The first command downloads the Chromium browser used by Playwright. It may need
network access and operating-system browser dependencies. Do not claim browser
tests passed when installation or launch was blocked; report the exact blocker.
Unit and DOM tests do not establish real-browser rendering or accessibility
conformance. The browser suite is separate from `npm run check`. Its configuration starts a
local Vite server and covers desktop Chromium and a mobile Chromium viewport.
An existing compatible Chromium can be selected with
`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`; that path is machine-specific and is not
required for the usual Playwright-managed browser setup.

## Contribution map

| If you want to improve… | Start with… | Preserve or verify… |
| --- | --- | --- |
| Formulas, sampling, validation | `src/engine.ts` | Determinism, bounds, retry indexing, fixed event count |
| CSV output | `toCsv` in `src/engine.ts` | Numeric precision, columns, row order, displayed-scenario behavior |
| Chart clarity | `src/Charts.tsx` | Shared axes, units, sampling labels, SVG descriptions |
| Inputs and interaction | `src/App.tsx` | Keyboard use, error focus, reset, unapplied-input state |
| Explanations | `README.md`, `docs/MODEL.md` | A visible distinction between timing and successful outcomes |
| A focused new feature | `docs/ROADMAP.md` | Explicit scope and a checkable acceptance test |

## Model changes need evidence

- Add a small deterministic fixture whose expected result can be checked by hand.
- Test relevant invariants, not only a snapshot or one attractive chart.
- Preserve the `r = 0` first-retry convention unless a reviewed change explicitly
  updates all callers, tests, and documentation.
- Keep the strategies' total retry counts equal for the existing all-fail model.
- Check zero/full-range seed values, caps below the base, and bin boundaries
  when changing those paths.
- Explain any changed random sampling or export schema. Those changes affect
  reproducibility even when the UI looks the same.

A lower peak in one scenario is not proof of better throughput or recovery.
Avoid adding performance claims that this model cannot measure.

## UI changes need a short manual pass

Check a narrow viewport, keyboard navigation, visible focus, connected labels,
error text, and readable units. Try this sequence:

1. Run a valid comparison, then edit a value without applying it.
2. Confirm charts and export still describe the last run.
3. Submit an empty, fractional, or out-of-range value; verify the previous result
   remains available and the invalid field receives focus.
4. Reset, run again, and export more than once.
5. Try the largest allowed scenario and a bin width that violates the bin limit.

If you attach screenshots, capture the actual app with synthetic inputs and
state the viewport. Keep illustrative artwork labeled as illustrative.

## Dependencies, privacy, and licenses

Keep dependencies intentional. The model currently needs no runtime network,
storage, charting service, external font, or analytics. Discuss changes to those
boundaries before adding them, and update [SECURITY.md](SECURITY.md).

When a dependency changes, commit the matching lockfile and refresh
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) and the
[license inventory](docs/dependency-licenses.json). The metadata helper is
`node docs/update-licenses.mjs`; review its diff and the runtime license text
afterward. Inspect actual package
licenses and notices; do not assume that all dependencies share the project's
MIT license. Include attribution for any third-party code or assets.

Use synthetic inputs only. Never commit credentials, private traces, production
identifiers, `node_modules`, or test recordings containing personal data.
See [SECURITY.md](SECURITY.md) for vulnerability reporting.

## Opening a pull request

Use the PR template to describe the problem, the change, checks actually run,
and known limitations. Link an issue when one exists, but do not invent one
for a small documentation correction. A failing or unrun check is useful
information when clearly disclosed.

Contributions are provided under the project's MIT license. Only contribute
material you have permission to share and license. Third-party material retains
its own applicable terms.

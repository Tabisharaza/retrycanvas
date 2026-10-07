# A small project with a clear job

## Who it could help

- An engineer explaining why synchronized retries create visible bursts
- A team comparing delay formulas during a design discussion
- A workshop instructor who wants a reproducible, offline-friendly exercise
- A contributor who wants a compact TypeScript project with mathematical tests

The core promise is modest: make the retry schedule easy to see, explain, and
export. No account, production trace, API key, or service connection is needed.

## Why keep the model small?

A diagram becomes less useful when its assumptions are hidden. A deterministic,
all-fail model lets a reader check the arithmetic and see which differences
come from timing alone. It also keeps contribution boundaries approachable:
a new delay strategy, a clearer explanation, or a more accessible chart can
be reviewed without understanding a distributed-systems backend.

## Side-project hypotheses to test

These are possible experiments, not existing offerings, customers, or revenue
claims. There is no payment, subscription, or sales workflow in this repository.

| Hypothesis | Small validation step | Evidence worth collecting |
| --- | --- | --- |
| A guided retry workshop is useful to engineering teams | Run one session using only synthetic scenarios | Can participants explain the model's limits and compare formulas afterward? |
| Teams want a private training integration | Ask interested teams what their existing learning tools cannot do | A concrete workflow and willingness to try a narrowly scoped integration |
| Instructors value prepared exercises | Share a short lesson and answer sheet for review | Repeated use, specific feedback, and requests for further exercises |

Keep the current educational tool useful on its own. Decide whether to build
any commercial extension only after finding a real need. Charging for a
workshop or customization would require separate terms, support expectations,
and validation; the MIT license does not create an obligation to provide any
of those services.

## Boundaries worth preserving

- Keep defaults synthetic and reproducible.
- Do not imply production validation or automatic tuning.
- Treat real trace import, accounts, storage, or integrations as a separate
  privacy and security design decision.
- Prefer features with an explanation and a testable invariant.
- Credit established algorithms and retain dependency notices.

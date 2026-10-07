# The model, precisely

RetryCanvas compares the timing of synthetic retries. Its usefulness comes from
making a small model inspectable, including the things it leaves out.

## One scenario, three schedules

There are `N` clients. Every client makes its initial attempt at time `0`, then
makes exactly `R` retries. Every attempt fails. An attempt has zero service time,
and there is no network latency. A client waits for the selected delay before
its next retry.

The retry index `r` starts at **0 for the first retry**. The initial attempt is
separate and does not consume a retry. All units below are milliseconds.

For a base delay `B`, per-delay cap `C`, and a seeded uniform sample `u` in
`[0, 1)`:

```text
W(r) = min(C, B × 2^r)

No jitter:    delay(r) = W(r)
Full jitter:  delay(r) = u × W(r)
Equal jitter: delay(r) = W(r) / 2 + u × W(r) / 2

time(initial) = 0
time(retry r) = sum(delay(k), k = 0 ... r)
```

The cap limits **each wait**, not the elapsed time for the whole sequence.
Full jitter allows a wait arbitrarily close to zero. Equal jitter keeps at
least half of that retry's window. No jitter always waits for the full window.

For corresponding client/retry pairs, full and equal jitter reuse the same
uniform sample. A change in the strategy therefore changes the delay formula,
not which random draw that pair receives. The seed is for reproducibility,
not cryptographic security.

## A small worked example

Take one client, four retries, a 100 ms base, and an 800 ms cap. To keep the
arithmetic visible, use an illustrative `u = 0.25` for every retry. This is a
hand-worked example, not the output of a particular app seed.

| Retry index | Window | No-jitter wait | Full-jitter wait | Equal-jitter wait |
| --- | ---: | ---: | ---: | ---: |
| 0 | 100 ms | 100 ms | 25 ms | 62.5 ms |
| 1 | 200 ms | 200 ms | 50 ms | 125 ms |
| 2 | 400 ms | 400 ms | 100 ms | 250 ms |
| 3 | 800 ms | 800 ms | 200 ms | 500 ms |

The cumulative retry times are:

- No jitter: 100, 300, 700, 1,500 ms
- Full jitter: 25, 75, 175, 375 ms
- Equal jitter: 62.5, 187.5, 437.5, 937.5 ms

With 100 clients, each strategy still produces **400 retries and 500 total
attempts**. Jitter changes the schedule. This experiment does not stop clients
after a successful request because success is not modeled.

## What the numbers can tell you

- **Retry count:** `N × R`, identical for every strategy.
- **Total attempts:** `N × (R + 1)`, including the synchronized initial burst.
- **Peak retries per bin:** the largest retry count in a fixed-width time bucket.
  The initial attempts are excluded; retries close to zero still count.
- **Elapsed time:** a description of scheduled timestamps, not response latency,
  successful completion time, or recovery time.

Always report a peak together with its bin width. A count in a 100 ms bin
cannot be compared directly with a count in a 500 ms bin. A bucket also does
not model a server's concurrent-request capacity: there are no durations,
queues, workers, or completion events here.

Both charts, the event array, and the CSV exclude the initial attempts. The
initial burst is part of the model, not an exported event. The first histogram
bucket can still contain near-zero retries.

- **Mean wait per retry:** the sum of all individual retry delays divided by
  `N × R`. It is not the mean cumulative timestamp or end-to-end latency.
- **Last scheduled retry:** the largest cumulative retry timestamp among all
  clients for that strategy. No completion or success is implied.

Histogram bin `k` is half-open: `[k × width, (k + 1) × width)`. Each retry goes
into bin `floor(timestamp / width)`. All three strategies share a time horizon
set by the sum of the no-jitter waits. The final bin is retained even when a
retry lands exactly on that horizon; histogram axes include that entire bin.
All histograms use the same vertical scale. The timeline shows only the first
40 clients, or all clients when there are fewer than 40. Metrics, histograms,
and CSV always use all clients.

At the default settings, full jitter can have a higher first-bin count than
no jitter because a client can schedule several short retries in that bin.
Dispersed timestamps do not guarantee a lower peak at every bin width.

## Reproducibility and input bounds

The implementation uses a keyed 32-bit avalanche hash of `(seed, client,
retryIndex)` and divides the unsigned result by `2^32`. It produces deterministic
pseudorandom samples in `[0, 1)` without global random state. Changing strategy
evaluation order does not change the result. This is a small visualization
sampler, not a cryptographic generator or a claim of statistical independence.

Inputs must be whole numbers within these limits:

| Input | Accepted range |
| --- | --- |
| Clients | 1–500 |
| Retries per client | 1–12 |
| Base delay, delay cap, bin width | 1–60,000 ms each |
| Seed | 0–4,294,967,295 |

The derived histogram must also fit within 2,000 bins. The minimum accepted bin
width is `floor(horizon / 2000) + 1` ms, where `horizon` is the sum of the
no-jitter delays. Validation happens before allocation. A cap below the base
is allowed: the formula applies the cap starting with the first retry.

## CSV contract

Export contains one header and `3 × N × R` retry rows, grouped by strategy
(`none`, `full`, `equal`), then one-based client ID, then zero-based retry index:

```csv
strategy,client,retry_index,delay_ms,timestamp_ms
```

Numeric cells retain JavaScript number precision; they are not rounded to the
UI display format. The file uses CRLF line endings and a trailing newline.
The filename contains the seed. The remaining scenario settings and the seed
are not columns, so save the complete settings separately when sharing a CSV.
The export uses the last successfully run comparison, including when edited
inputs have not been applied or fail validation. Initial attempts are omitted.

## Useful experiments

1. Hold the seed and every other input constant. Switch strategies and inspect
   how the retry times change.
2. Increase the client count. Check that the total event count changes exactly
   as the formulas above predict.
3. Change only the seed. No-jitter timing should remain unchanged; jittered
   schedules can vary.
4. Lower the cap. Notice the repeated maximum-width windows after the cap is
   reached. The total timeline can still extend beyond the cap.
5. Change bin width while keeping the scenario fixed. Observe how the peak
   depends on that visualization choice.

There is no universal “winning seed” or guaranteed peak reduction. A particular
sample, retry budget, or coarse bucket width can produce ties or misleading
visual impressions. Compare more than one seed and retain the model assumptions.

## Deliberate omissions

The model has no successes, recovery threshold, overload feedback, request
latency, timeouts, queues, retryable/non-retryable error classification,
idempotency checks, `Retry-After` support, retry token quota, adaptive rate
limiting, or cancellation. Every client starts together; independent arrivals
are not modeled. The chart is a synthetic schedule, not a load test.

Consequently, this project cannot estimate throughput, incident recovery,
service availability, production cost, or which settings are safe for an API.
Do not copy parameters into a production client without checking that client's
SDK behavior and the service's requirements.

## Background and attribution

Exponential backoff, full jitter, and equal jitter are established techniques.
RetryCanvas's implementation and interface are independently written; the
algorithms are not claimed as inventions of this project.

- Marc Brooker's [Exponential Backoff And Jitter](https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/)
  explains these approaches in a different contention model where clients can
  succeed. Its work and completion-time results do not transfer to this
  fixed-budget, all-fail model.
- The [AWS SDK retry behavior reference](https://docs.aws.amazon.com/sdkref/latest/guide/feature-retry-behavior.html)
  documents production SDK behavior and configuration. RetryCanvas is not an
  AWS SDK implementation or a compatibility test.

Check the current documentation for the particular SDK and version you use.

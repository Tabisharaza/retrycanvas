/** Pure synthetic scheduling model. No network, clock, or browser dependencies. */
export const STRATEGIES = ['none', 'full', 'equal'] as const
export type Strategy = (typeof STRATEGIES)[number]
export interface Config {
  clients: number
  retries: number
  baseMs: number
  capMs: number
  seed: number
  binMs: number
}
export const DEFAULT_CONFIG: Readonly<Config> = Object.freeze({
  clients: 100, retries: 6, baseMs: 100, capMs: 2000, seed: 42, binMs: 100,
})
export const LIMITS = Object.freeze({
  clients: 500, retries: 12, timeMs: 60_000, seed: 0xffffffff, bins: 2000,
})
export interface RetryEvent {
  strategy: Strategy
  client: number // One-based client ID.
  retryIndex: number // Zero-based: first retry is r = 0.
  delayMs: number
  timestampMs: number // Sum of this client's delays, after initial attempt at t = 0.
}
export interface StrategyResult {
  strategy: Strategy
  events: RetryEvent[]
  bins: number[]
  meanWaitMs: number
  peakRetries: number
  lastRetryMs: number
}
export interface Simulation {
  config: Config
  horizonMs: number
  results: StrategyResult[]
}
export type ConfigErrors = Partial<Record<keyof Config | 'bins', string>>

function horizonUnchecked(config: Config): number {
  let total = 0
  for (let r = 0; r < config.retries; r++) total += Math.min(config.capMs, config.baseMs * 2 ** r)
  return total
}

export function validateConfig(config: Config): ConfigErrors {
  const errors: ConfigErrors = {}
  const rules: [keyof Config, string, number, number][] = [
    ['clients', 'Clients', 1, LIMITS.clients],
    ['retries', 'Retries', 1, LIMITS.retries],
    ['baseMs', 'Base delay', 1, LIMITS.timeMs],
    ['capMs', 'Delay cap', 1, LIMITS.timeMs],
    ['seed', 'Seed', 0, LIMITS.seed],
    ['binMs', 'Bin width', 1, LIMITS.timeMs],
  ]
  for (const [key, label, min, max] of rules) {
    if (!Number.isSafeInteger(config[key]) || config[key] < min || config[key] > max) {
      errors[key] = `${label} must be a whole number from ${min.toLocaleString('en-US')} to ${max.toLocaleString('en-US')}.`
    }
  }
  // Check derived size only after all inputs are safe, before any allocation.
  if (Object.keys(errors).length === 0) {
    const minBin = Math.floor(horizonUnchecked(config) / LIMITS.bins) + 1
    if (config.binMs < minBin) errors.bins = `This schedule needs a bin width of at least ${minBin} ms (maximum ${LIMITS.bins.toLocaleString('en-US')} bins).`
  }
  return errors
}

function assertConfig(config: Config): void {
  const errors = validateConfig(config)
  if (Object.keys(errors).length) throw new RangeError(Object.values(errors).join(' '))
}

/** A keyed 32-bit avalanche hash. Paired jitter uses the same u for each (seed, client, retry). */
function indexedUniform(seed: number, client: number, retryIndex: number): number {
  let x = (seed ^ Math.imul(client, 0x9e3779b1) ^ Math.imul(retryIndex + 1, 0x85ebca77)) >>> 0
  x = Math.imul(x ^ (x >>> 16), 0x7feb352d)
  x = Math.imul(x ^ (x >>> 15), 0x846ca68b)
  return ((x ^ (x >>> 16)) >>> 0) / 0x100000000
}

function runStrategy(config: Config, strategy: Strategy, horizonMs: number): StrategyResult {
  const events: RetryEvent[] = []
  const bins = Array<number>(Math.floor(horizonMs / config.binMs) + 1).fill(0)
  let totalWait = 0
  let lastRetryMs = 0
  for (let client = 1; client <= config.clients; client++) {
    let timestampMs = 0
    for (let retryIndex = 0; retryIndex < config.retries; retryIndex++) {
      const window = Math.min(config.capMs, config.baseMs * 2 ** retryIndex)
      const u = indexedUniform(config.seed, client, retryIndex)
      const delayMs = strategy === 'none' ? window : strategy === 'full' ? u * window : window / 2 + u * window / 2
      timestampMs += delayMs
      totalWait += delayMs
      lastRetryMs = Math.max(lastRetryMs, timestampMs)
      bins[Math.floor(timestampMs / config.binMs)]++
      events.push({ strategy, client, retryIndex, delayMs, timestampMs })
    }
  }
  return { strategy, events, bins, meanWaitMs: totalWait / events.length, peakRetries: Math.max(...bins), lastRetryMs }
}

/** Simulate one strategy independently; deterministic regardless of evaluation order. */
export function simulateStrategy(config: Config, strategy: Strategy): StrategyResult {
  assertConfig(config)
  if (!STRATEGIES.includes(strategy)) throw new RangeError('Unknown retry strategy.')
  return runStrategy(config, strategy, horizonUnchecked(config))
}

export function simulate(config: Config): Simulation {
  assertConfig(config)
  const snapshot = { ...config }
  const horizonMs = horizonUnchecked(snapshot)
  return { config: snapshot, horizonMs, results: STRATEGIES.map(strategy => runStrategy(snapshot, strategy, horizonMs)) }
}

/** Regenerate from validated config: CSV contains controlled labels and finite numeric cells only. */
export function toCsv(config: Config): string {
  const simulation = simulate(config)
  const rows = ['strategy,client,retry_index,delay_ms,timestamp_ms']
  for (const { events } of simulation.results) {
    for (const event of events) {
      rows.push([event.strategy, event.client, event.retryIndex, event.delayMs, event.timestampMs].join(','))
    }
  }
  return rows.join('\r\n') + '\r\n'
}

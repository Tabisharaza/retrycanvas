import { describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG, LIMITS, STRATEGIES, simulate, simulateStrategy, toCsv, validateConfig, type Config } from './engine'

const config = (overrides: Partial<Config> = {}): Config => ({ ...DEFAULT_CONFIG, ...overrides })
describe('deterministic retry schedules', () => {
  it('starts at retry index zero and accumulates exact capped exponential delays', () => {
    const result = simulateStrategy(config({ clients: 1 }), 'none')
    expect(result.events.map(event => event.retryIndex)).toEqual([0, 1, 2, 3, 4, 5])
    expect(result.events.map(event => event.delayMs)).toEqual([100, 200, 400, 800, 1600, 2000])
    expect(result.events.map(event => event.timestampMs)).toEqual([100, 300, 700, 1500, 3100, 5100])
    expect(result.meanWaitMs).toBe(850)
    expect(result.lastRetryMs).toBe(5100)
  })
  it('keeps a stable seed-42 reference vector', () => {
    expect(simulateStrategy(config({ clients: 1, retries: 3 }), 'full').events.map(event => event.delayMs)).toEqual([57.77898894157261, 13.736029341816902, 267.07841232419014])
  })
  it('caps even the first retry when the cap is below the base', () => {
    expect(simulateStrategy(config({ clients: 1, baseMs: 100, capMs: 7 }), 'none').events.map(event => event.delayMs)).toEqual([7, 7, 7, 7, 7, 7])
  })
  it('reproduces the same config without depending on strategy evaluation order', () => {
    const initial = simulate(config())
    expect(simulate(config())).toEqual(initial)
    for (const strategy of [...STRATEGIES].reverse()) {
      expect(simulateStrategy(config(), strategy)).toEqual(initial.results.find(result => result.strategy === strategy))
    }
  })
  it('pairs the same random variate for full and equal jitter, within their bounds', () => {
    const full = simulateStrategy(config(), 'full')
    const equal = simulateStrategy(config(), 'equal')
    full.events.forEach((event, index) => {
      const window = Math.min(DEFAULT_CONFIG.capMs, DEFAULT_CONFIG.baseMs * 2 ** event.retryIndex)
      expect(event.delayMs).toBeGreaterThanOrEqual(0)
      expect(event.delayMs).toBeLessThan(window)
      expect(equal.events[index].delayMs).toBeCloseTo(window / 2 + event.delayMs / 2, 10)
      expect(equal.events[index].delayMs).toBeGreaterThanOrEqual(window / 2)
      expect(equal.events[index].delayMs).toBeLessThan(window)
    })
  })
  it('changes jitter with the seed and leaves the no-jitter schedule unchanged', () => {
    for (const strategy of ['full', 'equal'] as const) expect(simulateStrategy(config({ seed: 43 }), strategy)).not.toEqual(simulateStrategy(config(), strategy))
    expect(simulateStrategy(config({ seed: 43 }), 'none')).toEqual(simulateStrategy(config(), 'none'))
  })
  it('preserves clients when increasing the client count', () => {
    expect(simulateStrategy(config({ clients: 2 }), 'full').events.slice(0, 6)).toEqual(simulateStrategy(config({ clients: 1 }), 'full').events)
  })
  it('tracks cumulative times and all events for every client', () => {
    const result = simulate(config({ clients: 8, retries: 12 }))
    for (const strategy of result.results) {
      expect(strategy.events).toHaveLength(96)
      for (let client = 1; client <= 8; client++) {
        let time = 0
        for (const event of strategy.events.filter(event => event.client === client)) {
          time += event.delayMs
          expect(event.timestampMs).toBe(time)
          expect(time).toBeLessThanOrEqual(result.horizonMs)
        }
      }
      expect(strategy.lastRetryMs).toBe(Math.max(...strategy.events.map(event => event.timestampMs)))
      expect(strategy.meanWaitMs).toBeCloseTo(strategy.events.reduce((sum, event) => sum + event.delayMs, 0) / 96, 10)
    }
  })
})
describe('histogram semantics and resource bounds', () => {
  it('excludes initial attempts and puts right-edge events in the next half-open bin', () => {
    const result = simulateStrategy(config({ clients: 3, retries: 2, baseMs: 100, binMs: 100 }), 'none')
    expect(result.bins).toEqual([0, 3, 0, 3])
    expect(result.peakRetries).toBe(3)
    expect(result.bins.reduce((a, b) => a + b, 0)).toBe(6)
  })
  it('counts every retry once and uses identical bin axes', () => {
    const { results } = simulate(config())
    for (const result of results) expect(result.bins.reduce((a, b) => a + b, 0)).toBe(600)
    expect(new Set(results.map(result => result.bins.length)).size).toBe(1)
  })
  it('allows every retry to be in one bin', () => {
    for (const result of simulate(config({ binMs: 60_000 })).results) expect(result.peakRetries).toBe(600)
  })
  it.each([
    ['clients', 0], ['clients', 501], ['clients', 1.5], ['clients', NaN], ['clients', Infinity],
    ['retries', 0], ['retries', 13], ['baseMs', 0], ['baseMs', 60_001], ['capMs', -1],
    ['capMs', Infinity], ['seed', -1], ['seed', 2 ** 32], ['seed', 1.1], ['binMs', 0], ['binMs', 60_001],
  ] as [keyof Config, number][])('rejects invalid %s = %s before simulation', (key, value) => {
    expect(validateConfig(config({ [key]: value }))[key]).toBeTruthy()
    expect(() => simulate(config({ [key]: value }))).toThrow(RangeError)
    expect(() => toCsv(config({ [key]: value }))).toThrow(RangeError)
  })
  it('rejects excessive histogram allocation and accepts the minimum safe bin', () => {
    expect(validateConfig(config({ binMs: 1 })).bins).toMatch('at least 3 ms')
    expect(simulate(config({ binMs: 3 })).results[0].bins.length).toBeLessThanOrEqual(LIMITS.bins)
  })
  it('handles maximum workload with finite numbers and bounded arrays', () => {
    const output = simulate(config({ clients: 500, retries: 12, baseMs: 60_000, capMs: 60_000, binMs: 361, seed: LIMITS.seed }))
    expect(output.horizonMs).toBe(720_000)
    for (const result of output.results) {
      expect(result.events).toHaveLength(6000)
      expect(result.bins.length).toBeLessThanOrEqual(2000)
      expect(Number.isFinite(result.meanWaitMs)).toBe(true)
    }
  })
  it('supports the minimum inputs and seed zero', () => {
    expect(simulate(config({ clients: 1, retries: 1, baseMs: 1, capMs: 1, seed: 0, binMs: 1 })).results).toHaveLength(3)
  })
  it('does not alias the caller configuration', () => {
    const input = config()
    const output = simulate(input)
    input.clients = 999
    expect(output.config.clients).toBe(100)
  })
  it('rejects unknown strategy names', () => {
    expect(() => simulateStrategy(config(), 'bogus' as 'none')).toThrow('Unknown retry strategy')
  })
})
describe('CSV export', () => {
  it('exports a header and one numeric, formula-safe row per retry in all strategies', () => {
    const rows = toCsv(config({ clients: 2, retries: 2 })).trim().split('\r\n')
    expect(rows[0]).toBe('strategy,client,retry_index,delay_ms,timestamp_ms')
    expect(rows).toHaveLength(13)
    for (const row of rows.slice(1)) {
      const [strategy, ...cells] = row.split(',')
      expect(STRATEGIES).toContain(strategy)
      expect(cells).toHaveLength(4)
      cells.forEach(cell => { expect(Number.isFinite(Number(cell))).toBe(true); expect(cell).not.toMatch(/^[=+@-]/) })
    }
  })
  it('is repeatable and preserves full numeric precision', () => {
    expect(toCsv(config())).toBe(toCsv(config()))
    const full = toCsv(config({ clients: 1, retries: 1 })).trim().split('\r\n')[2].split(',')
    expect(Number(full[3])).toBe(simulateStrategy(config({ clients: 1, retries: 1 }), 'full').events[0].delayMs)
  })
})

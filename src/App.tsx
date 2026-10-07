import { useState, type FormEvent } from 'react'
import { DEFAULT_CONFIG, LIMITS, simulate, toCsv, validateConfig, type Config, type ConfigErrors } from './engine'
import { COLORS, LABELS, Timeline, Histogram, formatMs } from './Charts'

type Inputs = Record<keyof Config, string>
const toInputs = (config: Config): Inputs => Object.fromEntries(Object.entries(config).map(([key, value]) => [key, String(value)])) as Inputs
const fields: { key: keyof Config; label: string; hint: string; max: number; min: number; unit?: string }[] = [
  { key: 'clients', label: 'Clients', hint: '1–500 simultaneous clients', min: 1, max: LIMITS.clients },
  { key: 'retries', label: 'Retries per client', hint: '1–12 · same budget for all', min: 1, max: LIMITS.retries },
  { key: 'baseMs', label: 'Base delay', hint: 'First-retry window, before cap', min: 1, max: LIMITS.timeMs, unit: 'ms' },
  { key: 'capMs', label: 'Delay cap', hint: 'Maximum retry window', min: 1, max: LIMITS.timeMs, unit: 'ms' },
  { key: 'seed', label: 'Random seed', hint: 'Same seed, same schedule', min: 0, max: LIMITS.seed },
  { key: 'binMs', label: 'Histogram bin width', hint: 'Smaller bins show more detail', min: 1, max: LIMITS.timeMs, unit: 'ms' },
]
export default function App() {
  const [inputs, setInputs] = useState<Inputs>(() => toInputs(DEFAULT_CONFIG))
  const [simulation, setSimulation] = useState(() => simulate(DEFAULT_CONFIG))
  const [errors, setErrors] = useState<ConfigErrors>({})
  const [status, setStatus] = useState('Default comparison ready.')
  const dirty = Object.entries(inputs).some(([key, value]) => value !== String(simulation.config[key as keyof Config]))
  const maxCount = Math.max(...simulation.results.map(result => result.peakRetries))
  const total = simulation.config.clients * simulation.config.retries
  function run(event: FormEvent) {
    event.preventDefault()
    const config = Object.fromEntries(Object.entries(inputs).map(([key, value]) => [key, value.trim() === '' ? NaN : Number(value)])) as unknown as Config
    const nextErrors = validateConfig(config)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) {
      setStatus('Check the highlighted inputs. The last valid comparison is still shown.')
      const first = Object.keys(nextErrors)[0]
      document.getElementById(first === 'bins' ? 'binMs' : first)?.focus()
      return
    }
    setSimulation(simulate(config))
    setInputs(toInputs(config))
    setStatus(`Comparison updated: ${config.clients} clients, ${config.retries} retries each, seed ${config.seed}.`)
  }
  function reset() {
    setInputs(toInputs(DEFAULT_CONFIG))
    setSimulation(simulate(DEFAULT_CONFIG))
    setErrors({})
    setStatus('Defaults restored: 100 clients, 6 retries each, seed 42.')
  }
  function exportCsv() {
    const blob = new Blob([toCsv(simulation.config)], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `retrycanvas-seed-${simulation.config.seed}.csv`
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    setStatus(`CSV exported: ${(total * 3).toLocaleString('en-US')} retry rows from the displayed comparison.`)
  }
  return <>
    <a className="skip-link" href="#controls">Skip to simulation controls</a>
    <header className="site-header">
      <a className="brand" href="#" aria-label="RetryCanvas home"><svg viewBox="0 0 32 32" aria-hidden="true"><path d="M5 8h4m6 0h4m5 0h3M5 16h4m10 0h4M5 24h4m15 0h3" /></svg><span>RetryCanvas<span className="brand-dot">.</span></span></a>
      <span className="header-note">A retry timing playground</span>
      <a href="#model" className="model-link">How it works <span aria-hidden="true">↗</span></a>
    </header>
    <main>
      <section className="intro" aria-labelledby="page-title">
        <div><div className="eyebrow">EXPONENTIAL BACKOFF, MADE VISIBLE</div><h1 id="page-title">Same retries. <span>Different rhythm.</span></h1><p>See how a little randomness changes when retries arrive.</p></div>
        <div className="local-badge"><svg viewBox="0 0 20 20" aria-hidden="true"><rect x="4" y="8" width="12" height="9" rx="2" /><path d="M7 8V6a3 3 0 0 1 6 0v2" /></svg><div>Runs in your browser<span>No simulated traffic. No tracking.</span></div></div>
      </section>
      <div className="workspace">
        <aside className="controls-panel" aria-labelledby="controls-title">
          <div className="panel-heading"><span className="section-number">01</span><h2 id="controls-title">Set the scene</h2></div>
          <p className="panel-intro">All clients start together. Every client uses its full retry budget.</p>
          <form id="controls" onSubmit={run} noValidate>
            <div className="fields">{fields.map(({ key, label, hint, min, max, unit }) => {
              const error = errors[key] || (key === 'binMs' ? errors.bins : undefined)
              return <div className="field" key={key}>
                <label htmlFor={key}>{label}</label>
                <div className={`input-wrap ${error ? 'invalid' : ''}`}><input id={key} name={key} type="number" inputMode="numeric" min={min} max={max} step="1" value={inputs[key]} aria-invalid={Boolean(error)} aria-describedby={`${key}-hint${error ? ` ${key}-error` : ''}`} onChange={event => setInputs({ ...inputs, [key]: event.target.value })} />{unit && <span aria-hidden="true">{unit}</span>}</div>
                <div className="field-hint" id={`${key}-hint`}>{hint}</div>
                {error && <p className="field-error" id={`${key}-error`}>{error}</p>}
              </div>
            })}</div>
            <button className="primary-button" type="submit"><svg viewBox="0 0 18 18" aria-hidden="true"><path d="m6 3 9 6-9 6z" /></svg>Run comparison</button>
            <button className="reset-button" type="button" onClick={reset}>Reset defaults</button>
            <p className={`input-status ${dirty ? 'is-dirty' : ''}`}>{dirty ? 'Inputs changed. Run to apply.' : 'Deterministic · seed ' + simulation.config.seed}</p>
          </form>
          <div className="setup-note"><strong>One controlled experiment</strong><p>The seed pairs the same random draw across jitter strategies. Only the delay rule changes.</p></div>
        </aside>
        <div className="results-panel">
          <div className="results-heading"><div><span className="section-number">02</span><h2>Your comparison</h2></div><button className="export-button" onClick={exportCsv}><svg viewBox="0 0 18 18" aria-hidden="true"><path d="M9 2v9m-3-3 3 3 3-3M3 12v3h12v-3" /></svg>Export CSV</button></div>
          <div className="run-summary"><span><strong>{simulation.config.clients}</strong> clients</span><span><strong>{simulation.config.retries}</strong> retries each</span><span><strong>{total.toLocaleString('en-US')}</strong> retries per strategy</span></div>
          <div className="timeline-card">
            <div className="chart-heading"><div><h3>The retry rhythm</h3><p>Each mark is a retry. Each row is a client.</p></div><span className="chart-tag">SHARED TIME AXIS</span></div>
            <div className="legend" aria-label="Strategy legend">{simulation.results.map((result, index) => <span key={result.strategy}><i style={{ background: COLORS[result.strategy] }} />{index + 1}. {LABELS[result.strategy]}</span>)}</div>
            <Timeline simulation={simulation} />
            <div className="chart-footnote"><span>First {Math.min(simulation.config.clients, 40)} of {simulation.config.clients} clients shown</span><span>Initial attempt at t = 0 is excluded</span></div>
          </div>
          <div className="distribution-heading"><h3>Where retries bunch up</h3><span>{simulation.config.binMs} ms bins · shared axes · all clients</span></div>
          <div className="strategy-grid">{simulation.results.map((result, index) => <article className={`strategy-card strategy-${result.strategy}`} key={result.strategy} aria-label={`${LABELS[result.strategy]} results`}>
            <div className="strategy-heading"><span className="strategy-index">0{index + 1}</span><h4>{LABELS[result.strategy]}</h4></div>
            <div className="peak-stat"><strong>{result.peakRetries.toLocaleString('en-US')}</strong><span>peak retries / bin</span></div>
            <Histogram result={result} simulation={simulation} maxCount={maxCount} />
            <dl className="stats"><div><dt>Mean wait / retry</dt><dd>{formatMs(result.meanWaitMs)}</dd></div><div><dt>Last scheduled retry</dt><dd>{formatMs(result.lastRetryMs)}</dd></div></dl>
            <p className="strategy-formula">{result.strategy === 'none' ? 'delay = window' : result.strategy === 'full' ? 'delay = u × window' : 'delay = window / 2 + u × window / 2'}</p>
          </article>)}</div>
          <p className="metric-note">Peak counts scheduled retries in a bin, excluding the initial burst. Changing bin width changes the peak. All strategies schedule exactly the same number of retries.</p>
        </div>
      </div>
      <div role="status" aria-live="polite" className="status-message">{status}</div>
      <section id="model" className="model-section" aria-labelledby="model-title">
        <div><div className="eyebrow">THE MODEL, WITHOUT THE MYSTERY</div><h2 id="model-title">Timing is the whole experiment.</h2><p>This is a synthetic schedule. Initial attempts happen at t = 0 and are assumed to fail. Every retry is scheduled; success, service capacity, request duration, and network behavior are not modeled.</p></div>
        <div className="model-details"><div className="equation">window(r) = min(cap, base × 2<sup>r</sup>)</div><p>The first retry is r = 0. Each timestamp is the sum of that client’s delays. A seeded pseudorandom value u in [0, 1) is shared by client and retry index across both jitter strategies.</p><p>Mean wait is the sum of all retry delays divided by the number of retries. Histogram bin k covers [k × width, (k + 1) × width). These plots do not measure throughput or recovery time.</p></div>
      </section>
      <div className="disclaimer"><svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="7.5"/><path d="M10 9v5m0-8v.5" /></svg><p>Synthetic retry-schedule simulation. No requests are sent. This is not a benchmark, load test or production retry configuration recommendation.</p></div>
    </main>
    <footer><a className="footer-brand" href="#">RetryCanvas.</a><span>Explore the schedule. Question the assumptions.</span><a href="https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/" target="_blank" rel="noreferrer">Background on jitter</a></footer>
  </>
}

import { useId } from 'react'
import type { Simulation, StrategyResult } from './engine'

export const LABELS = { none: 'No jitter', full: 'Full jitter', equal: 'Equal jitter' }
export const COLORS = { none: '#bc5438', full: '#2460cc', equal: '#16816f' }
export function formatMs(value: number): string {
  return value < 1000 ? `${value.toLocaleString('en-US', { maximumFractionDigits: 1 })} ms` : `${(value / 1000).toLocaleString('en-US', { maximumFractionDigits: 2 })} s`
}
const WIDTH = 760
const LEFT = 42
const RIGHT = 14
const plotWidth = WIDTH - LEFT - RIGHT

export function Timeline({ simulation }: { simulation: Simulation }) {
  const titleId = useId()
  const descId = useId()
  const shownClients = Math.min(simulation.config.clients, 40)
  const laneHeight = 82
  const top = 24
  const axisY = top + 3 * laneHeight + 7
  const x = (time: number) => LEFT + time / simulation.horizonMs * plotWidth
  return <svg className="timeline" viewBox={`0 0 ${WIDTH} ${axisY + 38}`} role="img" aria-labelledby={titleId} aria-describedby={descId}>
    <title id={titleId}>Retry timelines for all three strategies, on one time scale</title>
    <desc id={descId}>Each mark is a scheduled retry. Each row is a client. Showing the first {shownClients} of {simulation.config.clients} clients. The initial attempts at zero are excluded. Time runs from zero to {formatMs(simulation.horizonMs)}.</desc>
    {[0, 0.25, 0.5, 0.75, 1].map(fraction => <g key={fraction}>
      <line x1={x(fraction * simulation.horizonMs)} x2={x(fraction * simulation.horizonMs)} y1={top - 5} y2={axisY} className="grid-line" />
      <text x={x(fraction * simulation.horizonMs)} y={axisY + 22} textAnchor={fraction === 0 ? 'start' : fraction === 1 ? 'end' : 'middle'} className="axis-text">{formatMs(fraction * simulation.horizonMs)}</text>
    </g>)}
    {simulation.results.map((result, lane) => {
      const y = top + lane * laneHeight
      const path = result.events.filter(event => event.client <= shownClients).map(event => {
        const px = x(event.timestampMs)
        const py = y + (event.client - 0.5) / shownClients * (laneHeight - 22)
        return `M${px.toFixed(2)},${py.toFixed(2)}v${Math.max(1.3, 48 / shownClients).toFixed(2)}`
      }).join(' ')
      return <g key={result.strategy}>
        <text x="14" y={y + 32} className="axis-text lane-label" textAnchor="middle">{lane + 1}</text>
        <path d={path} fill="none" stroke={COLORS[result.strategy]} strokeWidth="2" strokeLinecap="round" opacity="0.85" />
        <line x1={LEFT} x2={WIDTH - RIGHT} y1={y + laneHeight - 13} y2={y + laneHeight - 13} className="lane-line" />
      </g>
    })}
  </svg>
}

export function Histogram({ result, simulation, maxCount }: { result: StrategyResult, simulation: Simulation, maxCount: number }) {
  const titleId = useId()
  const descId = useId()
  const width = 320
  const left = 44
  const right = 10
  const top = 12
  const height = 115
  // All charts include the complete last half-open bin; a retry on the horizon belongs to it.
  const axisMax = result.bins.length * simulation.config.binMs
  const usableWidth = width - left - right
  const barWidth = usableWidth / result.bins.length
  const path = result.bins.map((count, index) => {
    if (count === 0) return ''
    const barHeight = count / maxCount * height
    return `M${(left + index * barWidth).toFixed(3)},${(top + height).toFixed(3)}v-${barHeight.toFixed(3)}h${Math.max(0.1, barWidth * 0.86).toFixed(3)}v${barHeight.toFixed(3)}Z`
  }).join(' ')
  return <svg className="histogram" viewBox={`0 0 ${width} 158`} role="img" aria-labelledby={titleId} aria-describedby={descId}>
    <title id={titleId}>{LABELS[result.strategy]} retry histogram</title>
    <desc id={descId}>{simulation.config.binMs} millisecond bins, including all {result.events.length} retries. Peak: {result.peakRetries}. Shared vertical scale: zero to {maxCount} retries per bin. Shared horizontal scale: zero to {formatMs(axisMax)}. Initial attempts are excluded.</desc>
    {[0, 0.5, 1].map(fraction => <g key={fraction}>
      <line x1={left} x2={width - right} y1={top + height * (1 - fraction)} y2={top + height * (1 - fraction)} className="grid-line" />
      <text x={left - 7} y={top + height * (1 - fraction) + 4} textAnchor="end" className="axis-text">{maxCount * fraction}</text>
    </g>)}
    <path d={path} fill={COLORS[result.strategy]} />
    <text x={left} y="150" className="axis-text">0</text>
    <text x={width - right} y="150" className="axis-text" textAnchor="end">{formatMs(axisMax)}</text>
  </svg>
}

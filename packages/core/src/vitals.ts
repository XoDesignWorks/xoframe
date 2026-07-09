/**
 * XOframe vitals — report real Core Web Vitals (LCP, CLS, INP, plus FCP/TTFB)
 * from real users to your analytics. The debug overlay is dev-only; this is the
 * production-safe reporter. ~1.2 KB, no dependencies.
 * Separate entry (@xodesign/xoframe/vitals), never part of the core bundle.
 *
 *   import { XOframeVitals } from '@xodesign/xoframe/vitals'
 *   XOframeVitals.init({ onReport: (m) => navigator.sendBeacon('/vitals', JSON.stringify(m)) })
 *
 * Values are finalized when the page is hidden/unloaded (or per change with
 * `reportAllChanges`). CLS uses the session-window algorithm; INP approximates
 * as the worst interaction latency (fine for typical pages).
 */

export type VitalName = 'LCP' | 'CLS' | 'INP' | 'FCP' | 'TTFB'
export type VitalRating = 'good' | 'needs-improvement' | 'poor'

export interface Vital {
  name: VitalName
  value: number
  rating: VitalRating
}

export interface XOframeVitalsOptions {
  onReport: (metric: Vital) => void
  /** Report on every change, not only at finalize. Default: false. */
  reportAllChanges?: boolean
}

// Google's thresholds: [good ≤, poor >].
const THRESHOLDS: Record<VitalName, [number, number]> = {
  LCP: [2500, 4000],
  CLS: [0.1, 0.25],
  INP: [200, 500],
  FCP: [1800, 3000],
  TTFB: [800, 1800]
}

const rate = (name: VitalName, value: number): VitalRating => {
  const [good, poor] = THRESHOLDS[name]
  return value <= good ? 'good' : value <= poor ? 'needs-improvement' : 'poor'
}

interface ShiftEntry extends PerformanceEntry {
  value: number
  hadRecentInput: boolean
}
interface EventEntry extends PerformanceEntry {
  duration: number
  interactionId?: number
}

const observe = (type: string, cb: (entries: PerformanceEntry[]) => void): void => {
  try {
    const po = new PerformanceObserver((l) => cb(l.getEntries()))
    po.observe({ type, buffered: true } as PerformanceObserverInit)
  } catch {
    /* entry type unsupported — skip this metric */
  }
}

const init = (options: XOframeVitalsOptions): void => {
  if (typeof window === 'undefined' || typeof PerformanceObserver === 'undefined') return
  const { onReport, reportAllChanges } = options

  const values = {} as Record<VitalName, number>
  const reported = {} as Record<VitalName, boolean>

  const set = (name: VitalName, value: number, final = false): void => {
    values[name] = value
    if ((reportAllChanges || final) && !reported[name]) {
      if (final) reported[name] = true
      onReport({ name, value: Math.round(value * 1000) / 1000, rating: rate(name, value) })
    }
  }

  // LCP: the largest entry seen before the first input or page hide.
  let lcp = 0
  observe('largest-contentful-paint', (entries) => {
    const last = entries[entries.length - 1] as { startTime: number }
    if (last) set('LCP', (lcp = last.startTime))
  })

  // CLS: max session window (gap < 1s, window < 5s) of non-recent-input shifts.
  let cls = 0
  let sessionValue = 0
  let sessionLast = 0
  let sessionFirst = 0
  observe('layout-shift', (entries) => {
    for (const e of entries as ShiftEntry[]) {
      if (e.hadRecentInput) continue
      const ts = e.startTime
      if (sessionValue && ts - sessionLast < 1000 && ts - sessionFirst < 5000) {
        sessionValue += e.value
        sessionLast = ts
      } else {
        sessionValue = e.value
        sessionFirst = sessionLast = ts
      }
      if (sessionValue > cls) set('CLS', (cls = sessionValue))
    }
  })

  // INP: the worst interaction latency (Event Timing).
  let inp = 0
  observe('event', (entries) => {
    for (const e of entries as EventEntry[]) {
      if (e.interactionId && e.duration > inp) set('INP', (inp = e.duration))
    }
  })

  // FCP.
  observe('paint', (entries) => {
    const fcp = entries.find((e) => e.name === 'first-contentful-paint')
    if (fcp) set('FCP', fcp.startTime, true)
  })

  // TTFB from the navigation entry.
  const nav = performance.getEntriesByType?.('navigation')[0] as
    | { responseStart?: number }
    | undefined
  if (nav?.responseStart) set('TTFB', nav.responseStart, true)

  // Finalize the live metrics when the user leaves.
  const finalize = (): void => {
    if (lcp) set('LCP', lcp, true)
    if (cls || reported.CLS === undefined) set('CLS', cls, true)
    if (inp) set('INP', inp, true)
  }
  addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') finalize()
  })
  addEventListener('pagehide', finalize)
}

export const XOframeVitals = { init }
export default XOframeVitals

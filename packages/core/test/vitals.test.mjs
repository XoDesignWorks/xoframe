/**
 * Smoke tests for the opt-in vitals entry (@xodesign/xoframe/vitals).
 * jsdom has no real PerformanceObserver, so we install a controllable fake that
 * lets each test feed entries of a given type and assert the reported metric.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'
import { XOframeVitals } from '../dist/xoframe-vitals.esm.js'

let feeders // type → callback(entries)

const setup = ({ nav } = {}) => {
  // Create the window BEFORE touching globals — jsdom relies on the real
  // performance.now during construction.
  const dom = new JSDOM('<!doctype html><html><body></body></html>')
  globalThis.window = dom.window
  globalThis.document = dom.window.document
  globalThis.addEventListener = dom.window.addEventListener.bind(dom.window)
  feeders = {}
  globalThis.PerformanceObserver = class {
    constructor(cb) { this.cb = cb }
    observe({ type }) { feeders[type] = (entries) => this.cb({ getEntries: () => entries }) }
  }
  // Override only getEntriesByType, keeping the real performance (and .now) intact.
  globalThis.performance.getEntriesByType = (t) => (t === 'navigation' && nav ? [nav] : [])
  return dom.window
}

test('SSR-safe / no PerformanceObserver: init does not throw', () => {
  const saved = globalThis.PerformanceObserver
  globalThis.PerformanceObserver = undefined
  globalThis.window = { }
  assert.doesNotThrow(() => XOframeVitals.init({ onReport() {} }))
  globalThis.PerformanceObserver = saved
})

test('LCP is reported with the correct value and rating', () => {
  setup()
  const reports = []
  XOframeVitals.init({ onReport: (m) => reports.push(m), reportAllChanges: true })
  feeders['largest-contentful-paint']([{ startTime: 3200 }])
  const lcp = reports.find((m) => m.name === 'LCP')
  assert.equal(lcp.value, 3200)
  assert.equal(lcp.rating, 'needs-improvement') // 2500 < 3200 ≤ 4000
})

test('CLS uses the session window and rates correctly', () => {
  setup()
  const reports = []
  XOframeVitals.init({ onReport: (m) => reports.push(m), reportAllChanges: true })
  // Two shifts within the same 1s/5s window accumulate.
  feeders['layout-shift']([
    { startTime: 100, value: 0.05, hadRecentInput: false },
    { startTime: 400, value: 0.08, hadRecentInput: false },
    { startTime: 450, value: 0.5, hadRecentInput: true } // ignored (recent input)
  ])
  const cls = reports.filter((m) => m.name === 'CLS').pop()
  assert.ok(Math.abs(cls.value - 0.13) < 1e-6, 'summed 0.05 + 0.08')
  assert.equal(cls.rating, 'needs-improvement') // 0.1 < 0.13 ≤ 0.25
})

test('INP reports the worst interaction latency', () => {
  setup()
  const reports = []
  XOframeVitals.init({ onReport: (m) => reports.push(m), reportAllChanges: true })
  feeders['event']([
    { duration: 80, interactionId: 1 },
    { duration: 240, interactionId: 2 },
    { duration: 50, interactionId: 3 },
    { duration: 999, interactionId: 0 } // no interactionId → not an interaction
  ])
  const inp = reports.filter((m) => m.name === 'INP').pop()
  assert.equal(inp.value, 240)
  assert.equal(inp.rating, 'needs-improvement') // 200 < 240 ≤ 500
})

test('FCP and TTFB are reported once from paint/navigation', () => {
  setup({ nav: { responseStart: 600 } })
  const reports = []
  XOframeVitals.init({ onReport: (m) => reports.push(m) })
  feeders['paint']([{ name: 'first-contentful-paint', startTime: 1200 }])
  const fcp = reports.find((m) => m.name === 'FCP')
  const ttfb = reports.find((m) => m.name === 'TTFB')
  assert.equal(fcp.value, 1200)
  assert.equal(fcp.rating, 'good') // ≤ 1800
  assert.equal(ttfb.value, 600)
  assert.equal(ttfb.rating, 'good') // ≤ 800
})

test('metrics are finalized on visibilitychange → hidden', () => {
  const win = setup()
  const reports = []
  XOframeVitals.init({ onReport: (m) => reports.push(m) }) // no reportAllChanges
  feeders['largest-contentful-paint']([{ startTime: 1800 }])
  assert.ok(!reports.some((m) => m.name === 'LCP'), 'not reported before finalize')
  Object.defineProperty(win.document, 'visibilityState', { value: 'hidden', configurable: true })
  win.dispatchEvent(new win.Event('visibilitychange'))
  const lcp = reports.find((m) => m.name === 'LCP')
  assert.equal(lcp.value, 1800)
  assert.equal(lcp.rating, 'good')
})

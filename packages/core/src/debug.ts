/**
 * XOframe debug overlay — an in-page Core Web Vitals guard for development.
 * Shows live CLS and LCP, flags images that may cause layout shift, and warns
 * when the LCP image was lazy-loaded. Ship this to development only — it is a
 * separate file and never part of the core bundle.
 */

export interface XOframeDebugOptions {
  /** Corner for the panel. Default: 'bottom-left'. */
  position?: 'bottom-left' | 'bottom-right'
  /** Outline problematic images on the page. Default: true. */
  outline?: boolean
}

interface LayoutShiftEntry extends PerformanceEntry {
  value: number
  hadRecentInput: boolean
  sources?: { node?: Node }[]
}

interface LcpEntry extends PerformanceEntry {
  element?: Element
  startTime: number
}

const GOOD = '#0cce6b'
const NEEDS_IMPROVEMENT = '#ffa400'
const POOR = '#ff4e42'

let cls = 0
let lcp: LcpEntry | null = null
let loaded = 0
let panel: HTMLDivElement | null = null
let timer: ReturnType<typeof setInterval> | null = null
let opts: Required<XOframeDebugOptions> = { position: 'bottom-left', outline: true }
const observers: PerformanceObserver[] = []

const color = (value: number, good: number, poor: number): string =>
  value <= good ? GOOD : value <= poor ? NEEDS_IMPROVEMENT : POOR

const flash = (node?: Node): void => {
  if (!opts.outline || !(node instanceof HTMLElement)) return
  const prev = node.style.outline
  node.style.outline = `3px solid ${POOR}`
  setTimeout(() => (node.style.outline = prev), 1500)
}

const describe = (el?: Element): string => {
  if (!el) return '—'
  const id = el.id ? '#' + el.id : ''
  const src = (el as HTMLImageElement).currentSrc
  return `<${el.tagName.toLowerCase()}${id}>` + (src ? ' ' + src.split('/').pop() : '')
}

/** The LCP element was an image that had to wait for lazy loading. */
const lcpWasLazy = (): boolean => {
  const el = lcp?.element
  return (
    !!el &&
    el.tagName === 'IMG' &&
    ((el as HTMLImageElement).loading === 'lazy' ||
      ((el as HTMLElement).dataset.src !== undefined &&
        (el as HTMLImageElement).getAttribute('fetchpriority') !== 'high'))
  )
}

interface Audit {
  total: number
  lazy: number
  eager: number
  missing: HTMLImageElement[]
}

const audit = (): Audit => {
  const imgs = [...document.images]
  const missing = imgs.filter(
    (i) =>
      !i.getAttribute('width') &&
      !i.getAttribute('height') &&
      getComputedStyle(i).aspectRatio === 'auto' &&
      i.clientWidth > 40 // ignore icons/trackers
  )
  for (const i of missing) {
    if (opts.outline) i.style.outline = `2px dashed ${POOR}`
    i.title = '[XOframe] missing width/height — may cause layout shift'
  }
  return {
    total: imgs.length,
    lazy: imgs.filter((i) => i.loading === 'lazy' || i.dataset.src !== undefined).length,
    eager: imgs.filter((i) => i.getAttribute('fetchpriority') === 'high').length,
    missing
  }
}

const row = (label: string, value: string, valueColor = '#ddd'): string =>
  `<div style="display:flex;justify-content:space-between;gap:16px"><span style="color:#999">${label}</span><span style="color:${valueColor};text-align:right">${value}</span></div>`

const render = (): void => {
  if (!panel) return
  const a = audit()
  const lcpMs = lcp ? Math.round(lcp.startTime) : 0
  panel.innerHTML =
    `<div style="font-weight:700;margin-bottom:6px;color:#fff">XOframe debug</div>` +
    row('CLS', cls.toFixed(4), color(cls, 0.1, 0.25)) +
    row('LCP', lcp ? `${lcpMs} ms ${describe(lcp.element)}` : 'n/a', color(lcpMs, 2500, 4000)) +
    (lcpWasLazy() ? row('⚠ LCP', 'image was lazy-loaded!', POOR) : '') +
    row('images', String(a.total)) +
    row('lazy / priority', `${a.lazy} / ${a.eager}`) +
    row('managed loaded', String(loaded)) +
    row('missing size', String(a.missing.length), a.missing.length ? POOR : GOOD)
}

const onLoadEvent = (): void => {
  loaded++
}

const init = (options: XOframeDebugOptions = {}): void => {
  if (typeof window === 'undefined' || panel) return
  opts = { ...opts, ...options }

  panel = document.createElement('div')
  panel.style.cssText =
    `position:fixed;${opts.position === 'bottom-right' ? 'right' : 'left'}:12px;bottom:12px;` +
    'z-index:2147483647;background:rgba(17,17,17,.92);color:#ddd;padding:10px 14px;' +
    'border-radius:8px;font:11px/1.7 ui-monospace,SFMono-Regular,Menlo,monospace;' +
    'min-width:240px;max-width:340px;pointer-events:none;box-shadow:0 4px 16px rgba(0,0,0,.35)'
  document.body.appendChild(panel)

  try {
    const shiftPo = new PerformanceObserver((list) => {
      for (const e of list.getEntries() as LayoutShiftEntry[]) {
        if (e.hadRecentInput) continue
        cls += e.value
        e.sources?.forEach((s) => flash(s.node))
        console.warn('[XOframe debug] layout shift', e.value.toFixed(4), e.sources?.map((s) => s.node))
      }
    })
    shiftPo.observe({ type: 'layout-shift', buffered: true })
    observers.push(shiftPo)
  } catch {
    /* layout-shift not supported in this browser */
  }

  try {
    const lcpPo = new PerformanceObserver((list) => {
      const entries = list.getEntries() as LcpEntry[]
      if (entries.length) lcp = entries[entries.length - 1]
      if (lcpWasLazy())
        console.warn('[XOframe debug] LCP image was lazy-loaded — mark it data-xo-priority="high"', lcp!.element)
    })
    lcpPo.observe({ type: 'largest-contentful-paint', buffered: true })
    observers.push(lcpPo)
  } catch {
    /* LCP not supported in this browser */
  }

  document.addEventListener('xo:load', onLoadEvent)
  render()
  timer = setInterval(render, 500)
}

const destroy = (): void => {
  observers.forEach((o) => o.disconnect())
  observers.length = 0
  if (timer) clearInterval(timer)
  panel?.remove()
  panel = null
  document.removeEventListener('xo:load', onLoadEvent)
  cls = 0
  lcp = null
  loaded = 0
}

export const XOframeDebug = { init, destroy }
export default XOframeDebug

// Classic <script> auto-init: <script src="xoframe-debug.min.js" data-xo-auto></script>
// (document.currentScript is null inside ES modules, so this never fires for imports)
if (typeof document !== 'undefined' && document.currentScript?.hasAttribute('data-xo-auto')) {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => init())
  else init()
}

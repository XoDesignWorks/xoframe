/**
 * XOframe masonry — zero-CLS Pinterest/Unsplash-style galleries.
 * Unlike classic masonry libraries that reflow as images arrive, the layout is
 * computed from known aspect ratios (width/height attributes or data-ratio),
 * so positions are final before a single byte of image data loads.
 *
 *   <div data-xo-masonry>
 *     <img data-xo data-src="1.jpg" width="1200" height="800">
 *     <img data-xo data-src="2.jpg" width="900" height="1200">
 *   </div>
 *   XOframeMasonry.init()
 *
 * Separate entry point — never part of the core bundle.
 */

export interface XOframeMasonryOptions {
  /** Fixed column count, or 'auto' from minColumnWidth. Default: 'auto'. */
  columns?: number | 'auto'
  /** Minimum column width for 'auto' mode, px. Default: 260. */
  minColumnWidth?: number
  /** Gap between items, px. Default: 16. */
  gap?: number
}

interface State extends Required<XOframeMasonryOptions> {
  ro: ResizeObserver | null
  raf: number
  lastWidth: number
  onLoad: (e: Event) => void
}

const instances = new Map<HTMLElement, State>()

const raf: (cb: () => void) => number =
  typeof requestAnimationFrame === 'function'
    ? (cb) => requestAnimationFrame(cb)
    : (cb) => (cb(), 0)

/** Measured height, or an estimate from declared dimensions before layout exists. */
const heightOf = (item: HTMLElement, colWidth: number): number => {
  const measured = item.offsetHeight
  if (measured) return measured
  const media = item.querySelector('[width][height]') || item
  const w = +(media.getAttribute('width') || 0)
  const h = +(media.getAttribute('height') || 0)
  if (w && h) return (colWidth * h) / w
  const ratio = ((item as HTMLElement).dataset.ratio || '').split('/')
  if (ratio.length === 2 && +ratio[0]) return (colWidth * +ratio[1]) / +ratio[0]
  return colWidth
}

const layoutNow = (el: HTMLElement, s: State): void => {
  const width = el.clientWidth
  if (!width) return
  s.lastWidth = width
  const items = [...el.children] as HTMLElement[]
  const cols =
    s.columns === 'auto'
      ? Math.max(1, Math.floor((width + s.gap) / (s.minColumnWidth + s.gap)))
      : Math.max(1, s.columns)
  const colWidth = (width - s.gap * (cols - 1)) / cols

  // Batched writes (widths), then reads (heights), then writes (positions) —
  // one forced reflow per layout, no thrashing.
  for (const item of items) {
    item.style.position = 'absolute'
    item.style.width = colWidth + 'px'
    item.style.margin = '0'
  }
  const heights = items.map((item) => heightOf(item, colWidth))
  const colHeights = new Array<number>(cols).fill(0)
  items.forEach((item, i) => {
    let shortest = 0
    for (let c = 1; c < cols; c++) if (colHeights[c] < colHeights[shortest]) shortest = c
    item.style.left = shortest * (colWidth + s.gap) + 'px'
    item.style.top = colHeights[shortest] + 'px'
    colHeights[shortest] += heights[i] + s.gap
  })
  el.style.position = 'relative'
  el.style.height = Math.max(0, Math.max(...colHeights, s.gap) - s.gap) + 'px'
  el.classList.add('xo-masonry')
  el.dispatchEvent(new CustomEvent('xo:layout', { bubbles: true, detail: { element: el, columns: cols } }))
}

const schedule = (el: HTMLElement, s: State): void => {
  if (s.raf) return
  s.raf = raf(() => {
    s.raf = 0
    layoutNow(el, s)
  })
}

const setup = (el: HTMLElement, options: XOframeMasonryOptions): void => {
  if (instances.has(el)) return
  const s: State = {
    columns: options.columns ?? 'auto',
    minColumnWidth: options.minColumnWidth ?? 260,
    gap: options.gap ?? 16,
    ro: null,
    raf: 0,
    lastWidth: 0,
    // Images without declared dimensions settle their real height on load.
    onLoad: () => schedule(el, s)
  }
  instances.set(el, s)
  el.addEventListener('xo:load', s.onLoad)
  if (typeof ResizeObserver === 'function') {
    s.ro = new ResizeObserver(() => {
      // Setting the container height re-triggers the observer; only a width
      // change warrants a re-layout.
      if (el.clientWidth !== s.lastWidth) schedule(el, s)
    })
    s.ro.observe(el)
  }
  layoutNow(el, s)
}

const resolve = (target?: string | HTMLElement): HTMLElement[] =>
  typeof target === 'string' || target === undefined
    ? ([...document.querySelectorAll<HTMLElement>(target || '[data-xo-masonry]')] as HTMLElement[])
    : [target]

const init = (target?: string | HTMLElement, options: XOframeMasonryOptions = {}): void => {
  if (typeof window === 'undefined') return
  resolve(target).forEach((el) => setup(el, options))
}

/** Force a synchronous re-layout — call after appending items (load more). */
const layout = (target?: string | HTMLElement): void => {
  if (typeof window === 'undefined') return
  resolve(target).forEach((el) => {
    const s = instances.get(el)
    if (s) layoutNow(el, s)
  })
}

const destroy = (target?: string | HTMLElement): void => {
  if (typeof window === 'undefined') return
  resolve(target).forEach((el) => {
    const s = instances.get(el)
    if (!s) return
    s.ro?.disconnect()
    el.removeEventListener('xo:load', s.onLoad)
    el.classList.remove('xo-masonry')
    el.style.position = el.style.height = ''
    for (const item of [...el.children] as HTMLElement[])
      item.style.position = item.style.width = item.style.left = item.style.top = item.style.margin = ''
    instances.delete(el)
  })
}

export const XOframeMasonry = { init, layout, destroy }
export default XOframeMasonry

// Classic <script> auto-init: <script src="xoframe-masonry.min.js" data-xo-auto></script>
if (typeof document !== 'undefined' && document.currentScript?.hasAttribute('data-xo-auto')) {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => init())
  else init()
}

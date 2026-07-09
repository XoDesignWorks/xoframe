/**
 * XOframe skeleton presets — reserve a block's space with an animated
 * placeholder while its content loads, then fade it out. Zero-CLS: the
 * skeleton occupies the same box the real content will.
 * Separate entry (@xodesign/xoframe/skeleton), never part of the core bundle.
 *
 *   <section data-xo-skeleton="cards"></section>
 *   <section data-xo-skeleton="article" data-xo-min-height="480px"></section>
 *
 * The skeleton is removed when: XOframeSkeleton.reveal(el) is called, the
 * container fires xo:visible / xo:reveal (e.g. it is also a data-xo-block or
 * holds data-xo media), or after `autoHide` ms as a safety net.
 */

export interface XOframeSkeletonOptions {
  selector?: string
  /** Safety-net auto-hide in ms (0 disables). Default: 8000. */
  autoHide?: number
}

const STYLE_ID = 'xo-skeleton-style'
const TRACKED = new Map<HTMLElement, HTMLElement>() // container → skeleton node

// Compact preset language: 'l'=line, 'l.6'=60%-width line, 'b:180'=box 180px tall,
// 'c'=avatar circle, 'row[...]'=flex row, 'grid:N[...]'=N-column grid of the cell.
const PRESETS: Record<string, string> = {
  hero: 'b:320|l.5|l.7|l.3',
  cards: 'grid:3[b:160|l.8|l.5]',
  products: 'grid:4[b:200|l.7|l.4]',
  gallery: 'grid:3[b:220]',
  article: 'l.9|l|l|l.8|l|l.6|b:240|l|l.7',
  testimonial: 'row[c|l.4|l.3]|l|l.9|l.6',
  profile: 'row[c|l.5|l.3]|l.8|l.6',
  video: 'b:360',
  map: 'b:400',
  pricing: 'grid:3[b:60|l.6|l|l|l|b:44]',
  'media-text': 'row[b:260|l.8|l|l|l.6|b:44]'
}

const px = (n: number): string => n + 'px'

const injectStyle = (): void => {
  if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return
  const el = document.createElement('style')
  el.id = STYLE_ID
  el.textContent =
    '.xo-skeleton{display:flex;flex-direction:column;gap:12px}' +
    '.xo-skeleton *{--xo-sk-bg:var(--xo-skeleton-color,#e8e8e8)}' +
    '.xo-sk-line,.xo-sk-box,.xo-sk-circle{position:relative;overflow:hidden;background:var(--xo-sk-bg);border-radius:var(--xo-skeleton-radius,8px)}' +
    '.xo-sk-line{height:14px}.xo-sk-circle{width:48px;height:48px;border-radius:50%;flex:0 0 auto}' +
    '.xo-sk-row{display:flex;gap:12px;align-items:center}.xo-sk-col{display:flex;flex-direction:column;gap:12px;flex:1}' +
    '.xo-sk-grid{display:grid;gap:16px;grid-template-columns:repeat(var(--xo-sk-cols,3),1fr)}' +
    '.xo-sk-cell{display:flex;flex-direction:column;gap:10px}' +
    '.xo-skeleton .xo-sk-line::after,.xo-skeleton .xo-sk-box::after,.xo-skeleton .xo-sk-circle::after{' +
    'content:"";position:absolute;inset:0;transform:translateX(-100%);' +
    'background:linear-gradient(90deg,transparent,var(--xo-skeleton-shine,rgba(255,255,255,.55)),transparent);' +
    'animation:xo-sk-shimmer 1.4s infinite}' +
    '@keyframes xo-sk-shimmer{100%{transform:translateX(100%)}}' +
    '.xo-sk-done{opacity:0;transition:opacity var(--xo-duration,300ms) var(--xo-ease,ease);pointer-events:none}' +
    '@media (prefers-reduced-motion:reduce){.xo-skeleton .xo-sk-line::after,.xo-skeleton .xo-sk-box::after,.xo-skeleton .xo-sk-circle::after{animation:none}}'
  document.head.appendChild(el)
}

/** Build one primitive (a token like "l.6" / "b:180" / "c") into a DOM node. */
const primitive = (token: string): HTMLElement => {
  const node = document.createElement('div')
  if (token[0] === 'c') {
    node.className = 'xo-sk-circle'
  } else if (token[0] === 'b') {
    node.className = 'xo-sk-box'
    node.style.height = px(parseInt(token.slice(2), 10) || 160)
  } else {
    node.className = 'xo-sk-line'
    const dot = token.indexOf('.')
    if (dot >= 0) node.style.width = Math.round(parseFloat('0' + token.slice(dot)) * 100) + '%'
  }
  return node
}

/** Render a "|"-separated cell spec (may contain row[...] wrappers). */
const renderCell = (spec: string): DocumentFragment => {
  const frag = document.createDocumentFragment()
  for (const token of splitTop(spec)) {
    if (token.startsWith('row[')) {
      const row = document.createElement('div')
      row.className = 'xo-sk-row'
      const col = document.createElement('div')
      col.className = 'xo-sk-col'
      splitTop(token.slice(4, -1)).forEach((t) =>
        t[0] === 'c' ? row.appendChild(primitive(t)) : col.appendChild(primitive(t))
      )
      row.appendChild(col)
      frag.appendChild(row)
    } else {
      frag.appendChild(primitive(token))
    }
  }
  return frag
}

/** Split on top-level '|', ignoring separators inside [...] groups. */
const splitTop = (spec: string): string[] => {
  const out: string[] = []
  let depth = 0
  let buf = ''
  for (const ch of spec) {
    if (ch === '[') depth++
    else if (ch === ']') depth--
    if (ch === '|' && depth === 0) {
      out.push(buf)
      buf = ''
    } else buf += ch
  }
  if (buf) out.push(buf)
  return out
}

const build = (preset: string): HTMLElement => {
  const root = document.createElement('div')
  root.className = 'xo-skeleton'
  root.setAttribute('aria-hidden', 'true')
  const spec = PRESETS[preset] || PRESETS.article
  const grid = spec.match(/^grid:(\d+)\[(.*)\]$/)
  if (grid) {
    const wrap = document.createElement('div')
    wrap.className = 'xo-sk-grid'
    wrap.style.setProperty('--xo-sk-cols', grid[1])
    for (let i = 0; i < +grid[1] * 2; i++) {
      const cell = document.createElement('div')
      cell.className = 'xo-sk-cell'
      cell.appendChild(renderCell(grid[2]))
      wrap.appendChild(cell)
    }
    root.appendChild(wrap)
  } else {
    root.appendChild(renderCell(spec))
  }
  return root
}

const reveal = (el: Element): void => {
  const sk = TRACKED.get(el as HTMLElement)
  if (!sk) return
  TRACKED.delete(el as HTMLElement)
  sk.classList.add('xo-sk-done')
  const done = (): void => {
    sk.remove()
    ;(el as HTMLElement).style.minHeight = ''
  }
  sk.addEventListener('transitionend', done, { once: true })
  setTimeout(done, 600) // fallback if no transition fires (hidden tab, reduced motion)
}

const mount = (el: HTMLElement, autoHide: number): void => {
  if (TRACKED.has(el) || el.dataset.xoSkeleton === undefined) return
  injectStyle()
  const skeleton = build(el.dataset.xoSkeleton || 'article')
  const minH = el.dataset.xoMinHeight
  if (minH) el.style.minHeight = minH
  el.insertBefore(skeleton, el.firstChild)
  TRACKED.set(el, skeleton)
  if (autoHide > 0) setTimeout(() => reveal(el), autoHide)
}

const onReveal = (e: Event): void => {
  const el = (e.target as HTMLElement)?.closest?.('[data-xo-skeleton]')
  if (el && TRACKED.has(el as HTMLElement)) reveal(el)
}

let bound = false

const init = (selector?: string | XOframeSkeletonOptions, options: XOframeSkeletonOptions = {}): void => {
  if (typeof document === 'undefined') return
  if (typeof selector === 'object') {
    options = selector
    selector = undefined
  }
  const autoHide = options.autoHide ?? 8000
  document
    .querySelectorAll<HTMLElement>((selector as string) || options.selector || '[data-xo-skeleton]')
    .forEach((el) => mount(el, autoHide))
  if (!bound) {
    bound = true
    // Hide the skeleton once the container (or its media/block) is revealed.
    document.addEventListener('xo:visible', onReveal)
    document.addEventListener('xo:reveal', onReveal)
  }
}

const destroy = (): void => {
  TRACKED.forEach((sk, el) => {
    sk.remove()
    el.style.minHeight = ''
  })
  TRACKED.clear()
  document.removeEventListener('xo:visible', onReveal)
  document.removeEventListener('xo:reveal', onReveal)
  bound = false
}

export const XOframeSkeleton = { init, reveal, destroy }
export default XOframeSkeleton

// Classic <script> auto-init: <script src="xoframe-skeleton.min.js" data-xo-auto></script>
if (typeof document !== 'undefined' && document.currentScript?.hasAttribute('data-xo-auto')) {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => init())
  else init()
}

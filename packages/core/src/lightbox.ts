/**
 * XOlightbox — a performance-first lightbox built on the native <dialog>
 * element (free focus trap, Esc, backdrop, aria-modal) and the View Transitions
 * API for a smooth zoom, with a CSS fallback. Zero dependencies, ~2.5 KB — vs.
 * ~50 KB for Fancybox. Part of the XOframe family; separate entry
 * (@xodesign/xoframe/lightbox), never part of the core bundle.
 *
 *   <a href="full-1.jpg" data-xo-lightbox="portfolio"><img src="thumb-1.jpg" alt="One"></a>
 *   <a href="full-2.jpg" data-xo-lightbox="portfolio" data-caption="Two"><img src="thumb-2.jpg"></a>
 *
 * Or straight on an image:
 *   <img data-xo-lightbox data-full="full.jpg" src="thumb.jpg" alt="Caption">
 */

export interface XOlightboxOptions {
  selector?: string
  /** Enable the View Transitions zoom where supported. Default: true. */
  transitions?: boolean
}

interface Item {
  trigger: HTMLElement
  thumb: HTMLImageElement | null
  full: string
  caption: string
}

const STYLE_ID = 'xo-lb-style'
const VT_NAME = 'xo-lb-image'

const groups = new Map<string, Item[]>()
let dialog: HTMLDialogElement | null = null
let img: HTMLImageElement
let captionEl: HTMLElement
let counterEl: HTMLElement
let current: Item[] = []
let index = 0
let useVT = true
let bound = false

const reducedMotion = (): boolean =>
  typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const startVT = (fn: () => void): void => {
  const d = document as any
  if (useVT && !reducedMotion() && typeof d.startViewTransition === 'function') d.startViewTransition(fn)
  else fn()
}

const injectStyle = (): void => {
  if (document.getElementById(STYLE_ID)) return
  const el = document.createElement('style')
  el.id = STYLE_ID
  el.textContent =
    '.xo-lb{padding:0;border:0;background:transparent;max-width:100vw;max-height:100vh;width:100%;height:100%;overflow:hidden}' +
    '.xo-lb::backdrop{background:rgba(0,0,0,.9);backdrop-filter:blur(4px)}' +
    '.xo-lb-stage{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;padding:24px}' +
    '.xo-lb-img{max-width:calc(100vw - 48px);max-height:calc(100vh - 96px);object-fit:contain;border-radius:6px;' +
    'box-shadow:0 12px 48px rgba(0,0,0,.5);view-transition-name:' + VT_NAME + '}' +
    '.xo-lb-cap{position:fixed;left:0;right:0;bottom:16px;text-align:center;color:#fff;font:14px/1.5 system-ui,sans-serif;' +
    'text-shadow:0 1px 6px rgba(0,0,0,.8);padding:0 24px;pointer-events:none}' +
    '.xo-lb-count{position:fixed;top:16px;left:16px;color:#fff;font:13px/1 system-ui,sans-serif;opacity:.8}' +
    '.xo-lb-btn{position:fixed;border:0;background:rgba(0,0,0,.5);color:#fff;cursor:pointer;width:48px;height:48px;' +
    'border-radius:50%;font-size:24px;line-height:1;display:flex;align-items:center;justify-content:center;transition:background .15s}' +
    '.xo-lb-btn:hover{background:rgba(0,0,0,.8)}' +
    '.xo-lb-close{top:16px;right:16px}.xo-lb-prev{left:16px;top:50%;transform:translateY(-50%)}' +
    '.xo-lb-next{right:16px;top:50%;transform:translateY(-50%)}' +
    '.xo-lb[data-single] .xo-lb-prev,.xo-lb[data-single] .xo-lb-next,.xo-lb[data-single] .xo-lb-count{display:none}' +
    '.xo-lb-img.xo-lb-loading{opacity:.4}'
  document.head.appendChild(el)
}

const btn = (cls: string, label: string, html: string, onClick: () => void): HTMLButtonElement => {
  const b = document.createElement('button')
  b.className = 'xo-lb-btn ' + cls
  b.type = 'button'
  b.setAttribute('aria-label', label)
  b.innerHTML = html
  b.addEventListener('click', (e) => {
    e.stopPropagation()
    onClick()
  })
  return b
}

const ensureDialog = (): void => {
  if (dialog) return
  injectStyle()
  dialog = document.createElement('dialog')
  dialog.className = 'xo-lb'
  const stage = document.createElement('div')
  stage.className = 'xo-lb-stage'
  img = document.createElement('img')
  img.className = 'xo-lb-img'
  img.addEventListener('load', () => img.classList.remove('xo-lb-loading'))
  stage.appendChild(img)
  captionEl = document.createElement('figcaption')
  captionEl.className = 'xo-lb-cap'
  counterEl = document.createElement('div')
  counterEl.className = 'xo-lb-count'
  dialog.append(
    stage,
    captionEl,
    counterEl,
    btn('xo-lb-close', 'Close', '&times;', close),
    btn('xo-lb-prev', 'Previous', '&lsaquo;', () => step(-1)),
    btn('xo-lb-next', 'Next', '&rsaquo;', () => step(1))
  )
  // Click on the backdrop/stage (but not the image) closes.
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog || (e.target as HTMLElement).classList.contains('xo-lb-stage')) close()
  })
  dialog.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') step(-1)
    else if (e.key === 'ArrowRight') step(1)
  })
  dialog.addEventListener('close', () => (img.src = ''))
  document.body.appendChild(dialog)
}

const preload = (i: number): void => {
  const item = current[(i + current.length) % current.length]
  if (item) new Image().src = item.full
}

const render = (): void => {
  const item = current[index]
  img.classList.add('xo-lb-loading')
  img.src = item.full
  img.alt = item.caption
  captionEl.textContent = item.caption
  counterEl.textContent = current.length > 1 ? index + 1 + ' / ' + current.length : ''
  if (current.length > 1) {
    preload(index + 1)
    preload(index - 1)
  }
}

const step = (delta: number): void => {
  if (current.length < 2) return
  index = (index + delta + current.length) % current.length
  startVT(render)
}

const open = (items: Item[], start: number): void => {
  ensureDialog()
  current = items
  index = start
  dialog!.toggleAttribute('data-single', items.length < 2)
  render()
  // showModal gives focus trap + Esc for free; guard for very old engines/jsdom.
  try {
    dialog!.showModal()
  } catch {
    dialog!.setAttribute('open', '')
  }
}

const close = (): void => {
  if (!dialog) return
  const done = (): void => {
    try {
      dialog!.close()
    } catch {
      dialog!.removeAttribute('open')
    }
  }
  startVT(done)
}

const fullOf = (el: HTMLElement): string => {
  if (el.tagName === 'A') return (el as HTMLAnchorElement).getAttribute('href') || ''
  const d = el.dataset
  const inner = el.querySelector('img') as HTMLImageElement | null
  return d.full || (inner && (inner.dataset.src || inner.currentSrc || inner.src)) || d.src || ''
}

const collect = (selector: string): void => {
  groups.clear()
  document.querySelectorAll<HTMLElement>(selector).forEach((el) => {
    const key = el.dataset.xoLightbox || ''
    const thumb = (el.tagName === 'IMG' ? el : el.querySelector('img')) as HTMLImageElement | null
    const item: Item = {
      trigger: el,
      thumb,
      full: fullOf(el),
      caption: el.dataset.caption || thumb?.alt || ''
    }
    if (!item.full) return
    const list = groups.get(key) || []
    list.push(item)
    groups.set(key, list)
    if (el.dataset.xoLbBound === undefined) {
      el.dataset.xoLbBound = '1'
      el.addEventListener('click', (e) => {
        e.preventDefault()
        const g = groups.get(key)!
        open(g, g.indexOf(item))
      })
    }
  })
}

const init = (selector?: string | XOlightboxOptions, options: XOlightboxOptions = {}): void => {
  if (typeof document === 'undefined') return
  if (typeof selector === 'object') {
    options = selector
    selector = undefined
  }
  useVT = options.transitions !== false
  collect((selector as string) || options.selector || '[data-xo-lightbox]')
  if (!bound) {
    bound = true
    // Re-scan is cheap and idempotent; expose for dynamic galleries.
  }
}

const destroy = (): void => {
  dialog?.remove()
  dialog = null
  groups.clear()
  document.getElementById(STYLE_ID)?.remove()
}

export const XOlightbox = { init, refresh: init, close, destroy }
export default XOlightbox

// Classic <script> auto-init: <script src="xoframe-lightbox.min.js" data-xo-auto></script>
if (typeof document !== 'undefined' && document.currentScript?.hasAttribute('data-xo-auto')) {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => init())
  else init()
}

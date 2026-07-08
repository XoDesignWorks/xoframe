/**
 * XOframe core — zero-CLS progressive media loading.
 * Native browser features first, tiny JavaScript only where needed.
 */

export interface XOframeCallbacks {
  /** Called right before src/srcset is applied. */
  onBeforeLoad?: (element: Element) => void
  /** Called after the media has finished loading. */
  onLoad?: (element: Element) => void
  /** Called when the media failed to load. */
  onError?: (element: Element, error?: unknown) => void
  /** Called when the element is revealed (fade-in starts). */
  onReveal?: (element: Element) => void
  /** Called when a content block enters the viewport. */
  onVisible?: (element: Element) => void
}

export interface XOframeOptions extends XOframeCallbacks {
  /** Alias for imageSelector. */
  selector?: string
  imageSelector?: string
  bgSelector?: string
  blockSelector?: string
  /** Root margin for media loading. Default: '300px'. */
  rootMargin?: string
  /** Root margin for block reveal. Default: '0px'. */
  blockRootMargin?: string
  threshold?: number
  /** Fade-in reveal. Default: true. */
  fade?: boolean
  /** Don't lazy-load the first large above-the-fold image. Default: true. */
  lcpAware?: boolean
  /** Add loading="lazy" to native-src images. Default: true. */
  nativeLazy?: boolean
  /** Log warnings for elements that may cause CLS. Default: false. */
  debug?: boolean
  /**
   * Zero-markup mode: also manage plain <img> tags without data attributes —
   * fix wrongly lazy-loaded LCP images, add native lazy loading below the fold,
   * reveal classes and events. Default: false.
   */
  auto?: boolean
  /**
   * Adapt to Save-Data and slow connections: disable fade and load media only
   * when it actually enters the viewport. Default: true.
   */
  networkAware?: boolean
  /** Scope for element scanning. Default: document. */
  root?: Document | Element
}

type Settings = Required<
  Omit<XOframeOptions, keyof XOframeCallbacks | 'selector' | 'root'>
> &
  XOframeCallbacks & { root: Document | Element }

const DEFAULTS = {
  imageSelector: '[data-xo]',
  bgSelector: '[data-xo-bg]',
  blockSelector: '[data-xo-block]',
  rootMargin: '300px',
  blockRootMargin: '0px',
  threshold: 0.01,
  fade: true,
  lcpAware: true,
  nativeLazy: true,
  debug: false,
  auto: false,
  networkAware: true
}

const PREPARED = new WeakSet<Element>()
const STATE = new WeakMap<Element, 1 | 2 | 3>() // 1 loading, 2 loaded, 3 error

let settings: Settings | null = null
let mediaObserver: IntersectionObserver | null = null
let blockObserver: IntersectionObserver | null = null
let pending = new Set<Element>()
let paused = false
let lcpClaimed = false

const emit = (el: Element, name: string, detail?: Record<string, unknown>): void => {
  el.dispatchEvent(
    new CustomEvent('xo:' + name, { bubbles: true, detail: { element: el, ...detail } })
  )
}

const warn = (msg: string, el: Element): void => {
  if (settings!.debug) console.warn('[XOframe] ' + msg, el)
}

const isImg = (el: Element): el is HTMLImageElement => el.tagName === 'IMG'

/** Structural view over <img>/<iframe>/<video> — only the members the loader touches. */
interface MediaEl extends HTMLElement {
  src: string
  srcset?: string
  sizes?: string
  poster?: string
  loading?: string
  decoding?: string
  complete?: boolean
  naturalWidth?: number
  decode?: () => Promise<void>
  load?: () => void
}

/** The element that actually loads: the img inside <picture data-xo>, else the node itself. */
const targetMedia = (el: Element): MediaEl | null => {
  const t = el.tagName
  return t === 'IMG' || t === 'IFRAME' || t === 'VIDEO'
    ? (el as MediaEl)
    : (el.querySelector('img') as MediaEl | null)
}

const kindOf = (el: Element): 'bg' | 'block' | 'img' =>
  el.hasAttribute('data-xo-bg') ? 'bg' : el.hasAttribute('data-xo-block') ? 'block' : 'img'

const CORNERS = ['0 0', '100% 0', '100% 100%', '0 100%'] // TL, TR, BR, BL

const applyPlaceholder = (el: Element, box: HTMLElement): void => {
  const d = (el as HTMLElement).dataset
  if (d.ratio) box.style.setProperty('aspect-ratio', d.ratio.replace(':', '/'))
  // 4-corner gradient: blur-like preview from ~30 bytes of markup, no decoder.
  const colors = d.gradient && d.gradient.split(',')
  if (colors)
    box.style.backgroundImage = colors
      .slice(0, 4)
      .map((c, i) => `radial-gradient(at ${CORNERS[i]}, ${c.trim()}, transparent 75%)`)
      .join(',')
  const base = (colors && colors[0]) || d.color
  if (base) {
    box.style.backgroundColor = base.trim()
    el.classList.add('xo-placeholder')
  }
}

const prepare = (el: Element): void => {
  if (PREPARED.has(el)) return
  PREPARED.add(el)
  el.classList.add('xo')
  if (!settings!.fade) (el as HTMLElement).style.setProperty('--xo-duration', '0ms')

  const kind = kindOf(el)
  if (kind === 'block') {
    el.classList.add('xo-block')
    return
  }
  if (kind === 'bg') {
    el.classList.add('xo-bg', 'xo-loading')
    applyPlaceholder(el, el as HTMLElement)
    return
  }
  const media = targetMedia(el)
  if (!media) return
  if (media.tagName === 'IMG') media.decoding = 'async'
  applyPlaceholder(el, media)
  el.classList.add('xo-loading')
  // A visible placeholder (LQIP src, or a video poster) must never be hidden pre-load.
  if (media.getAttribute('src') || media.getAttribute('poster') || media.dataset.poster)
    el.classList.add('xo-lqip')
  if (!media.getAttribute('width') && !(el as HTMLElement).dataset.ratio && !media.style.aspectRatio)
    warn('missing width/height or data-ratio — this element may cause layout shift', el)
}

const finish = (el: Element, ok: boolean, error?: unknown): void => {
  STATE.set(el, ok ? 2 : 3)
  el.classList.remove('xo-loading')
  el.classList.add(ok ? 'xo-loaded' : 'xo-error')
  if (ok) {
    emit(el, 'load')
    settings!.onLoad?.(el)
    emit(el, 'reveal')
    settings!.onReveal?.(el)
  } else {
    emit(el, 'error', { error })
    settings!.onError?.(el, error)
  }
}

const loadElement = (el: Element): void => {
  const kind = kindOf(el)
  if (kind === 'block') return revealBlock(el)
  if (STATE.has(el)) return
  STATE.set(el, 1)
  unobserve(el)
  emit(el, 'beforeload')
  settings!.onBeforeLoad?.(el)

  const d = (el as HTMLElement).dataset
  if (kind === 'bg') {
    const url = d.bg
    if (!url) return finish(el, false)
    const pre = new Image()
    pre.onload = () => {
      ;(el as HTMLElement).style.backgroundImage = `url("${url}")`
      finish(el, true)
    }
    pre.onerror = (e) => finish(el, false, e)
    pre.src = url
    return
  }

  const media = targetMedia(el)
  if (!media) return
  const id = media.dataset
  const swap = id.src || id.srcset || id.poster
  if (swap || !media.complete) {
    media.addEventListener(
      media.tagName === 'VIDEO' ? 'loadeddata' : 'load',
      () => {
        // decode() off the paint path so revealing a large image never janks —
        // but only as a best effort: in hidden/background tabs Chrome defers
        // decoding indefinitely, so a timeout race guarantees the reveal.
        // (iframe/video have no decode() and fall straight through.)
        let revealed = false
        const done = (): void => {
          if (!revealed) {
            revealed = true
            finish(el, true)
          }
        }
        if (media.decode) {
          media.decode().then(done, done)
          setTimeout(done, 250)
        } else done()
      },
      { once: true }
    )
    media.addEventListener('error', (e) => finish(el, false, e), { once: true })
  }
  // Promote deferred <source> children (<picture> srcset, <video> src) first.
  if (!isImg(el))
    el.querySelectorAll('source').forEach((s) => {
      if (s.dataset.srcset) s.srcset = s.dataset.srcset
      if (s.dataset.src) s.src = s.dataset.src
    })
  // data-sizes="auto": compute the sizes attribute from the actual layout width.
  if (id.sizes === 'auto')
    media.sizes = (media.clientWidth || el.clientWidth || innerWidth) + 'px'
  else if (id.sizes) media.sizes = id.sizes
  if (id.poster) media.poster = id.poster
  if (id.srcset) media.srcset = id.srcset
  if (id.src) media.src = id.src
  // <video> with promoted <source> children needs an explicit load() to re-scan them.
  else if (media.tagName === 'VIDEO') media.load?.()
  // Native-src image that is already complete: just reveal it.
  if (!swap && media.complete) finish(el, !!media.naturalWidth)
}

const revealBlock = (el: Element): void => {
  if (STATE.has(el)) return
  STATE.set(el, 2)
  unobserve(el)
  el.classList.add('xo-visible', 'is-xo-visible')
  emit(el, 'visible')
  settings!.onVisible?.(el)
}

const onIntersect: IntersectionObserverCallback = (entries) => {
  for (const e of entries) if (e.isIntersecting) loadElement(e.target)
}

const observe = (el: Element): void => {
  if (!settings || STATE.has(el)) return
  prepare(el)
  pending.add(el)
  if (paused) return
  const io = kindOf(el) === 'block' ? blockObserver : mediaObserver
  if (io) io.observe(el)
  else loadElement(el) // no IntersectionObserver: load immediately
}

const unobserve = (el: Element): void => {
  pending.delete(el)
  mediaObserver?.unobserve(el)
  blockObserver?.unobserve(el)
}

/** Above the fold and large enough to be an LCP candidate. */
const isLcpCandidate = (img: HTMLImageElement): boolean => {
  const r = img.getBoundingClientRect()
  const w = r.width || +img.getAttribute('width')! || 0
  const h = r.height || +img.getAttribute('height')! || 0
  return r.top < innerHeight && r.bottom > -h && w * h >= innerWidth * innerHeight * 0.1
}

const route = (el: Element): void => {
  prepare(el)
  if (STATE.has(el)) return
  const kind = kindOf(el)
  const d = (el as HTMLElement).dataset
  if (d.xoStrategy === 'manual') return
  // intent: load on the first sign of user interest (hover/focus/touch).
  if (d.xoStrategy === 'intent') {
    const go = (): void => loadElement(el)
    el.addEventListener('pointerenter', go, { once: true })
    el.addEventListener('focusin', go, { once: true })
    el.addEventListener('touchstart', go, { once: true, passive: true })
    return
  }

  if (kind === 'img') {
    const media = targetMedia(el)
    if (!media) return
    const eager =
      d.xoPriority === 'high' ||
      d.xoStrategy === 'hero' ||
      media.getAttribute('fetchpriority') === 'high' ||
      (settings!.lcpAware && !lcpClaimed && isLcpCandidate(media as HTMLImageElement))
    // An explicit pause() wins even over LCP priority — the element is queued instead.
    if (eager && !paused) {
      lcpClaimed = true
      media.loading = 'eager'
      media.setAttribute('fetchpriority', 'high')
      loadElement(el)
      return
    }
    // Native lazy hint for img/iframe that keep their real src.
    if (settings!.nativeLazy && media.tagName !== 'VIDEO' && !media.dataset.src && !media.dataset.srcset)
      media.loading = 'lazy'
  }
  observe(el)
}

const scan = (root: Document | Element): void => {
  const s = settings!
  let sel = `${s.imageSelector},${s.bgSelector},${s.blockSelector}`
  if (s.auto) sel += ',img:not([data-xo],[data-xo-skip],[data-xo] img)'
  root.querySelectorAll(sel).forEach(route)
}

const init = (options: XOframeOptions = {}): void => {
  if (typeof window === 'undefined') return
  if (settings) destroy()
  settings = { ...DEFAULTS, ...options, root: options.root || document } as Settings
  if (options.selector) settings.imageSelector = options.selector
  const conn =
    settings.networkAware &&
    (navigator as { connection?: { saveData?: boolean; effectiveType?: string } }).connection
  if (conn && (conn.saveData || /2g/.test(conn.effectiveType || ''))) {
    settings.rootMargin = '0px'
    settings.fade = false
  }
  if ('IntersectionObserver' in window) {
    mediaObserver = new IntersectionObserver(onIntersect, {
      rootMargin: settings.rootMargin,
      threshold: settings.threshold
    })
    blockObserver = new IntersectionObserver(onIntersect, {
      rootMargin: settings.blockRootMargin,
      threshold: settings.threshold
    })
  }
  scan(settings.root)
}

const refresh = (): void => {
  if (settings) scan(settings.root)
}

/** Zero-markup shorthand: manage every <img> on the page without data attributes. */
const auto = (options: XOframeOptions = {}): void => init({ ...options, auto: true })

const load = (element: Element): void => {
  if (!settings) return
  prepare(element)
  loadElement(element)
}

const loadAll = (): void => {
  pending.forEach(loadElement)
}

const loadInside = (container: Element | string): void => {
  const root =
    typeof container === 'string' ? document.querySelector(container) : container
  if (!root || !settings) return
  scan(root)
  const sel = `${settings.imageSelector},${settings.bgSelector},${settings.blockSelector}`
  root.querySelectorAll(sel).forEach(loadElement)
}

const pause = (): void => {
  paused = true
  mediaObserver?.disconnect()
  blockObserver?.disconnect()
}

const resume = (): void => {
  if (!paused) return
  paused = false
  ;[...pending].forEach(observe)
}

const destroy = (): void => {
  mediaObserver?.disconnect()
  blockObserver?.disconnect()
  mediaObserver = blockObserver = settings = null
  pending = new Set()
  paused = lcpClaimed = false
}

export const XOframe = {
  init,
  auto,
  refresh,
  load,
  loadAll,
  loadInside,
  observe,
  unobserve,
  pause,
  resume,
  destroy
}

export default XOframe

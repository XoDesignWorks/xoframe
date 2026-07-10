/**
 * XOframe background video — autoplay a muted video only while it's on screen,
 * and pause it when scrolled away. Saves CPU, battery and main-thread work
 * (better INP) versus a video that plays the whole time. Lazily applies
 * `data-src`/`data-poster` on first view too.
 * Separate entry (@xodesign/xoframe/video), never part of the core bundle.
 *
 *   <video data-xo-video muted loop playsinline
 *          poster="poster.jpg" data-src="clip.mp4"></video>
 */

export interface XOframeVideoOptions {
  selector?: string
  /** Visibility ratio to start playback. Default: 0.25. */
  threshold?: number
  /** Don't autoplay when the user prefers reduced motion. Default: true. */
  respectReducedMotion?: boolean
}

const TRACKED = new Set<HTMLVideoElement>()
let observer: IntersectionObserver | null = null

const reducedMotion = (): boolean =>
  typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

const play = (v: HTMLVideoElement): void => {
  try {
    const p = v.play?.()
    if (p && typeof (p as Promise<void>).catch === 'function') (p as Promise<void>).catch(() => {})
  } catch {
    /* autoplay blocked or unsupported — ignore */
  }
}

/** Promote deferred sources on first view. */
const hydrate = (v: HTMLVideoElement): void => {
  const d = v.dataset
  if (d.poster && !v.poster) v.poster = d.poster
  if (d.src && !v.getAttribute('src')) {
    v.src = d.src
    v.load?.()
  }
}

const enter = (v: HTMLVideoElement): void => {
  hydrate(v)
  if (!(TRACKED_OPTS.respectReducedMotion && reducedMotion())) {
    play(v)
    v.classList.add('xo-video-playing')
  }
}

const leave = (v: HTMLVideoElement): void => {
  v.pause?.()
  v.classList.remove('xo-video-playing')
}

let TRACKED_OPTS: Required<Omit<XOframeVideoOptions, 'selector'>> = {
  threshold: 0.25,
  respectReducedMotion: true
}

const onIntersect: IntersectionObserverCallback = (entries) => {
  for (const e of entries) (e.isIntersecting ? enter : leave)(e.target as HTMLVideoElement)
}

const init = (selector?: string | XOframeVideoOptions, options: XOframeVideoOptions = {}): void => {
  if (typeof document === 'undefined') return
  if (typeof selector === 'object') {
    options = selector
    selector = undefined
  }
  TRACKED_OPTS = {
    threshold: options.threshold ?? 0.25,
    respectReducedMotion: options.respectReducedMotion !== false
  }
  const videos = document.querySelectorAll<HTMLVideoElement>(
    (selector as string) || options.selector || '[data-xo-video]'
  )
  const hasIO = typeof IntersectionObserver !== 'undefined'
  if (hasIO && !observer)
    observer = new IntersectionObserver(onIntersect, { threshold: TRACKED_OPTS.threshold })
  videos.forEach((v) => {
    TRACKED.add(v)
    // No IntersectionObserver: hydrate and best-effort autoplay immediately.
    if (observer) observer.observe(v)
    else enter(v)
  })
}

const destroy = (): void => {
  observer?.disconnect()
  observer = null
  TRACKED.forEach(leave)
  TRACKED.clear()
}

export const XOframeVideo = { init, refresh: init, destroy }
export default XOframeVideo

// Classic <script> auto-init: <script src="xoframe-video.min.js" data-xo-auto></script>
if (typeof document !== 'undefined' && document.currentScript?.hasAttribute('data-xo-auto')) {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => init())
  else init()
}

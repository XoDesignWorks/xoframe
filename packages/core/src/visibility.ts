/**
 * XOframe content-visibility manager — skip rendering work for off-screen
 * blocks with `content-visibility: auto`, while reserving their height with
 * `contain-intrinsic-size` so the scrollbar and layout stay stable (zero CLS).
 * Separate entry (@xodesign/xoframe/visibility), never part of the core bundle.
 *
 *   <section data-xo-visibility data-xo-intrinsic-size="800px">…</section>
 *   <section data-xo-visibility="auto" data-xo-intrinsic-size="600 900">…</section>
 *
 * Feature-detected: on browsers without content-visibility it is a safe no-op.
 * Critical/above-the-fold blocks should simply not carry the attribute.
 */

export interface XOframeVisibilityOptions {
  selector?: string
  /** Fallback intrinsic size when data-xo-intrinsic-size is absent. Default: '0 500px'. */
  defaultIntrinsicSize?: string
  /** Warn when a reserved height is far from the rendered height. Default: false. */
  debug?: boolean
}

const TRACKED = new Set<HTMLElement>()

const supported = (): boolean =>
  typeof document !== 'undefined' && 'contentVisibility' in document.documentElement.style

const apply = (el: HTMLElement, fallback: string, debug: boolean): void => {
  if (TRACKED.has(el)) return
  const mode = el.dataset.xoVisibility || 'auto'
  if (mode === 'off' || mode === 'visible') return
  TRACKED.add(el)

  const size = el.dataset.xoIntrinsicSize || fallback
  // A bare number/one value → apply to both axes via the height keyword form.
  el.style.setProperty('contain-intrinsic-size', /\s/.test(size) ? size : 'auto ' + size)
  el.style.setProperty('content-visibility', mode)

  if (debug) {
    // After first paint, compare the reserved height with reality.
    requestAnimationFrame(() => {
      const reserved = parseFloat((el.dataset.xoIntrinsicSize || fallback).split(/\s+/).pop() || '0')
      const actual = el.getBoundingClientRect().height
      if (reserved && actual && (actual > reserved * 2 || actual < reserved / 2))
        console.warn(
          `[XOframe visibility] intrinsic-size ${reserved}px is far from rendered ${Math.round(actual)}px — expect scrollbar jitter`,
          el
        )
    })
  }
}

const init = (
  selector?: string | XOframeVisibilityOptions,
  options: XOframeVisibilityOptions = {}
): void => {
  if (!supported()) return
  if (typeof selector === 'object') {
    options = selector
    selector = undefined
  }
  const fallback = options.defaultIntrinsicSize || '0 500px'
  document
    .querySelectorAll<HTMLElement>((selector as string) || options.selector || '[data-xo-visibility]')
    .forEach((el) => apply(el, fallback, !!options.debug))
}

const destroy = (): void => {
  TRACKED.forEach((el) => {
    el.style.removeProperty('content-visibility')
    el.style.removeProperty('contain-intrinsic-size')
  })
  TRACKED.clear()
}

export const XOframeVisibility = { init, refresh: init, destroy }
export default XOframeVisibility

// Classic <script> auto-init: <script src="xoframe-visibility.min.js" data-xo-auto></script>
if (typeof document !== 'undefined' && document.currentScript?.hasAttribute('data-xo-auto')) {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => init())
  else init()
}

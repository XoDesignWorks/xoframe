/**
 * XOframe ThumbHash placeholders.
 * A ThumbHash is ~28 bytes of base64 that decodes to a blurred preview with
 * alpha support. This module renders it as a background image (pure JS PNG
 * encoding via the reference `thumbhash` implementation — no canvas) so the
 * preview shows instantly while XOframe core loads the real image over it.
 *
 *   <img data-xo data-src="image.jpg" data-thumbhash="3OcRJYB4d3h/iIeHeEh3eIhw+j3A"
 *        width="1200" height="800" alt="">
 */
import { thumbHashToDataURL } from 'thumbhash'

export interface XOframeThumbhashOptions {
  selector?: string
  /** Clear the decoded placeholder N ms after the real image loads. Default: 600. */
  cleanupDelay?: number
}

const DONE = new WeakSet<Element>()

const base64ToBytes = (value: string): Uint8Array =>
  Uint8Array.from(atob(value), (c) => c.charCodeAt(0))

const boxOf = (el: HTMLElement): HTMLElement =>
  el.tagName === 'PICTURE' ? (el.querySelector('img') as HTMLElement) || el : el

const apply = (el: HTMLElement): void => {
  if (DONE.has(el) || !el.dataset.thumbhash) return
  DONE.add(el)
  try {
    const url = thumbHashToDataURL(base64ToBytes(el.dataset.thumbhash))
    const box = boxOf(el)
    box.style.backgroundImage = `url("${url}")`
    box.style.backgroundSize = 'cover'
    // xo-placeholder tells the core CSS to keep the element visible pre-load.
    el.classList.add('xo-placeholder', 'xo-thumbhash')
  } catch {
    /* invalid hash — core falls back to data-color / data-gradient */
  }
}

let cleanupBound = false

const init = (options: XOframeThumbhashOptions = {}): void => {
  if (typeof document === 'undefined') return
  document
    .querySelectorAll<HTMLElement>(options.selector || '[data-thumbhash]')
    .forEach(apply)
  if (!cleanupBound) {
    cleanupBound = true
    // Free the data URL once the real image has faded in.
    document.addEventListener('xo:load', (e) => {
      const el = (e as CustomEvent<{ element: HTMLElement }>).detail.element
      if (el.classList?.contains('xo-thumbhash'))
        setTimeout(() => (boxOf(el).style.backgroundImage = ''), options.cleanupDelay ?? 600)
    })
  }
}

export const XOframeThumbhash = { init, refresh: init }
export default XOframeThumbhash

// Classic <script> auto-init: <script src="xoframe-thumbhash.min.js" data-xo-auto></script>
if (typeof document !== 'undefined' && document.currentScript?.hasAttribute('data-xo-auto')) {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => init())
  else init()
}

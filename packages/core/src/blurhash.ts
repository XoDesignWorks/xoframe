/**
 * XOframe BlurHash placeholders.
 * Decodes a BlurHash string into a small blurred preview and shows it as a
 * background image while XOframe core loads the real image over it.
 * Rendering uses a canvas (allowed here — this module is opt-in and never
 * part of the core bundle).
 *
 *   <img data-xo data-src="image.jpg" data-blurhash="LEHV6nWB2yk8pyo0adR*.7kCMdnj"
 *        width="1200" height="800" alt="">
 */
import { decode } from 'blurhash'

export interface XOframeBlurhashOptions {
  selector?: string
  /** Decode resolution (both axes). Default: 32. */
  resolution?: number
  /** BlurHash punch (contrast). Default: 1. */
  punch?: number
  /** Clear the decoded placeholder N ms after the real image loads. Default: 600. */
  cleanupDelay?: number
}

const DONE = new WeakSet<Element>()

const boxOf = (el: HTMLElement): HTMLElement =>
  el.tagName === 'PICTURE' ? (el.querySelector('img') as HTMLElement) || el : el

const toDataURL = (hash: string, size: number, punch: number): string => {
  const pixels = decode(hash, size, size, punch)
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''
  const image = ctx.createImageData(size, size)
  image.data.set(pixels)
  ctx.putImageData(image, 0, 0)
  return canvas.toDataURL()
}

const apply = (el: HTMLElement, size: number, punch: number): void => {
  if (DONE.has(el) || !el.dataset.blurhash) return
  DONE.add(el)
  try {
    const url = toDataURL(el.dataset.blurhash, size, punch)
    if (!url) return
    const box = boxOf(el)
    box.style.backgroundImage = `url("${url}")`
    box.style.backgroundSize = 'cover'
    // xo-placeholder tells the core CSS to keep the element visible pre-load.
    el.classList.add('xo-placeholder', 'xo-blurhash')
  } catch {
    /* invalid hash — core falls back to data-color / data-gradient */
  }
}

let cleanupBound = false

const init = (options: XOframeBlurhashOptions = {}): void => {
  if (typeof document === 'undefined') return
  const size = options.resolution ?? 32
  const punch = options.punch ?? 1
  document
    .querySelectorAll<HTMLElement>(options.selector || '[data-blurhash]')
    .forEach((el) => apply(el, size, punch))
  if (!cleanupBound) {
    cleanupBound = true
    document.addEventListener('xo:load', (e) => {
      const el = (e as CustomEvent<{ element: HTMLElement }>).detail.element
      if (el.classList?.contains('xo-blurhash'))
        setTimeout(() => (boxOf(el).style.backgroundImage = ''), options.cleanupDelay ?? 600)
    })
  }
}

export const XOframeBlurhash = { init, refresh: init }
export default XOframeBlurhash

// Classic <script> auto-init: <script src="xoframe-blurhash.min.js" data-xo-auto></script>
if (typeof document !== 'undefined' && document.currentScript?.hasAttribute('data-xo-auto')) {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => init())
  else init()
}

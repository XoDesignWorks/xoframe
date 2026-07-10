/**
 * @deprecated Superseded by `@xodesign/xoframe/carousel` (XOcarousel), which
 * adds a vertical axis, mouse drag, a WCAG 2.2.2 pause control and screen-reader
 * announcements. This shim keeps `XOslider` working for 0.11.x users: it is the
 * carousel, defaulting to the old `[data-xo-slider]` selector.
 *
 * Note the CSS class names changed (`.xo-slider-*` → `.xo-car-*`).
 */
import { XOcarousel } from './carousel'
import type { XOcarouselInstance, XOcarouselOptions } from './carousel'

export type XOsliderOptions = XOcarouselOptions
export type XOsliderInstance = XOcarouselInstance

const init = (
  selector?: string | XOcarouselOptions,
  options: XOcarouselOptions = {}
): XOcarouselInstance[] => {
  if (typeof selector === 'object') {
    options = selector
    selector = undefined
  }
  return XOcarousel.init((selector as string) || options.selector || '[data-xo-slider]', options)
}

export const XOslider = { init, destroy: XOcarousel.destroy }
export default XOslider

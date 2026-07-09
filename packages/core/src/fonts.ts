/**
 * XOframe font stability — web fonts are the #2 cause of CLS after images.
 * When a web font swaps in with different metrics than the fallback, text
 * reflows. This module registers a metric-adjusted fallback `@font-face`
 * (size-adjust + optional ascent/descent overrides) so the fallback occupies
 * the same space as the web font — the swap shifts nothing. It also preloads
 * fonts and flags `document.documentElement` with a class once fonts are ready.
 * Separate entry (@xodesign/xoframe/fonts), never part of the core bundle.
 *
 *   XOframeFonts.init({
 *     fonts: [{
 *       family: 'Inter',
 *       fallback: 'Arial, sans-serif',
 *       selector: 'body',
 *       preload: '/fonts/inter.woff2',
 *       // precomputed metrics → zero shift (from a tool like Fontaine); else measured:
 *       sizeAdjust: '107%', ascentOverride: '90%', descentOverride: '22%'
 *     }]
 *   })
 */

export interface XOframeFont {
  /** Web font family name as used in @font-face. */
  family: string
  /** Fallback stack. Default: 'sans-serif'. The first family is the local() source. */
  fallback?: string
  /** CSS selector to apply the adjusted stack to (e.g. 'body'). Optional. */
  selector?: string
  /** Font file URL to <link rel="preload" as="font">. Optional. */
  preload?: string
  /** Precomputed metric overrides — supply for pixel-perfect zero-CLS. */
  sizeAdjust?: string
  ascentOverride?: string
  descentOverride?: string
  lineGapOverride?: string
}

export interface XOframeFontsOptions {
  fonts?: XOframeFont[]
  /** Class added to <html> once all fonts are ready. Default: 'xo-fonts-loaded'. */
  loadedClass?: string
}

const STYLE_ID = 'xo-fonts-style'

const styleSheet = (): HTMLStyleElement => {
  let el = document.getElementById(STYLE_ID) as HTMLStyleElement | null
  if (!el) {
    el = document.createElement('style')
    el.id = STYLE_ID
    document.head.appendChild(el)
  }
  return el
}

const firstFamily = (stack: string): string =>
  (stack.split(',')[0] || 'sans-serif').trim().replace(/^["']|["']$/g, '')

/** Average glyph width of a family at a fixed size, or 0 if unmeasurable. */
const measureWidth = (family: string): number => {
  if (!document.body) return 0
  const span = document.createElement('span')
  span.textContent = 'wwwwMMMMiiiilloo AaBbYyGgjpq 0123456789'
  span.style.cssText =
    'position:absolute;left:-9999px;top:-9999px;font-size:100px;white-space:nowrap;font-family:' +
    family
  document.body.appendChild(span)
  const w = span.offsetWidth
  span.remove()
  return w
}

const preloadFont = (url: string): void => {
  if (document.querySelector(`link[rel="preload"][href="${url}"]`)) return
  const link = document.createElement('link')
  link.setAttribute('rel', 'preload')
  link.setAttribute('as', 'font')
  link.setAttribute('href', url)
  link.setAttribute('crossorigin', 'anonymous')
  if (/\.woff2?($|\?)/.test(url)) link.setAttribute('type', 'font/' + (/\.woff2/.test(url) ? 'woff2' : 'woff'))
  document.head.appendChild(link)
}

const registerFont = (font: XOframeFont): void => {
  const fallback = font.fallback || 'sans-serif'
  const local = firstFamily(fallback)
  const adjustedName = font.family + ' fallback'

  // Width-based size-adjust: precomputed if given, else measured at runtime.
  let sizeAdjust = font.sizeAdjust
  if (!sizeAdjust) {
    const web = measureWidth(`"${font.family}",${local}`)
    const base = measureWidth(local)
    if (web && base) sizeAdjust = Math.round((web / base) * 1000) / 10 + '%'
  }

  const decls = [`font-family:"${adjustedName}"`, `src:local("${local}")`]
  if (sizeAdjust) decls.push('size-adjust:' + sizeAdjust)
  if (font.ascentOverride) decls.push('ascent-override:' + font.ascentOverride)
  if (font.descentOverride) decls.push('descent-override:' + font.descentOverride)
  if (font.lineGapOverride) decls.push('line-gap-override:' + font.lineGapOverride)

  let css = `@font-face{${decls.join(';')}}`
  if (font.selector)
    css += `${font.selector}{font-family:"${font.family}","${adjustedName}",${fallback}}`
  styleSheet().appendChild(document.createTextNode(css))

  if (font.preload) preloadFont(font.preload)
}

const init = (options: XOframeFontsOptions = {}): void => {
  if (typeof document === 'undefined') return
  ;(options.fonts || []).forEach(registerFont)

  const loadedClass = options.loadedClass || 'xo-fonts-loaded'
  const fontset = (document as Document & { fonts?: { ready?: Promise<unknown> } }).fonts
  const flag = (): void => document.documentElement.classList.add(loadedClass)
  if (fontset?.ready) fontset.ready.then(flag, flag)
  else flag()
}

const destroy = (): void => {
  document.getElementById(STYLE_ID)?.remove()
}

export const XOframeFonts = { init, destroy }
export default XOframeFonts

// Classic <script> auto-init is intentionally omitted: fonts need a config.

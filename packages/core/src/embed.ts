/**
 * XOframe embed facades — the biggest byte win on media-heavy pages.
 * A YouTube embed costs ~1 MB of JavaScript before the user ever presses play.
 * A facade shows the poster + a play button (a few KB), and injects the real
 * iframe only on click. Separate file, never part of the core bundle.
 *
 *   <div data-xo-embed="youtube" data-video="aqz-KE-bpKQ" data-title="Big Buck Bunny"></div>
 *   <div data-xo-embed="vimeo" data-video="76979871" data-poster="poster.jpg"></div>
 *   <div data-xo-embed data-embed-src="https://example.com/embed" data-poster="poster.jpg"></div>
 */

export interface XOframeEmbedOptions {
  selector?: string
}

interface Provider {
  url: (id: string) => string
  poster?: (id: string) => string
  /** Origins to preconnect to on first hover/focus. */
  origins: string[]
}

const PROVIDERS: Record<string, Provider> = {
  youtube: {
    url: (id) => `https://www.youtube-nocookie.com/embed/${id}?autoplay=1`,
    poster: (id) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    origins: ['https://www.youtube-nocookie.com', 'https://i.ytimg.com', 'https://www.google.com']
  },
  vimeo: {
    url: (id) => `https://player.vimeo.com/video/${id}?autoplay=1`,
    origins: ['https://player.vimeo.com', 'https://i.vimeocdn.com']
  }
}

const PREPARED = new WeakSet<Element>()
const preconnected = new Set<string>()

const preconnect = (origins: string[]): void => {
  for (const origin of origins) {
    if (preconnected.has(origin)) continue
    preconnected.add(origin)
    const link = document.createElement('link')
    link.rel = 'preconnect'
    link.href = origin
    link.crossOrigin = ''
    document.head.appendChild(link)
  }
}

const activate = (el: HTMLElement, src: string, title: string): void => {
  const iframe = document.createElement('iframe')
  iframe.src = src
  iframe.title = title
  iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'
  iframe.allowFullscreen = true
  iframe.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;border:0'
  el.textContent = ''
  el.appendChild(iframe)
  el.classList.add('xo-embed-active')
  el.removeAttribute('role')
  el.removeAttribute('tabindex')
  el.dispatchEvent(new CustomEvent('xo:embed', { bubbles: true, detail: { element: el, src } }))
}

const facade = (el: HTMLElement): void => {
  if (PREPARED.has(el)) return
  PREPARED.add(el)

  const d = el.dataset
  const provider = PROVIDERS[d.xoEmbed || '']
  const videoId = d.video || ''
  const src = d.embedSrc || (provider && videoId ? provider.url(videoId) : '')
  if (!src) return

  const title = d.title || 'Play video'
  const poster = d.poster || (provider && provider.poster && videoId ? provider.poster(videoId) : '')

  el.classList.add('xo-embed')
  const s = el.style
  s.position = 'relative'
  s.cursor = 'pointer'
  s.overflow = 'hidden'
  if (!s.aspectRatio) s.aspectRatio = (d.ratio || '16/9').replace(':', '/')
  if (!s.backgroundColor) s.backgroundColor = d.color || '#111'
  if (poster) {
    s.backgroundImage = `url("${poster}")`
    s.backgroundSize = 'cover'
    s.backgroundPosition = 'center'
  }

  // Accessible play control.
  el.setAttribute('role', 'button')
  el.setAttribute('tabindex', '0')
  el.setAttribute('aria-label', title)
  const btn = document.createElement('div')
  btn.setAttribute('aria-hidden', 'true')
  btn.style.cssText =
    'position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);' +
    'width:68px;height:48px;border-radius:12px;background:rgba(0,0,0,.72);' +
    'display:flex;align-items:center;justify-content:center;transition:background .15s ease'
  btn.innerHTML =
    '<svg width="22" height="24" viewBox="0 0 22 24" aria-hidden="true"><path d="M2 1.6v20.8c0 1.2 1.3 2 2.4 1.4l18-10.4c1-.6 1-2.2 0-2.8L4.4.2C3.3-.4 2 .4 2 1.6z" transform="translate(0 -0.5) scale(0.9)" fill="#fff"/></svg>'
  el.appendChild(btn)

  const warm = (): void => provider && preconnect(provider.origins)
  el.addEventListener('pointerenter', warm, { once: true })
  el.addEventListener('focusin', warm, { once: true })
  el.addEventListener('touchstart', warm, { once: true, passive: true })

  el.addEventListener('click', () => activate(el, src, title))
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      activate(el, src, title)
    }
  })
}

const init = (options: XOframeEmbedOptions = {}): void => {
  if (typeof window === 'undefined') return
  document
    .querySelectorAll<HTMLElement>(options.selector || '[data-xo-embed]')
    .forEach(facade)
}

export const XOframeEmbed = { init }
export default XOframeEmbed

// Classic <script> auto-init: <script src="xoframe-embed.min.js" data-xo-auto></script>
if (typeof document !== 'undefined' && document.currentScript?.hasAttribute('data-xo-auto')) {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => init())
  else init()
}

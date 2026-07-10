/**
 * XOslider — a performance-first carousel. The browser does the hard part:
 * native CSS scroll-snap gives momentum, touch, trackpad and accessible
 * scrolling for free, so there is no animation loop, no transform math and no
 * scroll listener. JS only adds arrows, dots, autoplay and active tracking
 * (via IntersectionObserver, so INP stays low). ~2.5 KB — vs ~40 KB for Swiper.
 * Part of the XOframe family; separate entry (@xodesign/xoframe/slider).
 *
 *   <div data-xo-slider>
 *     <div><img data-xo data-src="1.jpg" width="1200" height="800" alt=""></div>
 *     <div><img data-xo data-src="2.jpg" width="1200" height="800" alt=""></div>
 *   </div>
 */

export interface XOsliderOptions {
  selector?: string
  /** Slides visible at once. Default: 1. */
  slidesPerView?: number
  /** Gap between slides in px. Default: 16. */
  gap?: number
  /** Show prev/next arrows. Default: true. */
  arrows?: boolean
  /** Show pagination dots. Default: true. */
  dots?: boolean
  /** Wrap around at the ends. Default: true. */
  loop?: boolean
  /** Autoplay interval in ms (0 = off). Default: 0. */
  autoplay?: number
  /** Accessible label for the carousel region. */
  label?: string
}

export interface XOsliderInstance {
  el: HTMLElement
  slides: HTMLElement[]
  readonly index: number
  next(): void
  prev(): void
  goTo(index: number): void
  destroy(): void
}

const STYLE_ID = 'xo-slider-style'
const instances: XOsliderInstance[] = []

const reducedMotion = (): boolean =>
  typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

const injectStyle = (): void => {
  if (document.getElementById(STYLE_ID)) return
  const s = document.createElement('style')
  s.id = STYLE_ID
  s.textContent =
    '.xo-slider{position:relative}' +
    '.xo-slider-track{position:relative;display:flex;gap:var(--xo-slider-gap,16px);' +
    'overflow-x:auto;scroll-snap-type:x mandatory;overscroll-behavior-x:contain;' +
    'scrollbar-width:none;-ms-overflow-style:none;scroll-behavior:smooth}' +
    '.xo-slider-track::-webkit-scrollbar{display:none}' +
    '.xo-slider-track>*{flex:0 0 calc((100% - (var(--xo-slider-per,1) - 1) * var(--xo-slider-gap,16px)) / var(--xo-slider-per,1));' +
    'scroll-snap-align:start;min-width:0}' +
    '.xo-slider-btn{position:absolute;top:50%;transform:translateY(-50%);z-index:2;border:0;cursor:pointer;' +
    'width:40px;height:40px;border-radius:50%;background:rgba(0,0,0,.6);color:#fff;font-size:20px;line-height:1;' +
    'display:flex;align-items:center;justify-content:center;transition:background .15s}' +
    '.xo-slider-btn:hover{background:rgba(0,0,0,.85)}' +
    '.xo-slider-btn[disabled]{opacity:.35;cursor:default}' +
    '.xo-slider-prev{left:8px}.xo-slider-next{right:8px}' +
    '.xo-slider-dots{display:flex;gap:8px;justify-content:center;margin-top:12px}' +
    '.xo-slider-dot{width:8px;height:8px;padding:0;border:0;border-radius:50%;cursor:pointer;' +
    'background:var(--xo-slider-dot,#c9c6c0);transition:background .15s}' +
    '.xo-slider-dot[aria-current="true"]{background:var(--xo-slider-dot-active,#1a1a1a)}' +
    '@media (prefers-reduced-motion:reduce){.xo-slider-track{scroll-behavior:auto}}'
  document.head.appendChild(s)
}

const button = (cls: string, label: string, html: string, onClick: () => void): HTMLButtonElement => {
  const b = document.createElement('button')
  b.type = 'button'
  b.className = 'xo-slider-btn ' + cls
  b.setAttribute('aria-label', label)
  b.innerHTML = html
  b.addEventListener('click', onClick)
  return b
}

const build = (el: HTMLElement, o: Required<Omit<XOsliderOptions, 'selector'>>): XOsliderInstance => {
  injectStyle()
  el.classList.add('xo-slider')
  el.setAttribute('role', 'region')
  el.setAttribute('aria-roledescription', 'carousel')
  if (o.label) el.setAttribute('aria-label', o.label)

  // Move the author's children into a scroll-snap track.
  const track = document.createElement('div')
  track.className = 'xo-slider-track'
  track.style.setProperty('--xo-slider-per', String(o.slidesPerView))
  track.style.setProperty('--xo-slider-gap', o.gap + 'px')
  while (el.firstChild) track.appendChild(el.firstChild)
  el.appendChild(track)

  const slides = [...track.children] as HTMLElement[]
  slides.forEach((s, i) => {
    s.setAttribute('role', 'group')
    s.setAttribute('aria-roledescription', 'slide')
    s.setAttribute('aria-label', `${i + 1} of ${slides.length}`)
  })

  let index = 0
  let timer: ReturnType<typeof setInterval> | null = null
  const pages = Math.max(1, slides.length - o.slidesPerView + 1)

  const goTo = (i: number): void => {
    if (!slides.length) return
    const target = o.loop ? (i + pages) % pages : Math.min(Math.max(i, 0), pages - 1)
    track.scrollTo({ left: slides[target].offsetLeft, behavior: reducedMotion() ? 'auto' : 'smooth' })
  }
  const next = (): void => goTo(index + 1)
  const prev = (): void => goTo(index - 1)

  // Arrows.
  let prevBtn: HTMLButtonElement | undefined
  let nextBtn: HTMLButtonElement | undefined
  if (o.arrows && slides.length > o.slidesPerView) {
    prevBtn = button('xo-slider-prev', 'Previous slide', '&lsaquo;', prev)
    nextBtn = button('xo-slider-next', 'Next slide', '&rsaquo;', next)
    el.append(prevBtn, nextBtn)
  }

  // Dots.
  let dotsWrap: HTMLElement | undefined
  const dots: HTMLButtonElement[] = []
  if (o.dots && pages > 1) {
    dotsWrap = document.createElement('div')
    dotsWrap.className = 'xo-slider-dots'
    for (let i = 0; i < pages; i++) {
      const d = document.createElement('button')
      d.type = 'button'
      d.className = 'xo-slider-dot'
      d.setAttribute('aria-label', `Go to slide ${i + 1}`)
      d.addEventListener('click', () => goTo(i))
      dots.push(d)
      dotsWrap.appendChild(d)
    }
    el.appendChild(dotsWrap)
  }

  const sync = (): void => {
    dots.forEach((d, i) => d.setAttribute('aria-current', String(i === index)))
    if (!o.loop) {
      prevBtn?.toggleAttribute('disabled', index === 0)
      nextBtn?.toggleAttribute('disabled', index >= pages - 1)
    }
  }

  // Active slide tracking without a scroll listener (keeps INP low).
  let io: IntersectionObserver | null = null
  if (typeof IntersectionObserver !== 'undefined') {
    io = new IntersectionObserver(
      (entries) => {
        for (const e of entries)
          if (e.isIntersecting) {
            const i = slides.indexOf(e.target as HTMLElement)
            if (i >= 0 && i !== index && i < pages) {
              index = i
              sync()
              el.dispatchEvent(
                new CustomEvent('xo:slide', { bubbles: true, detail: { element: el, index } })
              )
            }
          }
      },
      { root: track, threshold: 0.6 }
    )
    slides.forEach((s) => io!.observe(s))
  }
  sync()

  // Keyboard.
  const onKey = (e: KeyboardEvent): void => {
    if (e.key === 'ArrowLeft') prev()
    else if (e.key === 'ArrowRight') next()
  }
  el.addEventListener('keydown', onKey)

  // Autoplay: pause on interaction and when the tab is hidden; off for reduced motion.
  const stop = (): void => {
    if (timer) clearInterval(timer)
    timer = null
  }
  const start = (): void => {
    if (!o.autoplay || reducedMotion() || timer) return
    timer = setInterval(next, o.autoplay)
  }
  if (o.autoplay && !reducedMotion()) {
    start()
    el.addEventListener('pointerenter', stop)
    el.addEventListener('focusin', stop)
    el.addEventListener('pointerleave', start)
    el.addEventListener('focusout', start)
    document.addEventListener('visibilitychange', () =>
      document.visibilityState === 'hidden' ? stop() : start()
    )
  }

  const instance: XOsliderInstance = {
    el,
    slides,
    get index() {
      return index
    },
    next,
    prev,
    goTo,
    destroy() {
      stop()
      io?.disconnect()
      el.removeEventListener('keydown', onKey)
      prevBtn?.remove()
      nextBtn?.remove()
      dotsWrap?.remove()
      while (track.firstChild) el.appendChild(track.firstChild)
      track.remove()
      el.classList.remove('xo-slider')
      el.removeAttribute('role')
      el.removeAttribute('aria-roledescription')
    }
  }
  return instance
}

const init = (
  selector?: string | XOsliderOptions,
  options: XOsliderOptions = {}
): XOsliderInstance[] => {
  if (typeof document === 'undefined') return []
  if (typeof selector === 'object') {
    options = selector
    selector = undefined
  }
  const o = {
    slidesPerView: options.slidesPerView ?? 1,
    gap: options.gap ?? 16,
    arrows: options.arrows !== false,
    dots: options.dots !== false,
    loop: options.loop !== false,
    autoplay: options.autoplay ?? 0,
    label: options.label ?? ''
  }
  const made: XOsliderInstance[] = []
  document
    .querySelectorAll<HTMLElement>((selector as string) || options.selector || '[data-xo-slider]')
    .forEach((el) => {
      if (el.classList.contains('xo-slider')) return // already initialized
      const inst = build(el, o)
      instances.push(inst)
      made.push(inst)
    })
  return made
}

const destroy = (): void => {
  instances.splice(0).forEach((i) => i.destroy())
  document.getElementById(STYLE_ID)?.remove()
}

export const XOslider = { init, destroy }
export default XOslider

// Classic <script> auto-init: <script src="xoframe-slider.min.js" data-xo-auto></script>
if (typeof document !== 'undefined' && document.currentScript?.hasAttribute('data-xo-auto')) {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => init())
  else init()
}

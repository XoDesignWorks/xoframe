/**
 * XOcarousel — horizontal and vertical carousel that lets the browser do the
 * hard part. Native CSS scroll-snap provides momentum, touch and trackpad
 * scrolling, so there is no animation loop, no transform math and no scroll
 * listener; active tracking uses IntersectionObserver, keeping INP low.
 *
 * Why it beats the field:
 *  - ~3 KB with a full UI. Embla/keen-slider (~7 KB) are headless — no arrows,
 *    dots or a11y. Splide is ~27 KB, Swiper ~47 KB (~20 KB tree-shaken).
 *  - Scrolling itself needs no JavaScript. Link `dist/xoframe-carousel.css` and
 *    pre-render the `.xo-car-track` wrapper, and the carousel is a usable
 *    snapping strip even with JS disabled — JS then only upgrades it with
 *    arrows, dots and autoplay. Transform-based libraries collapse into a stack.
 *  - Zero CLS: slides reserve their box before anything loads.
 *  - WCAG 2.2.2: autoplay ships a real pause/play button, and once the user
 *    pauses, it stays paused. Autoplay is off by default.
 *  - Slide changes are announced to screen readers via a live region.
 *  - Mouse drag is added on top of native scrolling (the one thing a native
 *    scroller lacks); touch/trackpad stay native.
 *
 *   <div data-xo-carousel>
 *     <div><img data-xo data-src="1.jpg" width="1200" height="800" alt=""></div>
 *     <div><img data-xo data-src="2.jpg" width="1200" height="800" alt=""></div>
 *   </div>
 */

import CAROUSEL_CSS from '../styles/carousel.css'

export interface XOcarouselOptions {
  selector?: string
  /** Scroll axis. Default: 'x'. */
  axis?: 'x' | 'y'
  /** Slides visible at once. Default: 1. */
  slidesPerView?: number
  /** Gap between slides in px. Default: 16. */
  gap?: number
  /** Track height for the vertical axis (any CSS length). Default: '420px'. */
  height?: string
  /** Show prev/next arrows. Default: true. */
  arrows?: boolean
  /** Show pagination dots. Default: true. */
  dots?: boolean
  /** Wrap around at the ends. Default: true. */
  loop?: boolean
  /** Autoplay interval in ms. Default: 0 (off — the accessible default). */
  autoplay?: number
  /** Mouse drag-to-scroll. Touch/trackpad are always native. Default: true. */
  drag?: boolean
  /** Announce slide changes to screen readers. Default: true. */
  announce?: boolean
  /** Accessible name. Don't include the word "carousel" — the role adds it. */
  label?: string
}

export interface XOcarouselInstance {
  el: HTMLElement
  slides: HTMLElement[]
  readonly index: number
  next(): void
  prev(): void
  goTo(index: number): void
  destroy(): void
}

const STYLE_ID = 'xo-carousel-style'
const instances: XOcarouselInstance[] = []

const reducedMotion = (): boolean =>
  typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

const injectStyle = (): void => {
  // Skip when the author already linked dist/xoframe-carousel.css (no-JS setup).
  if (document.getElementById(STYLE_ID) || document.querySelector('link[data-xo-carousel-css]'))
    return
  const s = document.createElement('style')
  s.id = STYLE_ID
  s.textContent = CAROUSEL_CSS
  document.head.appendChild(s)
}

const mkButton = (cls: string, label: string, html: string): HTMLButtonElement => {
  const b = document.createElement('button')
  b.type = 'button'
  b.className = 'xo-car-btn ' + cls
  b.setAttribute('aria-label', label)
  b.innerHTML = html
  return b
}

type Opts = Required<Omit<XOcarouselOptions, 'selector'>>

const build = (el: HTMLElement, o: Opts): XOcarouselInstance => {
  injectStyle()
  const vertical = o.axis === 'y'
  el.classList.add('xo-car', vertical ? 'xo-car-y' : 'xo-car-x')
  el.setAttribute('role', 'region')
  el.setAttribute('aria-roledescription', 'carousel')
  if (o.label) el.setAttribute('aria-label', o.label)

  // Reuse an author-provided track (pre-rendered markup that already works
  // without JavaScript); otherwise wrap the children in one.
  const existing = el.querySelector<HTMLElement>(':scope > .xo-car-track')
  const track = existing ?? document.createElement('div')
  const wrapped = !existing
  if (wrapped) {
    track.className = 'xo-car-track'
    while (el.firstChild) track.appendChild(el.firstChild)
    el.appendChild(track)
  }
  track.style.setProperty('--xo-car-per', String(o.slidesPerView))
  track.style.setProperty('--xo-car-gap', o.gap + 'px')
  if (vertical) track.style.setProperty('--xo-car-height', o.height)

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
    const t = o.loop ? (i + pages) % pages : Math.min(Math.max(i, 0), pages - 1)
    const behavior = reducedMotion() ? 'auto' : 'smooth'
    const target = slides[t]
    track.scrollTo(vertical ? { top: target.offsetTop, behavior } : { left: target.offsetLeft, behavior })
  }
  const next = (): void => goTo(index + 1)
  const prev = (): void => goTo(index - 1)

  // --- Arrows ---
  let prevBtn: HTMLButtonElement | undefined
  let nextBtn: HTMLButtonElement | undefined
  if (o.arrows && slides.length > o.slidesPerView) {
    prevBtn = mkButton('xo-car-prev', 'Previous slide', vertical ? '&#8963;' : '&lsaquo;')
    nextBtn = mkButton('xo-car-next', 'Next slide', vertical ? '&#8964;' : '&rsaquo;')
    prevBtn.addEventListener('click', prev)
    nextBtn.addEventListener('click', next)
    el.append(prevBtn, nextBtn)
  }

  // --- Dots ---
  let dotsWrap: HTMLElement | undefined
  const dots: HTMLButtonElement[] = []
  if (o.dots && pages > 1) {
    dotsWrap = document.createElement('div')
    dotsWrap.className = 'xo-car-dots'
    for (let i = 0; i < pages; i++) {
      const d = document.createElement('button')
      d.type = 'button'
      d.className = 'xo-car-dot'
      d.setAttribute('aria-label', `Go to slide ${i + 1}`)
      d.addEventListener('click', () => goTo(i))
      dots.push(d)
      dotsWrap.appendChild(d)
    }
    el.appendChild(dotsWrap)
  }

  // --- Live region (screen readers hear the slide change) ---
  let status: HTMLElement | undefined
  if (o.announce) {
    status = document.createElement('div')
    status.className = 'xo-car-sr'
    status.setAttribute('aria-live', 'polite')
    status.setAttribute('aria-atomic', 'true')
    el.appendChild(status)
  }

  const sync = (): void => {
    dots.forEach((d, i) => d.setAttribute('aria-current', String(i === index)))
    if (!o.loop) {
      prevBtn?.toggleAttribute('disabled', index === 0)
      nextBtn?.toggleAttribute('disabled', index >= pages - 1)
    }
    if (status) status.textContent = `Slide ${index + 1} of ${slides.length}`
  }

  // --- Active tracking without a scroll listener (keeps INP low) ---
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

  // --- Autoplay with a WCAG 2.2.2 pause/play control ---
  let userPaused = false
  let hoverPaused = false
  let playBtn: HTMLButtonElement | undefined

  const stopAuto = (): void => {
    if (timer) clearInterval(timer)
    timer = null
  }
  const startAuto = (): void => {
    if (!o.autoplay || reducedMotion() || userPaused || hoverPaused || timer) return
    timer = setInterval(next, o.autoplay)
  }
  const onHide = (): void => {
    if (document.visibilityState === 'hidden') stopAuto()
    else startAuto()
  }
  const pauseOn = (): void => {
    hoverPaused = true
    stopAuto()
  }
  const pauseOff = (): void => {
    hoverPaused = false
    startAuto()
  }

  if (o.autoplay && !reducedMotion()) {
    playBtn = mkButton('xo-car-play', 'Pause slideshow', '&#10074;&#10074;')
    playBtn.addEventListener('click', () => {
      userPaused = !userPaused
      // Once paused by the user it stays paused until they press play again.
      if (userPaused) {
        stopAuto()
        playBtn!.setAttribute('aria-label', 'Play slideshow')
        playBtn!.innerHTML = '&#9654;'
      } else {
        playBtn!.setAttribute('aria-label', 'Pause slideshow')
        playBtn!.innerHTML = '&#10074;&#10074;'
        startAuto()
      }
    })
    el.appendChild(playBtn)
    el.addEventListener('pointerenter', pauseOn)
    el.addEventListener('focusin', pauseOn)
    el.addEventListener('pointerleave', pauseOff)
    el.addEventListener('focusout', pauseOff)
    document.addEventListener('visibilitychange', onHide)
    startAuto()
  }

  // --- Keyboard ---
  const onKey = (e: KeyboardEvent): void => {
    const back = vertical ? 'ArrowUp' : 'ArrowLeft'
    const fwd = vertical ? 'ArrowDown' : 'ArrowRight'
    if (e.key === back) prev()
    else if (e.key === fwd) next()
  }
  el.addEventListener('keydown', onKey)

  // --- Mouse drag (touch/trackpad already scroll natively) ---
  let dragging = false
  let start = 0
  let startScroll = 0
  let moved = 0

  const onDown = (e: PointerEvent): void => {
    if (!o.drag || e.pointerType !== 'mouse' || e.button !== 0) return
    dragging = true
    moved = 0
    start = vertical ? e.clientY : e.clientX
    startScroll = vertical ? track.scrollTop : track.scrollLeft
    el.classList.add('xo-car-dragging')
    stopAuto()
  }
  const onMove = (e: PointerEvent): void => {
    if (!dragging) return
    const delta = (vertical ? e.clientY : e.clientX) - start
    moved = Math.max(moved, Math.abs(delta))
    if (vertical) track.scrollTop = startScroll - delta
    else track.scrollLeft = startScroll - delta
  }
  const onUp = (): void => {
    if (!dragging) return
    dragging = false
    // Restoring scroll-snap makes the browser settle on the nearest slide.
    el.classList.remove('xo-car-dragging')
    startAuto()
  }
  // Suppress the click that ends a drag (so dragging over a link doesn't follow it).
  const onClick = (e: MouseEvent): void => {
    if (moved > 5) {
      e.preventDefault()
      e.stopPropagation()
      moved = 0
    }
  }
  if (o.drag) {
    track.addEventListener('pointerdown', onDown)
    track.addEventListener('pointermove', onMove)
    track.addEventListener('pointerup', onUp)
    track.addEventListener('pointercancel', onUp)
    track.addEventListener('pointerleave', onUp)
    track.addEventListener('click', onClick, true)
  }

  sync()

  return {
    el,
    slides,
    get index() {
      return index
    },
    next,
    prev,
    goTo,
    destroy() {
      stopAuto()
      io?.disconnect()
      el.removeEventListener('keydown', onKey)
      el.removeEventListener('pointerenter', pauseOn)
      el.removeEventListener('focusin', pauseOn)
      el.removeEventListener('pointerleave', pauseOff)
      el.removeEventListener('focusout', pauseOff)
      document.removeEventListener('visibilitychange', onHide)
      prevBtn?.remove()
      nextBtn?.remove()
      playBtn?.remove()
      dotsWrap?.remove()
      status?.remove()
      if (wrapped) {
        while (track.firstChild) el.appendChild(track.firstChild)
        track.remove()
      }
      el.classList.remove('xo-car', 'xo-car-x', 'xo-car-y')
      el.removeAttribute('role')
      el.removeAttribute('aria-roledescription')
    }
  }
}

const init = (
  selector?: string | XOcarouselOptions,
  options: XOcarouselOptions = {}
): XOcarouselInstance[] => {
  if (typeof document === 'undefined') return []
  if (typeof selector === 'object') {
    options = selector
    selector = undefined
  }
  const o: Opts = {
    axis: options.axis === 'y' ? 'y' : 'x',
    slidesPerView: options.slidesPerView ?? 1,
    gap: options.gap ?? 16,
    height: options.height ?? '420px',
    arrows: options.arrows !== false,
    dots: options.dots !== false,
    loop: options.loop !== false,
    autoplay: options.autoplay ?? 0,
    drag: options.drag !== false,
    announce: options.announce !== false,
    label: options.label ?? ''
  }
  const made: XOcarouselInstance[] = []
  document
    .querySelectorAll<HTMLElement>((selector as string) || options.selector || '[data-xo-carousel]')
    .forEach((el) => {
      if (el.classList.contains('xo-car')) return // already initialized
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

export const XOcarousel = { init, destroy }
export default XOcarousel

// Classic <script> auto-init: <script src="xoframe-carousel.min.js" data-xo-auto></script>
if (typeof document !== 'undefined' && document.currentScript?.hasAttribute('data-xo-auto')) {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => init())
  else init()
}

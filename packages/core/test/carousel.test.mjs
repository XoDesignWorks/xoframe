/**
 * Smoke tests for the opt-in carousel entry (@xodesign/xoframe/carousel).
 * jsdom has no layout (offsetLeft/offsetTop are 0) and no scrollTo, so scrollTo
 * is stubbed to record the axis and behavior; structure, a11y and state logic
 * are asserted directly.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'
import { XOcarousel } from '../dist/xoframe-carousel.esm.js'

const setup = (count = 4, { reducedMotion = false } = {}) => {
  const slides = Array.from({ length: count }, (_, i) => `<div>slide ${i + 1}</div>`).join('')
  const dom = new JSDOM(
    `<!doctype html><html><head></head><body><div data-xo-carousel>${slides}</div></body></html>`
  )
  globalThis.document = dom.window.document
  globalThis.window = dom.window
  globalThis.CustomEvent = dom.window.CustomEvent
  globalThis.matchMedia = () => ({ matches: reducedMotion })
  return dom.window.document
}

const spyScroll = (doc) => {
  const track = doc.querySelector('.xo-car-track')
  const calls = []
  track.scrollTo = (opts) => calls.push(opts)
  return calls
}

test('SSR-safe: init without document returns an empty list', () => {
  const saved = globalThis.document
  globalThis.document = undefined
  assert.deepEqual(XOcarousel.init(), [])
  globalThis.document = saved
})

test('horizontal: builds a scroll-snap track, arrows, dots and ARIA roles', () => {
  const doc = setup(4)
  const [c] = XOcarousel.init({ label: 'Photos' })
  const el = doc.querySelector('[data-xo-carousel]')

  assert.ok(doc.getElementById('xo-carousel-style'), 'stylesheet injected')
  assert.ok(el.classList.contains('xo-car-x'), 'horizontal modifier')
  assert.equal(el.getAttribute('role'), 'region')
  assert.equal(el.getAttribute('aria-roledescription'), 'carousel')
  assert.equal(el.getAttribute('aria-label'), 'Photos')

  const track = el.querySelector('.xo-car-track')
  assert.equal(track.children.length, 4, 'slides moved into the track')
  assert.equal(c.slides.length, 4)

  const first = track.children[0]
  assert.equal(first.getAttribute('role'), 'group')
  assert.equal(first.getAttribute('aria-roledescription'), 'slide')
  assert.equal(first.getAttribute('aria-label'), '1 of 4')

  assert.ok(el.querySelector('.xo-car-prev'))
  assert.ok(el.querySelector('.xo-car-next'))
  assert.equal(el.querySelectorAll('.xo-car-dot').length, 4)
  XOcarousel.destroy()
})

test('vertical: sets the y modifier, height variable and scrolls on the top axis', () => {
  const doc = setup(3)
  const [c] = XOcarousel.init({ axis: 'y', height: '500px' })
  const el = doc.querySelector('[data-xo-carousel]')
  assert.ok(el.classList.contains('xo-car-y'))
  const track = el.querySelector('.xo-car-track')
  assert.equal(track.style.getPropertyValue('--xo-car-height'), '500px')

  const calls = spyScroll(doc)
  c.goTo(1)
  assert.ok('top' in calls[0], 'vertical carousel scrolls on the top axis')
  assert.ok(!('left' in calls[0]))
  XOcarousel.destroy()
})

test('horizontal scrolls on the left axis with smooth behavior', () => {
  const doc = setup(3)
  const [c] = XOcarousel.init()
  const calls = spyScroll(doc)
  c.goTo(2)
  assert.ok('left' in calls[0])
  assert.equal(calls[0].behavior, 'smooth')
  XOcarousel.destroy()
})

test('live region announces the current slide', () => {
  const doc = setup(3)
  XOcarousel.init()
  const status = doc.querySelector('.xo-car-sr')
  assert.ok(status)
  assert.equal(status.getAttribute('aria-live'), 'polite')
  assert.equal(status.textContent, 'Slide 1 of 3')
  XOcarousel.destroy()
})

test('announce:false omits the live region', () => {
  const doc = setup(3)
  XOcarousel.init({ announce: false })
  assert.ok(!doc.querySelector('.xo-car-sr'))
  XOcarousel.destroy()
})

test('autoplay renders a WCAG pause control that toggles to Play and stays paused', () => {
  const doc = setup(3)
  XOcarousel.init({ autoplay: 3000 })
  const btn = doc.querySelector('.xo-car-play')
  assert.ok(btn, 'pause button exists when autoplay is on')
  assert.equal(btn.getAttribute('aria-label'), 'Pause slideshow')

  btn.click()
  assert.equal(btn.getAttribute('aria-label'), 'Play slideshow', 'toggles to Play when paused')

  // Hovering out must NOT resume a user-paused carousel (WCAG 2.2.2).
  const el = doc.querySelector('[data-xo-carousel]')
  el.dispatchEvent(new window.Event('pointerleave'))
  assert.equal(btn.getAttribute('aria-label'), 'Play slideshow', 'still paused after hover out')

  btn.click()
  assert.equal(btn.getAttribute('aria-label'), 'Pause slideshow', 'resumes on play')
  XOcarousel.destroy()
})

test('autoplay is off by default (accessible default) — no pause button', () => {
  const doc = setup(3)
  XOcarousel.init()
  assert.ok(!doc.querySelector('.xo-car-play'))
  XOcarousel.destroy()
})

test('reduced motion: instant scrolling and no autoplay control', () => {
  const doc = setup(3, { reducedMotion: true })
  const [c] = XOcarousel.init({ autoplay: 1000 })
  assert.ok(!doc.querySelector('.xo-car-play'), 'no autoplay under reduced motion')
  const calls = spyScroll(doc)
  c.goTo(1)
  assert.equal(calls[0].behavior, 'auto')
  XOcarousel.destroy()
})

test('loop:false disables the prev arrow on the first slide', () => {
  const doc = setup(3)
  XOcarousel.init({ loop: false })
  assert.ok(doc.querySelector('.xo-car-prev').hasAttribute('disabled'))
  assert.ok(!doc.querySelector('.xo-car-next').hasAttribute('disabled'))
  XOcarousel.destroy()
})

test('slidesPerView drives the CSS variable and the page count', () => {
  const doc = setup(4)
  XOcarousel.init({ slidesPerView: 2, gap: 24 })
  const track = doc.querySelector('.xo-car-track')
  assert.equal(track.style.getPropertyValue('--xo-car-per'), '2')
  assert.equal(track.style.getPropertyValue('--xo-car-gap'), '24px')
  assert.equal(doc.querySelectorAll('.xo-car-dot').length, 3, '4 slides, 2 per view → 3 pages')
  XOcarousel.destroy()
})

test('mouse drag scrolls the track; touch is left to native scrolling', () => {
  const doc = setup(3)
  XOcarousel.init()
  const el = doc.querySelector('[data-xo-carousel]')
  const track = doc.querySelector('.xo-car-track')
  track.scrollLeft = 0

  const down = (type, x) =>
    new window.PointerEvent('pointerdown', { pointerType: type, button: 0, clientX: x, bubbles: true })

  // Touch: the module must not hijack — native scrolling handles it.
  track.dispatchEvent(down('touch', 100))
  assert.ok(!el.classList.contains('xo-car-dragging'), 'touch is not intercepted')

  // Mouse: drag engages.
  track.dispatchEvent(down('mouse', 100))
  assert.ok(el.classList.contains('xo-car-dragging'))
  track.dispatchEvent(new window.PointerEvent('pointermove', { clientX: 60, bubbles: true }))
  assert.equal(track.scrollLeft, 40, 'scrolled by the drag delta')
  track.dispatchEvent(new window.PointerEvent('pointerup', { bubbles: true }))
  assert.ok(!el.classList.contains('xo-car-dragging'), 'snap restored on release')
  XOcarousel.destroy()
})

test('arrows/dots can be turned off; a single slide gets no arrows', () => {
  let doc = setup(3)
  XOcarousel.init({ arrows: false, dots: false })
  assert.ok(!doc.querySelector('.xo-car-btn'))
  assert.ok(!doc.querySelector('.xo-car-dots'))
  XOcarousel.destroy()

  doc = setup(1)
  XOcarousel.init()
  assert.ok(!doc.querySelector('.xo-car-btn'))
  XOcarousel.destroy()
})

test('no-JS setup: reuses an author-rendered track and skips injecting CSS', () => {
  const dom = new JSDOM(
    '<!doctype html><html><head><link rel="stylesheet" href="/xoframe-carousel.css" data-xo-carousel-css></head>' +
      '<body><div data-xo-carousel><div class="xo-car-track"><div>a</div><div>b</div></div></div></body></html>'
  )
  globalThis.document = dom.window.document
  globalThis.window = dom.window
  globalThis.CustomEvent = dom.window.CustomEvent
  globalThis.matchMedia = () => ({ matches: false })
  const doc = dom.window.document

  const [c] = XOcarousel.init()
  assert.equal(doc.querySelectorAll('.xo-car-track').length, 1, 'existing track reused, not re-wrapped')
  assert.equal(c.slides.length, 2)
  assert.ok(!doc.getElementById('xo-carousel-style'), 'linked CSS means no injected <style>')

  // Destroy must not unwrap a track the author owns.
  XOcarousel.destroy()
  assert.ok(doc.querySelector('.xo-car-track'), 'author track survives destroy')
  assert.equal(doc.querySelector('.xo-car-track').children.length, 2)
})

test('init is idempotent and destroy restores the original DOM', () => {
  const doc = setup(3)
  XOcarousel.init()
  assert.equal(XOcarousel.init().length, 0, 'already-initialized carousel is skipped')
  assert.equal(doc.querySelectorAll('.xo-car-track').length, 1)

  XOcarousel.destroy()
  const el = doc.querySelector('[data-xo-carousel]')
  assert.ok(!el.querySelector('.xo-car-track'))
  assert.ok(!el.querySelector('.xo-car-btn'))
  assert.equal(el.children.length, 3, 'slides restored as direct children')
  assert.ok(!el.classList.contains('xo-car'))
  assert.equal(el.getAttribute('role'), null)
})

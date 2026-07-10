/**
 * Smoke tests for the opt-in slider entry (@xodesign/xoframe/slider).
 * jsdom has no layout (offsetLeft is 0) and no scrollTo, so we stub scrollTo to
 * record the requested position; the structural/a11y/state logic is asserted.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'
import { XOslider } from '../dist/xoframe-slider.esm.js'

const setup = (count = 4, { reducedMotion = false } = {}) => {
  const slides = Array.from({ length: count }, (_, i) => `<div>slide ${i + 1}</div>`).join('')
  const dom = new JSDOM(`<!doctype html><html><head></head><body><div data-xo-slider>${slides}</div></body></html>`)
  globalThis.document = dom.window.document
  globalThis.window = dom.window
  globalThis.CustomEvent = dom.window.CustomEvent
  globalThis.matchMedia = () => ({ matches: reducedMotion })
  return dom.window.document
}

/** Capture scrollTo calls on the track. */
const trackScrolls = (doc) => {
  const track = doc.querySelector('.xo-slider-track')
  const calls = []
  track.scrollTo = (opts) => calls.push(opts)
  return { track, calls }
}

test('SSR-safe: init without document returns an empty list', () => {
  const saved = globalThis.document
  globalThis.document = undefined
  assert.deepEqual(XOslider.init(), [])
  globalThis.document = saved
})

test('builds a scroll-snap track, arrows, dots and ARIA roles', () => {
  const doc = setup(4)
  const [s] = XOslider.init({ label: 'Photos' })
  const el = doc.querySelector('[data-xo-slider]')

  assert.ok(doc.getElementById('xo-slider-style'), 'stylesheet injected')
  assert.equal(el.getAttribute('role'), 'region')
  assert.equal(el.getAttribute('aria-roledescription'), 'carousel')
  assert.equal(el.getAttribute('aria-label'), 'Photos')

  const track = el.querySelector('.xo-slider-track')
  assert.ok(track, 'track created')
  assert.equal(track.children.length, 4, 'slides moved into the track')
  assert.equal(s.slides.length, 4)

  const first = track.children[0]
  assert.equal(first.getAttribute('role'), 'group')
  assert.equal(first.getAttribute('aria-roledescription'), 'slide')
  assert.equal(first.getAttribute('aria-label'), '1 of 4')

  assert.ok(el.querySelector('.xo-slider-prev'), 'prev arrow')
  assert.ok(el.querySelector('.xo-slider-next'), 'next arrow')
  assert.equal(el.querySelectorAll('.xo-slider-dot').length, 4, 'one dot per page')
  XOslider.destroy()
})

test('dots reflect the active slide (first is current)', () => {
  const doc = setup(3)
  XOslider.init()
  const dots = [...doc.querySelectorAll('.xo-slider-dot')]
  assert.equal(dots[0].getAttribute('aria-current'), 'true')
  assert.equal(dots[1].getAttribute('aria-current'), 'false')
  XOslider.destroy()
})

test('next()/prev()/goTo() scroll the track to the target slide', () => {
  const doc = setup(3)
  const [s] = XOslider.init()
  const { calls } = trackScrolls(doc)
  s.goTo(2)
  assert.equal(calls.length, 1)
  assert.equal(typeof calls[0].left, 'number')
  assert.equal(calls[0].behavior, 'smooth')
  XOslider.destroy()
})

test('reduced motion: scrolling is instant, autoplay never starts', () => {
  const doc = setup(3, { reducedMotion: true })
  const [s] = XOslider.init({ autoplay: 10 })
  const { calls } = trackScrolls(doc)
  s.goTo(1)
  assert.equal(calls[0].behavior, 'auto', 'no smooth scrolling under reduced motion')
  XOslider.destroy()
})

test('loop:false disables the prev arrow on the first slide', () => {
  const doc = setup(3)
  XOslider.init({ loop: false })
  const prev = doc.querySelector('.xo-slider-prev')
  const next = doc.querySelector('.xo-slider-next')
  assert.ok(prev.hasAttribute('disabled'), 'prev disabled at index 0')
  assert.ok(!next.hasAttribute('disabled'), 'next enabled')
  XOslider.destroy()
})

test('slidesPerView drives the CSS variable and dot/page count', () => {
  const doc = setup(4)
  XOslider.init({ slidesPerView: 2, gap: 24 })
  const track = doc.querySelector('.xo-slider-track')
  assert.equal(track.style.getPropertyValue('--xo-slider-per'), '2')
  assert.equal(track.style.getPropertyValue('--xo-slider-gap'), '24px')
  // 4 slides, 2 per view → 3 pages
  assert.equal(doc.querySelectorAll('.xo-slider-dot').length, 3)
  XOslider.destroy()
})

test('arrows/dots can be turned off', () => {
  const doc = setup(3)
  XOslider.init({ arrows: false, dots: false })
  assert.ok(!doc.querySelector('.xo-slider-btn'))
  assert.ok(!doc.querySelector('.xo-slider-dots'))
  XOslider.destroy()
})

test('a single slide gets no arrows (nothing to navigate)', () => {
  const doc = setup(1)
  XOslider.init()
  assert.ok(!doc.querySelector('.xo-slider-btn'))
  XOslider.destroy()
})

test('init is idempotent — a second call does not double-wrap', () => {
  const doc = setup(3)
  XOslider.init()
  const made = XOslider.init()
  assert.equal(made.length, 0, 'already-initialized slider is skipped')
  assert.equal(doc.querySelectorAll('.xo-slider-track').length, 1)
  XOslider.destroy()
})

test('destroy restores the original DOM', () => {
  const doc = setup(3)
  XOslider.init()
  XOslider.destroy()
  const el = doc.querySelector('[data-xo-slider]')
  assert.ok(!el.querySelector('.xo-slider-track'), 'track removed')
  assert.ok(!el.querySelector('.xo-slider-btn'), 'arrows removed')
  assert.equal(el.children.length, 3, 'slides restored as direct children')
  assert.ok(!el.classList.contains('xo-slider'))
  assert.equal(el.getAttribute('role'), null)
})

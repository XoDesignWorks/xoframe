/**
 * Smoke tests for @xoframe/core against the built ESM bundle (run `npm run build` first).
 * jsdom has no IntersectionObserver, which conveniently exercises the
 * "no IO → load immediately" fallback path of the library.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'
import { XOframe } from '../dist/xoframe.esm.js'

// --- SSR safety: must run BEFORE any window global is installed ---

test('SSR-safe: init() without window is a no-op and does not throw', () => {
  assert.equal(typeof window, 'undefined')
  assert.doesNotThrow(() => XOframe.init())
})

test('exports the full public API', () => {
  for (const method of [
    'init', 'auto', 'refresh', 'load', 'loadAll', 'loadInside',
    'observe', 'unobserve', 'pause', 'resume', 'destroy'
  ]) {
    assert.equal(typeof XOframe[method], 'function', method + ' is a function')
  }
})

// --- Browser-like tests (jsdom) ---

const installDom = (bodyHtml) => {
  const dom = new JSDOM(`<!doctype html><html><body>${bodyHtml}</body></html>`)
  globalThis.window = dom.window
  globalThis.document = dom.window.document
  globalThis.CustomEvent = dom.window.CustomEvent
  globalThis.Event = dom.window.Event
  globalThis.Image = dom.window.Image
  globalThis.innerWidth = 1280
  globalThis.innerHeight = 800
  globalThis.location = dom.window.location
  Object.defineProperty(globalThis, 'navigator', {
    value: dom.window.navigator,
    configurable: true
  })
  return dom.window.document
}

test('fallback without IntersectionObserver: data-src promoted to src immediately', () => {
  const doc = installDom(
    '<img data-xo data-src="https://example.com/a.jpg" width="800" height="600" alt="">'
  )
  XOframe.init()
  const img = doc.querySelector('img')
  assert.equal(img.getAttribute('src'), 'https://example.com/a.jpg')
  assert.ok(img.classList.contains('xo'))
  assert.ok(img.classList.contains('xo-loading'))
  XOframe.destroy()
})

test('load event → xo-loaded class, bubbling xo:load event, onLoad callback', () => {
  const doc = installDom(
    '<img data-xo data-src="https://example.com/b.jpg" width="800" height="600" alt="">'
  )
  let cbElement = null
  let eventElement = null
  doc.addEventListener('xo:load', (e) => (eventElement = e.detail.element))
  XOframe.init({ onLoad: (el) => (cbElement = el) })
  const img = doc.querySelector('img')
  img.dispatchEvent(new Event('load'))
  assert.ok(img.classList.contains('xo-loaded'))
  assert.ok(!img.classList.contains('xo-loading'))
  assert.equal(cbElement, img)
  assert.equal(eventElement, img)
  XOframe.destroy()
})

test('error event → xo-error class and onError callback', () => {
  const doc = installDom(
    '<img data-xo data-src="https://example.com/broken.jpg" width="800" height="600" alt="">'
  )
  let failed = null
  XOframe.init({ onError: (el) => (failed = el) })
  const img = doc.querySelector('img')
  img.dispatchEvent(new Event('error'))
  assert.ok(img.classList.contains('xo-error'))
  assert.equal(failed, img)
  XOframe.destroy()
})

test('dominant color placeholder: backgroundColor + xo-placeholder class', () => {
  const doc = installDom(
    '<img data-xo data-src="x.jpg" data-color="#d8c6a4" width="800" height="600" alt="">'
  )
  XOframe.init()
  const img = doc.querySelector('img')
  assert.ok(img.style.backgroundColor.length > 0)
  assert.ok(img.classList.contains('xo-placeholder'))
  XOframe.destroy()
})

test('4-corner gradient placeholder: radial-gradient layers + base color', () => {
  const doc = installDom(
    '<img data-xo data-src="x.jpg" data-gradient="#7a6a52,#b8a88f,#4f5d6b,#8fa3b8" width="800" height="600" alt="">'
  )
  XOframe.init()
  const img = doc.querySelector('img')
  const layers = img.style.backgroundImage.match(/radial-gradient/g) || []
  assert.equal(layers.length, 4)
  assert.ok(img.style.backgroundColor.length > 0)
  assert.ok(img.classList.contains('xo-placeholder'))
  XOframe.destroy()
})

test('LQIP: an existing src marks the element xo-lqip and still swaps to data-src', () => {
  const doc = installDom(
    '<img data-xo src="tiny.jpg" data-src="https://example.com/full.jpg" width="800" height="600" alt="">'
  )
  XOframe.init()
  const img = doc.querySelector('img')
  assert.ok(img.classList.contains('xo-lqip'))
  assert.equal(img.getAttribute('src'), 'https://example.com/full.jpg')
  XOframe.destroy()
})

test('picture: data-srcset on <source> is promoted', () => {
  const doc = installDom(
    '<picture data-xo><source data-srcset="small.webp" media="(max-width: 600px)">' +
      '<img data-src="big.jpg" width="800" height="600" alt=""></picture>'
  )
  XOframe.init()
  assert.equal(doc.querySelector('source').getAttribute('srcset'), 'small.webp')
  assert.equal(doc.querySelector('img').getAttribute('src'), 'big.jpg')
  XOframe.destroy()
})

test('manual strategy: not loaded on init, loaded via XOframe.load()', () => {
  const doc = installDom(
    '<img data-xo data-xo-strategy="manual" data-src="m.jpg" width="800" height="600" alt="">'
  )
  XOframe.init()
  const img = doc.querySelector('img')
  assert.equal(img.getAttribute('src'), null)
  XOframe.load(img)
  assert.equal(img.getAttribute('src'), 'm.jpg')
  XOframe.destroy()
})

test('data-xo-priority="high": eager + fetchpriority even in fallback mode', () => {
  const doc = installDom(
    '<img data-xo data-xo-priority="high" data-src="hero.jpg" width="1600" height="900" alt="">'
  )
  XOframe.init()
  const img = doc.querySelector('img')
  assert.equal(img.getAttribute('fetchpriority'), 'high')
  assert.equal(img.getAttribute('src'), 'hero.jpg')
  XOframe.destroy()
})

test('blocks: xo-visible and is-xo-visible plus xo:visible event', () => {
  const doc = installDom('<section data-xo-block><p>content</p></section>')
  let visible = null
  doc.addEventListener('xo:visible', (e) => (visible = e.detail.element))
  XOframe.init()
  const block = doc.querySelector('section')
  assert.ok(block.classList.contains('xo-visible'))
  assert.ok(block.classList.contains('is-xo-visible'))
  assert.equal(visible, block)
  XOframe.destroy()
})

test('background: data-bg is loaded through a preloader Image', () => {
  const doc = installDom(
    '<div data-xo-bg data-bg="bg.jpg" data-ratio="16/9" data-color="#eee"></div>'
  )
  XOframe.init()
  const el = doc.querySelector('div')
  assert.ok(el.classList.contains('xo-bg'))
  assert.ok(el.classList.contains('xo-loading'))
  assert.ok(el.style.backgroundColor.length > 0)
  XOframe.destroy()
})

test('refresh() picks up elements added after init', () => {
  const doc = installDom('<div id="root"></div>')
  XOframe.init()
  doc.getElementById('root').innerHTML =
    '<img data-xo data-src="late.jpg" width="800" height="600" alt="">'
  const img = doc.querySelector('img')
  assert.equal(img.getAttribute('src'), null)
  XOframe.refresh()
  assert.equal(img.getAttribute('src'), 'late.jpg')
  XOframe.destroy()
})

test('pause() defers loading, resume() releases the queue', () => {
  const doc = installDom('<div id="root"></div>')
  XOframe.init()
  XOframe.pause()
  doc.getElementById('root').innerHTML =
    '<img data-xo data-src="queued.jpg" width="800" height="600" alt="">'
  XOframe.refresh()
  const img = doc.querySelector('img')
  assert.equal(img.getAttribute('src'), null, 'not loaded while paused')
  XOframe.resume()
  assert.equal(img.getAttribute('src'), 'queued.jpg', 'loaded after resume')
  XOframe.destroy()
})

test('iframe: data-src promoted, loading=lazy hint kept off deferred frames', () => {
  const doc = installDom(
    '<iframe data-xo data-src="https://example.com/embed" data-ratio="16/9" title="t"></iframe>'
  )
  XOframe.init()
  const frame = doc.querySelector('iframe')
  assert.equal(frame.getAttribute('src'), 'https://example.com/embed')
  assert.ok(frame.classList.contains('xo-loading'))
  frame.dispatchEvent(new Event('load'))
  assert.ok(frame.classList.contains('xo-loaded'))
  XOframe.destroy()
})

test('video: data-poster and data-src promoted, reveal on loadeddata', () => {
  const doc = installDom(
    '<video data-xo data-poster="p.jpg" data-src="v.mp4" data-ratio="16/9"></video>'
  )
  XOframe.init()
  const video = doc.querySelector('video')
  assert.equal(video.getAttribute('poster'), 'p.jpg')
  assert.equal(video.getAttribute('src'), 'v.mp4')
  assert.ok(video.classList.contains('xo-lqip'), 'poster keeps the element visible')
  video.dispatchEvent(new Event('loadeddata'))
  assert.ok(video.classList.contains('xo-loaded'))
  XOframe.destroy()
})

test('intent strategy: loads on pointerenter, not before', () => {
  const doc = installDom(
    '<img data-xo data-xo-strategy="intent" data-src="i.jpg" width="800" height="600" alt="">'
  )
  XOframe.init()
  const img = doc.querySelector('img')
  assert.equal(img.getAttribute('src'), null, 'not loaded on init')
  img.dispatchEvent(new Event('pointerenter'))
  assert.equal(img.getAttribute('src'), 'i.jpg', 'loaded after hover')
  XOframe.destroy()
})

test('auto mode: plain <img> gets managed classes without any data attributes', () => {
  const doc = installDom(
    '<img src="plain.jpg" width="800" height="600" alt=""><img data-xo-skip src="skip.jpg" alt="">'
  )
  XOframe.auto()
  const [plain, skipped] = doc.querySelectorAll('img')
  assert.ok(plain.classList.contains('xo'))
  assert.ok(!skipped.classList.contains('xo'), 'data-xo-skip is excluded')
  XOframe.destroy()
})

// --- INP guard: batched scanning ---

const many = (n) =>
  Array.from({ length: n }, (_, i) =>
    `<img data-xo data-src="b${i}.jpg" width="400" height="300" alt="">`
  ).join('')

test('INP guard: under batchSize, all elements process synchronously', () => {
  const doc = installDom(many(10))
  XOframe.init({ batchSize: 50 })
  const imgs = [...doc.querySelectorAll('img')]
  assert.ok(imgs.every((i) => i.getAttribute('src')), 'all loaded sync (fallback mode)')
  XOframe.destroy()
})

test('INP guard: over batchSize, first chunk sync and the tail is deferred', () => {
  const doc = installDom(many(20))
  XOframe.init({ batchSize: 5 })
  const imgs = [...doc.querySelectorAll('img')]
  const loadedNow = imgs.filter((i) => i.getAttribute('src')).length
  assert.equal(loadedNow, 5, 'exactly the first chunk loaded synchronously')
  assert.ok(imgs.slice(5).every((i) => !i.getAttribute('src')), 'tail not yet loaded')
})

test('INP guard: the deferred tail finishes on later tasks', async () => {
  const doc = installDom(many(20))
  XOframe.init({ batchSize: 5 })
  // Let the yielded chunks run.
  await new Promise((r) => setTimeout(r, 50))
  const imgs = [...doc.querySelectorAll('img')]
  assert.ok(imgs.every((i) => i.getAttribute('src')), 'every element loaded after yielding')
  XOframe.destroy()
})

test('INP guard: batchSize 0 forces fully synchronous scanning', () => {
  const doc = installDom(many(120))
  XOframe.init({ batchSize: 0 })
  const imgs = [...doc.querySelectorAll('img')]
  assert.ok(imgs.every((i) => i.getAttribute('src')), 'all 120 loaded sync when disabled')
  XOframe.destroy()
})

// --- Resilience: data-fallback chain ---

test('data-fallback: first error swaps to the next source, not xo-error', () => {
  const doc = installDom(
    '<img data-xo data-src="a.avif" data-fallback="b.webp, c.jpg" width="800" height="600" alt="">'
  )
  XOframe.init()
  const img = doc.querySelector('img')
  assert.equal(img.getAttribute('src'), 'a.avif')
  img.dispatchEvent(new Event('error'))
  assert.equal(img.getAttribute('src'), 'b.webp', 'moved to first fallback')
  assert.ok(!img.classList.contains('xo-error'), 'not failed yet')
  img.dispatchEvent(new Event('error'))
  assert.equal(img.getAttribute('src'), 'c.jpg', 'moved to second fallback')
  img.dispatchEvent(new Event('load'))
  assert.ok(img.classList.contains('xo-loaded'), 'a fallback finally loaded')
  XOframe.destroy()
})

test('data-fallback: xo-error only after the whole chain is exhausted', () => {
  const doc = installDom(
    '<img data-xo data-src="a.avif" data-fallback="b.webp" width="800" height="600" alt="">'
  )
  XOframe.init()
  const img = doc.querySelector('img')
  img.dispatchEvent(new Event('error')) // → b.webp
  img.dispatchEvent(new Event('error')) // chain exhausted → error
  assert.ok(img.classList.contains('xo-error'))
  XOframe.destroy()
})

// --- LCP: auto-preconnect ---

test('preconnect: a cross-origin priority image injects one preconnect link', () => {
  const doc = installDom(
    '<img data-xo data-xo-priority="high" data-src="https://cdn.example.com/hero.jpg" width="1600" height="900" alt="">'
  )
  XOframe.init()
  const link = doc.querySelector('link[rel="preconnect"]')
  assert.ok(link, 'preconnect link injected')
  assert.equal(link.getAttribute('href'), 'https://cdn.example.com')
  assert.equal(link.getAttribute('crossorigin'), 'anonymous')
  XOframe.destroy()
})

test('preconnect: can be disabled', () => {
  const doc = installDom(
    '<img data-xo data-xo-priority="high" data-src="https://cdn.example.com/h.jpg" width="1600" height="900" alt="">'
  )
  XOframe.init({ preconnect: false })
  assert.ok(!doc.querySelector('link[rel="preconnect"]'))
  XOframe.destroy()
})

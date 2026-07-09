/**
 * Smoke tests for the opt-in fonts entry (@xodesign/xoframe/fonts).
 * jsdom can't render fonts (offsetWidth is 0), so the runtime-measurement path
 * yields no size-adjust; these tests focus on the precomputed-metrics path,
 * preload injection and the loaded-class flag.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'
import { XOframeFonts } from '../dist/xoframe-fonts.esm.js'

const setup = (withFontsApi = false) => {
  const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>')
  globalThis.document = dom.window.document
  globalThis.window = dom.window
  if (withFontsApi) {
    Object.defineProperty(dom.window.document, 'fonts', {
      value: { ready: Promise.resolve() },
      configurable: true
    })
  }
  return dom.window.document
}

test('SSR-safe: init/destroy without document are no-ops', () => {
  const saved = globalThis.document
  globalThis.document = undefined
  assert.doesNotThrow(() => XOframeFonts.init({ fonts: [{ family: 'X' }] }))
  globalThis.document = saved
})

test('precomputed metrics: injects an adjusted @font-face fallback', () => {
  const doc = setup()
  XOframeFonts.init({
    fonts: [{ family: 'Inter', fallback: 'Arial, sans-serif', sizeAdjust: '107%', ascentOverride: '90%', descentOverride: '22%' }]
  })
  const css = doc.getElementById('xo-fonts-style').textContent
  assert.match(css, /@font-face\{/)
  assert.match(css, /font-family:"Inter fallback"/)
  assert.match(css, /src:local\("Arial"\)/)
  assert.match(css, /size-adjust:107%/)
  assert.match(css, /ascent-override:90%/)
  assert.match(css, /descent-override:22%/)
  XOframeFonts.destroy()
})

test('selector: applies the adjusted font stack', () => {
  const doc = setup()
  XOframeFonts.init({
    fonts: [{ family: 'Inter', fallback: 'Arial, sans-serif', selector: 'body', sizeAdjust: '105%' }]
  })
  const css = doc.getElementById('xo-fonts-style').textContent
  assert.match(css, /body\{font-family:"Inter","Inter fallback",Arial, sans-serif\}/)
  XOframeFonts.destroy()
})

test('no measurable width and no precomputed metrics: fallback @font-face without size-adjust', () => {
  const doc = setup()
  XOframeFonts.init({ fonts: [{ family: 'Roboto', fallback: 'sans-serif' }] })
  const css = doc.getElementById('xo-fonts-style').textContent
  assert.match(css, /font-family:"Roboto fallback"/)
  assert.doesNotMatch(css, /size-adjust/) // offsetWidth 0 in jsdom → skipped, no NaN
  XOframeFonts.destroy()
})

test('preload injects a crossorigin font preload link', () => {
  const doc = setup()
  XOframeFonts.init({ fonts: [{ family: 'Inter', preload: '/fonts/inter.woff2' }] })
  const link = doc.querySelector('link[rel="preload"][as="font"]')
  assert.ok(link)
  assert.equal(link.getAttribute('href'), '/fonts/inter.woff2')
  assert.equal(link.getAttribute('crossorigin'), 'anonymous')
  assert.equal(link.getAttribute('type'), 'font/woff2')
  XOframeFonts.destroy()
})

test('preload is not duplicated on repeat init', () => {
  const doc = setup()
  XOframeFonts.init({ fonts: [{ family: 'Inter', preload: '/f.woff2' }] })
  XOframeFonts.init({ fonts: [{ family: 'Inter', preload: '/f.woff2' }] })
  assert.equal(doc.querySelectorAll('link[rel="preload"][as="font"]').length, 1)
  XOframeFonts.destroy()
})

test('adds the loaded class once document.fonts is ready', async () => {
  const doc = setup(true)
  XOframeFonts.init({ fonts: [{ family: 'Inter' }] })
  await Promise.resolve()
  await Promise.resolve()
  assert.ok(doc.documentElement.classList.contains('xo-fonts-loaded'))
  XOframeFonts.destroy()
})

test('adds the loaded class immediately when Font Loading API is absent', () => {
  const doc = setup(false)
  XOframeFonts.init({ fonts: [{ family: 'Inter' }], loadedClass: 'fonts-ok' })
  assert.ok(doc.documentElement.classList.contains('fonts-ok'))
  XOframeFonts.destroy()
})

test('destroy removes the injected stylesheet', () => {
  const doc = setup()
  XOframeFonts.init({ fonts: [{ family: 'Inter', sizeAdjust: '100%' }] })
  XOframeFonts.destroy()
  assert.ok(!doc.getElementById('xo-fonts-style'))
})

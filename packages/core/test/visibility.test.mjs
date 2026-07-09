/**
 * Smoke tests for the opt-in content-visibility entry
 * (@xodesign/xoframe/visibility).
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'
import { XOframeVisibility } from '../dist/xoframe-visibility.esm.js'

const setup = (html, { support = true } = {}) => {
  const dom = new JSDOM(`<!doctype html><html><head></head><body>${html}</body></html>`)
  globalThis.document = dom.window.document
  globalThis.window = dom.window
  globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0)
  // jsdom lacks the contentVisibility CSS property; add/remove it to toggle support.
  const style = dom.window.document.documentElement.style
  if (support && !('contentVisibility' in style)) style.contentVisibility = ''
  return dom.window.document
}

test('SSR-safe: init/destroy without document are no-ops', () => {
  const savedDoc = globalThis.document
  globalThis.document = undefined
  assert.doesNotThrow(() => XOframeVisibility.init())
  globalThis.document = savedDoc
})

test('unsupported browser: no-op, no inline styles written', () => {
  const dom = new JSDOM('<section data-xo-visibility data-xo-intrinsic-size="800px"></section>')
  globalThis.document = dom.window.document
  globalThis.window = dom.window
  const section = dom.window.document.querySelector('section')
  // This jsdom recognizes contentVisibility, so stub documentElement with a
  // style object that lacks the property → the module's feature check fails.
  Object.defineProperty(dom.window.document, 'documentElement', {
    value: { style: Object.create(null) },
    configurable: true
  })
  XOframeVisibility.init()
  assert.equal(section.style.getPropertyValue('content-visibility'), '')
})

test('applies content-visibility:auto and intrinsic size (single value → "auto <size>")', () => {
  const doc = setup('<section data-xo-visibility data-xo-intrinsic-size="800px"></section>')
  XOframeVisibility.init()
  const section = doc.querySelector('section')
  assert.equal(section.style.getPropertyValue('content-visibility'), 'auto')
  assert.equal(section.style.getPropertyValue('contain-intrinsic-size'), 'auto 800px')
  XOframeVisibility.destroy()
})

test('two-value intrinsic size is passed through verbatim', () => {
  const doc = setup('<section data-xo-visibility data-xo-intrinsic-size="600px 900px"></section>')
  XOframeVisibility.init()
  const section = doc.querySelector('section')
  assert.equal(section.style.getPropertyValue('contain-intrinsic-size'), '600px 900px')
  XOframeVisibility.destroy()
})

test('data-xo-visibility="off" opts a critical block out', () => {
  const doc = setup('<section data-xo-visibility="off" data-xo-intrinsic-size="800px"></section>')
  XOframeVisibility.init()
  const section = doc.querySelector('section')
  assert.equal(section.style.getPropertyValue('content-visibility'), '')
  XOframeVisibility.destroy()
})

test('falls back to defaultIntrinsicSize when the attribute is absent', () => {
  const doc = setup('<section data-xo-visibility></section>')
  XOframeVisibility.init({ defaultIntrinsicSize: '0 720px' })
  const section = doc.querySelector('section')
  assert.equal(section.style.getPropertyValue('contain-intrinsic-size'), '0 720px')
  XOframeVisibility.destroy()
})

test('destroy() removes the applied properties', () => {
  const doc = setup('<section data-xo-visibility data-xo-intrinsic-size="800px"></section>')
  XOframeVisibility.init()
  const section = doc.querySelector('section')
  XOframeVisibility.destroy()
  assert.equal(section.style.getPropertyValue('content-visibility'), '')
  assert.equal(section.style.getPropertyValue('contain-intrinsic-size'), '')
})

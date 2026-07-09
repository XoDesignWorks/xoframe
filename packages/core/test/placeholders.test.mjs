/**
 * Smoke tests for the opt-in placeholder decoder entries
 * (@xodesign/xoframe/thumbhash and /blurhash) against the built bundles.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'
import { XOframeThumbhash } from '../dist/xoframe-thumbhash.esm.js'
import { XOframeBlurhash } from '../dist/xoframe-blurhash.esm.js'

test('thumbhash/blurhash: SSR-safe init without document', () => {
  assert.doesNotThrow(() => XOframeThumbhash.init())
  assert.doesNotThrow(() => XOframeBlurhash.init())
})

test('thumbhash: renders data-thumbhash into a background-image data URL', () => {
  const dom = new JSDOM(
    '<img data-xo data-thumbhash="5CgGNYp1d4eAiIh3h3iId3B0B/eI" data-src="x.jpg" width="800" height="600">'
  )
  globalThis.document = dom.window.document
  const img = dom.window.document.querySelector('img')
  XOframeThumbhash.init()
  assert.match(img.style.backgroundImage, /^url\("data:image\/png;base64,/)
  assert.ok(img.classList.contains('xo-placeholder'))
  assert.ok(img.classList.contains('xo-thumbhash'))
})

test('thumbhash: invalid hash fails silently, no classes added', () => {
  const dom = new JSDOM('<img data-thumbhash="!!!not-base64!!!">')
  globalThis.document = dom.window.document
  const img = dom.window.document.querySelector('img')
  assert.doesNotThrow(() => XOframeThumbhash.init())
  assert.ok(!img.classList.contains('xo-thumbhash'))
})

test('blurhash: no canvas backend (jsdom) — fails silently, element untouched', () => {
  const dom = new JSDOM(
    '<img data-xo data-blurhash="LEHV6nWB2yk8pyo0adR*.7kCMdnj" data-src="x.jpg">'
  )
  globalThis.document = dom.window.document
  const img = dom.window.document.querySelector('img')
  assert.doesNotThrow(() => XOframeBlurhash.init())
  assert.equal(img.style.backgroundImage, '')
})

test('blurhash: invalid hash fails silently', () => {
  const dom = new JSDOM('<img data-blurhash="short">')
  globalThis.document = dom.window.document
  assert.doesNotThrow(() => XOframeBlurhash.init())
})

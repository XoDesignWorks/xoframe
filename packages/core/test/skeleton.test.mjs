/**
 * Smoke tests for the opt-in skeleton entry (@xodesign/xoframe/skeleton).
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'
import { XOframeSkeleton } from '../dist/xoframe-skeleton.esm.js'

const setup = (html) => {
  const dom = new JSDOM(`<!doctype html><html><head></head><body>${html}</body></html>`)
  globalThis.document = dom.window.document
  globalThis.window = dom.window
  globalThis.CustomEvent = dom.window.CustomEvent
  globalThis.Event = dom.window.Event
  return dom.window.document
}

test('SSR-safe: init/reveal/destroy without document are no-ops', () => {
  const savedDoc = globalThis.document
  globalThis.document = undefined
  assert.doesNotThrow(() => XOframeSkeleton.init())
  globalThis.document = savedDoc
})

test('mounts a skeleton, injects style once, reserves min-height', () => {
  const doc = setup('<section data-xo-skeleton="cards" data-xo-min-height="400px"></section>')
  XOframeSkeleton.init({ autoHide: 0 })
  const section = doc.querySelector('section')
  const sk = section.querySelector('.xo-skeleton')
  assert.ok(sk, 'skeleton element injected')
  assert.equal(sk.getAttribute('aria-hidden'), 'true')
  assert.equal(section.style.minHeight, '400px')
  assert.ok(doc.getElementById('xo-skeleton-style'), 'stylesheet injected')
  // A second init must not inject a second stylesheet.
  XOframeSkeleton.init({ autoHide: 0 })
  assert.equal(doc.querySelectorAll('#xo-skeleton-style').length, 1)
  XOframeSkeleton.destroy()
})

test('cards preset builds a grid of shimmer cells', () => {
  const doc = setup('<section data-xo-skeleton="cards"></section>')
  XOframeSkeleton.init({ autoHide: 0 })
  const grid = doc.querySelector('.xo-sk-grid')
  assert.ok(grid)
  assert.equal(grid.style.getPropertyValue('--xo-sk-cols'), '3')
  assert.ok(grid.querySelectorAll('.xo-sk-cell').length >= 3)
  assert.ok(grid.querySelector('.xo-sk-box'), 'cells contain a box')
  assert.ok(grid.querySelector('.xo-sk-line'), 'cells contain lines')
  XOframeSkeleton.destroy()
})

test('unknown preset falls back to the article layout (no throw)', () => {
  const doc = setup('<section data-xo-skeleton="does-not-exist"></section>')
  assert.doesNotThrow(() => XOframeSkeleton.init({ autoHide: 0 }))
  assert.ok(doc.querySelector('.xo-skeleton .xo-sk-line'))
  XOframeSkeleton.destroy()
})

test('testimonial preset builds a row with an avatar circle', () => {
  const doc = setup('<section data-xo-skeleton="testimonial"></section>')
  XOframeSkeleton.init({ autoHide: 0 })
  assert.ok(doc.querySelector('.xo-sk-row .xo-sk-circle'))
  XOframeSkeleton.destroy()
})

test('reveal() marks the skeleton done for fade-out', () => {
  const doc = setup('<section data-xo-skeleton="video"></section>')
  XOframeSkeleton.init({ autoHide: 0 })
  const section = doc.querySelector('section')
  XOframeSkeleton.reveal(section)
  assert.ok(section.querySelector('.xo-sk-done'), 'skeleton flagged for fade')
  XOframeSkeleton.destroy()
})

test('auto-hides when the container fires xo:visible', () => {
  const doc = setup('<section data-xo-skeleton="article"></section>')
  XOframeSkeleton.init({ autoHide: 0 })
  const section = doc.querySelector('section')
  section.dispatchEvent(new CustomEvent('xo:visible', { bubbles: true }))
  assert.ok(section.querySelector('.xo-sk-done'))
  XOframeSkeleton.destroy()
})

test('destroy() removes skeletons and clears reserved height', () => {
  const doc = setup('<section data-xo-skeleton="hero" data-xo-min-height="300px"></section>')
  XOframeSkeleton.init({ autoHide: 0 })
  const section = doc.querySelector('section')
  XOframeSkeleton.destroy()
  assert.ok(!section.querySelector('.xo-skeleton'))
  assert.equal(section.style.minHeight, '')
})

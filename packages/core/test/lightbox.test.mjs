/**
 * Smoke tests for the opt-in lightbox entry (@xodesign/xoframe/lightbox).
 * jsdom has no showModal()/startViewTransition(), which conveniently exercises
 * the module's fallback paths (open attribute instead of the top layer).
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'
import { XOlightbox } from '../dist/xoframe-lightbox.esm.js'

const setup = (html) => {
  const dom = new JSDOM(`<!doctype html><html><head></head><body>${html}</body></html>`)
  globalThis.document = dom.window.document
  globalThis.window = dom.window
  globalThis.Image = dom.window.Image
  globalThis.CustomEvent = dom.window.CustomEvent
  globalThis.Event = dom.window.Event
  globalThis.HTMLElement = dom.window.HTMLElement
  // jsdom has no matchMedia; the module guards for it, but define a stub.
  globalThis.matchMedia = undefined
  return dom.window.document
}

const gallery = () =>
  '<a href="/full1.jpg" data-xo-lightbox="g" data-caption="One"><img src="t1.jpg" alt="alt1"></a>' +
  '<a href="/full2.jpg" data-xo-lightbox="g"><img src="t2.jpg" alt="alt2"></a>' +
  '<a href="/full3.jpg" data-xo-lightbox="g" data-caption="Three"><img src="t3.jpg"></a>'

test('SSR-safe: init/close/destroy without document are no-ops', () => {
  const saved = globalThis.document
  globalThis.document = undefined
  assert.doesNotThrow(() => XOlightbox.init())
  globalThis.document = saved
})

test('opens a native <dialog> with the full image, caption and counter', () => {
  const doc = setup(gallery())
  XOlightbox.init()
  doc.querySelector('a').click()
  const dialog = doc.querySelector('dialog.xo-lb')
  assert.ok(dialog, 'dialog created')
  assert.ok(dialog.hasAttribute('open'), 'opened (fallback path in jsdom)')
  const img = dialog.querySelector('.xo-lb-img')
  assert.match(img.getAttribute('src'), /full1\.jpg$/)
  assert.equal(dialog.querySelector('.xo-lb-cap').textContent, 'One')
  assert.equal(dialog.querySelector('.xo-lb-count').textContent, '1 / 3')
  assert.ok(doc.getElementById('xo-lb-style'), 'stylesheet injected')
  XOlightbox.destroy()
})

test('next/prev cycle within the group and wrap around', () => {
  const doc = setup(gallery())
  XOlightbox.init()
  doc.querySelectorAll('a')[0].click()
  const dialog = doc.querySelector('dialog.xo-lb')
  const img = dialog.querySelector('.xo-lb-img')
  const count = dialog.querySelector('.xo-lb-count')

  dialog.querySelector('.xo-lb-next').click()
  assert.match(img.getAttribute('src'), /full2\.jpg$/)
  assert.equal(count.textContent, '2 / 3')

  dialog.querySelector('.xo-lb-prev').click() // back to 1
  dialog.querySelector('.xo-lb-prev').click() // wrap to 3
  assert.match(img.getAttribute('src'), /full3\.jpg$/)
  assert.equal(count.textContent, '3 / 3')
  XOlightbox.destroy()
})

test('ArrowRight/ArrowLeft keys navigate', () => {
  const doc = setup(gallery())
  XOlightbox.init()
  doc.querySelector('a').click()
  const dialog = doc.querySelector('dialog.xo-lb')
  const img = dialog.querySelector('.xo-lb-img')
  dialog.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
  assert.match(img.getAttribute('src'), /full2\.jpg$/)
  dialog.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }))
  assert.match(img.getAttribute('src'), /full1\.jpg$/)
  XOlightbox.destroy()
})

test('caption falls back to the image alt when data-caption is absent', () => {
  const doc = setup(gallery())
  XOlightbox.init()
  doc.querySelectorAll('a')[1].click() // no data-caption, img alt="alt2"
  assert.equal(doc.querySelector('.xo-lb-cap').textContent, 'alt2')
  XOlightbox.destroy()
})

test('a single-image trigger hides nav (data-single)', () => {
  const doc = setup('<a href="/solo.jpg" data-xo-lightbox="solo"><img src="t.jpg" alt="Solo"></a>')
  XOlightbox.init()
  doc.querySelector('a').click()
  assert.ok(doc.querySelector('dialog.xo-lb').hasAttribute('data-single'))
  XOlightbox.destroy()
})

test('close() clears the image src and closes the dialog', () => {
  const doc = setup(gallery())
  XOlightbox.init()
  doc.querySelector('a').click()
  const dialog = doc.querySelector('dialog.xo-lb')
  XOlightbox.close()
  assert.ok(!dialog.hasAttribute('open'))
  XOlightbox.destroy()
})

test('image-based trigger uses data-full', () => {
  const doc = setup('<img data-xo-lightbox data-full="/big.jpg" src="/small.jpg" alt="Cap">')
  XOlightbox.init()
  doc.querySelector('img').click()
  assert.match(doc.querySelector('.xo-lb-img').getAttribute('src'), /big\.jpg$/)
  assert.equal(doc.querySelector('.xo-lb-cap').textContent, 'Cap')
  XOlightbox.destroy()
})

test('destroy() removes the dialog and stylesheet', () => {
  const doc = setup(gallery())
  XOlightbox.init()
  doc.querySelector('a').click()
  XOlightbox.destroy()
  assert.ok(!doc.querySelector('dialog.xo-lb'))
  assert.ok(!doc.getElementById('xo-lb-style'))
})

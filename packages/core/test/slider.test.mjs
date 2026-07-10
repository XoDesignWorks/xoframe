/**
 * The deprecated `@xodesign/xoframe/slider` entry must keep working for 0.11.x
 * users: it is XOcarousel defaulting to the old [data-xo-slider] selector.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'
import { XOslider } from '../dist/xoframe-slider.esm.js'

const setup = (attr) => {
  const dom = new JSDOM(
    `<!doctype html><html><head></head><body><div ${attr}><div>a</div><div>b</div><div>c</div></div></body></html>`
  )
  globalThis.document = dom.window.document
  globalThis.window = dom.window
  globalThis.CustomEvent = dom.window.CustomEvent
  globalThis.matchMedia = () => ({ matches: false })
  return dom.window.document
}

test('XOslider still initializes legacy [data-xo-slider] markup', () => {
  const doc = setup('data-xo-slider')
  const made = XOslider.init()
  assert.equal(made.length, 1)
  assert.equal(made[0].slides.length, 3)
  assert.ok(doc.querySelector('.xo-car-track'), 'backed by the carousel engine')
  XOslider.destroy()
})

test('XOslider forwards options to the carousel (vertical axis works)', () => {
  const doc = setup('data-xo-slider')
  XOslider.init({ axis: 'y' })
  assert.ok(doc.querySelector('[data-xo-slider]').classList.contains('xo-car-y'))
  XOslider.destroy()
})

test('XOslider.destroy restores the DOM', () => {
  const doc = setup('data-xo-slider')
  XOslider.init()
  XOslider.destroy()
  const el = doc.querySelector('[data-xo-slider]')
  assert.equal(el.children.length, 3)
  assert.ok(!el.querySelector('.xo-car-track'))
})

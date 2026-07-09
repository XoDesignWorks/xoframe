/**
 * Smoke tests for the opt-in masonry entry (@xodesign/xoframe/masonry).
 * jsdom reports 0 for offsetHeight/clientWidth, so we stub the geometry the
 * layout reads: a fixed container width, and item heights estimated from the
 * declared width/height (which is exactly the zero-CLS path we care about).
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'
import { XOframeMasonry } from '../dist/xoframe-masonry.esm.js'

const setup = (containerWidth, itemsHtml) => {
  const dom = new JSDOM(`<div data-xo-masonry>${itemsHtml}</div>`)
  const { document } = dom.window
  globalThis.document = document
  globalThis.window = dom.window
  globalThis.CustomEvent = dom.window.CustomEvent
  globalThis.ResizeObserver = undefined
  globalThis.requestAnimationFrame = undefined
  const container = document.querySelector('[data-xo-masonry]')
  Object.defineProperty(container, 'clientWidth', { value: containerWidth, configurable: true })
  return { document, container }
}

test('SSR-safe: init/layout/destroy without window are no-ops', () => {
  assert.doesNotThrow(() => XOframeMasonry.init())
  assert.doesNotThrow(() => XOframeMasonry.layout())
  assert.doesNotThrow(() => XOframeMasonry.destroy())
})

test('lays out items into absolute positions with a known column count', () => {
  // 616px, minColumnWidth 260, gap 16 → floor((616+16)/(260+16)) = 2 columns
  const items = Array.from({ length: 6 }, (_, i) =>
    `<img data-xo width="300" height="${i % 2 ? 400 : 200}">`
  ).join('')
  const { container } = setup(616, items)
  let layoutColumns = 0
  container.addEventListener('xo:layout', (e) => (layoutColumns = e.detail.columns))
  XOframeMasonry.init()

  assert.equal(layoutColumns, 2)
  assert.ok(container.classList.contains('xo-masonry'))
  assert.equal(container.style.position, 'relative')
  const kids = [...container.children]
  for (const kid of kids) {
    assert.equal(kid.style.position, 'absolute')
    assert.ok(kid.style.top.endsWith('px'))
    assert.ok(kid.style.left.endsWith('px'))
  }
  // Two distinct column x-positions.
  const lefts = new Set(kids.map((k) => k.style.left))
  assert.equal(lefts.size, 2)
  // Container height reserved (> 0) before any image loaded.
  assert.ok(parseFloat(container.style.height) > 0)
  XOframeMasonry.destroy()
})

test('shortest-column placement: item 3 stacks under the shorter column', () => {
  // 3 items, 2 columns, colWidth ~ 300. Heights: 200, 400, 200.
  // col0 gets item0 (h≈200/1.5 scaled), col1 gets item1 (taller); item2 → col0 (shorter).
  const { container } = setup(616,
    '<img data-xo width="300" height="200">' +   // 0 → col0
    '<img data-xo width="300" height="400">' +   // 1 → col1 (taller)
    '<img data-xo width="300" height="200">'     // 2 → col0 (shortest)
  )
  XOframeMasonry.init()
  const [a, b, c] = [...container.children]
  assert.equal(a.style.left, c.style.left, 'item 0 and 2 share the shorter column')
  assert.notEqual(a.style.left, b.style.left, 'item 1 is in the other column')
  assert.ok(parseFloat(c.style.top) > 0, 'item 2 is stacked below item 0')
  XOframeMasonry.destroy()
})

test('destroy() clears inline styles and the masonry class', () => {
  const { container } = setup(616, '<img data-xo width="300" height="200">')
  XOframeMasonry.init()
  XOframeMasonry.destroy()
  assert.ok(!container.classList.contains('xo-masonry'))
  assert.equal(container.style.position, '')
  assert.equal(container.firstElementChild.style.position, '')
})

test('layout() can be called again after appending items (load more)', () => {
  const { container, document } = setup(616, '<img data-xo width="300" height="200">')
  XOframeMasonry.init()
  container.insertAdjacentHTML('beforeend', '<img data-xo width="300" height="300">')
  assert.doesNotThrow(() => XOframeMasonry.layout())
  assert.equal(container.children.length, 2)
  assert.equal(container.lastElementChild.style.position, 'absolute')
  XOframeMasonry.destroy()
})

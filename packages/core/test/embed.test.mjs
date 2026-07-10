/**
 * Smoke tests for the opt-in embed entry (@xodesign/xoframe/embed):
 * click-to-load facades for YouTube/Vimeo/Maps/Spotify/Calendly/generic.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'
import { XOframeEmbed } from '../dist/xoframe-embed.esm.js'

const setup = (html) => {
  const dom = new JSDOM(`<!doctype html><html><head></head><body>${html}</body></html>`)
  globalThis.document = dom.window.document
  globalThis.window = dom.window
  globalThis.CustomEvent = dom.window.CustomEvent
  globalThis.HTMLElement = dom.window.HTMLElement
  return dom.window.document
}

test('SSR-safe: init without document is a no-op', () => {
  const saved = globalThis.document
  globalThis.document = undefined
  assert.doesNotThrow(() => XOframeEmbed.init())
  globalThis.document = saved
})

test('YouTube facade: poster + accessible play button, no iframe until click', () => {
  const doc = setup('<div data-xo-embed="youtube" data-video="aqz-KE-bpKQ" data-title="Bunny"></div>')
  XOframeEmbed.init()
  const el = doc.querySelector('[data-xo-embed]')
  assert.equal(el.getAttribute('role'), 'button')
  assert.equal(el.getAttribute('tabindex'), '0')
  assert.equal(el.getAttribute('aria-label'), 'Bunny')
  assert.match(el.style.backgroundImage, /i\.ytimg\.com\/vi\/aqz-KE-bpKQ\/hqdefault\.jpg/)
  assert.ok(el.querySelector('svg'), 'play icon present')
  assert.ok(!el.querySelector('iframe'), 'iframe not loaded yet')

  el.click()
  const iframe = el.querySelector('iframe')
  assert.match(iframe.src, /youtube-nocookie\.com\/embed\/aqz-KE-bpKQ/)
  assert.ok(el.classList.contains('xo-embed-active'))
  assert.equal(el.getAttribute('role'), null, 'role removed once activated')
})

test('Maps facade: data-embed-id builds a google maps embed iframe', () => {
  const doc = setup('<div data-xo-embed="maps" data-embed-id="Eiffel Tower, Paris"></div>')
  XOframeEmbed.init()
  const el = doc.querySelector('[data-xo-embed]')
  el.click()
  const iframe = el.querySelector('iframe')
  assert.match(iframe.src, /google\.com\/maps\?q=Eiffel%20Tower%2C%20Paris&output=embed/)
})

test('Spotify facade: track id builds an open.spotify embed', () => {
  const doc = setup('<div data-xo-embed="spotify" data-embed-id="track/abc123" data-title="Song"></div>')
  XOframeEmbed.init()
  const el = doc.querySelector('[data-xo-embed]')
  el.click()
  assert.match(el.querySelector('iframe').src, /open\.spotify\.com\/embed\/track\/abc123/)
})

test('Calendly facade: path builds a calendly embed', () => {
  const doc = setup('<div data-xo-embed="calendly" data-embed-id="acme/intro"></div>')
  XOframeEmbed.init()
  const el = doc.querySelector('[data-xo-embed]')
  el.click()
  assert.match(el.querySelector('iframe').src, /calendly\.com\/acme\/intro/)
})

test('generic facade: data-embed-src is used verbatim', () => {
  const doc = setup('<div data-xo-embed data-embed-src="https://example.com/widget" data-poster="p.jpg"></div>')
  XOframeEmbed.init()
  const el = doc.querySelector('[data-xo-embed]')
  assert.match(el.style.backgroundImage, /p\.jpg/)
  el.click()
  assert.equal(el.querySelector('iframe').src, 'https://example.com/widget')
})

test('fires a bubbling xo:embed event on activation', () => {
  const doc = setup('<div data-xo-embed="youtube" data-video="x"></div>')
  let detail = null
  doc.addEventListener('xo:embed', (e) => (detail = e.detail))
  XOframeEmbed.init()
  doc.querySelector('[data-xo-embed]').click()
  assert.ok(detail)
  assert.match(detail.src, /youtube-nocookie/)
})

test('Enter key activates the facade (keyboard access)', () => {
  const doc = setup('<div data-xo-embed="youtube" data-video="x"></div>')
  XOframeEmbed.init()
  const el = doc.querySelector('[data-xo-embed]')
  el.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
  assert.ok(el.querySelector('iframe'), 'activated via keyboard')
})

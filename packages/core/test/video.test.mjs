/**
 * Smoke tests for the opt-in video entry (@xodesign/xoframe/video).
 * jsdom has no IntersectionObserver (exercises the immediate-play fallback) and
 * no real HTMLMediaElement.play(); the module swallows those, so we assert on
 * the deferred-source hydration and class/lifecycle behavior.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'
import { XOframeVideo } from '../dist/xoframe-video.esm.js'

const setup = (html, { reducedMotion = false } = {}) => {
  const dom = new JSDOM(`<!doctype html><html><body>${html}</body></html>`)
  globalThis.document = dom.window.document
  globalThis.window = dom.window
  globalThis.matchMedia = () => ({ matches: reducedMotion })
  // Give videos inert play/pause/load so the module's guards have something to call.
  for (const v of dom.window.document.querySelectorAll('video')) {
    v.play = () => Promise.resolve()
    v.pause = () => {}
    v.load = () => {}
  }
  return dom.window.document
}

test('SSR-safe: init/destroy without document are no-ops', () => {
  const saved = globalThis.document
  globalThis.document = undefined
  assert.doesNotThrow(() => XOframeVideo.init())
  globalThis.document = saved
})

test('no IntersectionObserver: hydrates data-src/data-poster and marks playing', () => {
  const doc = setup('<video data-xo-video muted data-poster="p.jpg" data-src="clip.mp4"></video>')
  XOframeVideo.init()
  const v = doc.querySelector('video')
  assert.equal(v.getAttribute('src'), 'clip.mp4', 'deferred source applied')
  assert.equal(v.getAttribute('poster'), 'p.jpg', 'deferred poster applied')
  assert.ok(v.classList.contains('xo-video-playing'))
  XOframeVideo.destroy()
})

test('reduced motion: hydrates but does not autoplay', () => {
  const doc = setup('<video data-xo-video muted data-src="clip.mp4"></video>', { reducedMotion: true })
  XOframeVideo.init()
  const v = doc.querySelector('video')
  assert.equal(v.getAttribute('src'), 'clip.mp4', 'still lazy-loads the source')
  assert.ok(!v.classList.contains('xo-video-playing'), 'no autoplay under reduced motion')
  XOframeVideo.destroy()
})

test('respectReducedMotion:false autoplays even under reduced motion', () => {
  const doc = setup('<video data-xo-video muted data-src="c.mp4"></video>', { reducedMotion: true })
  XOframeVideo.init({ respectReducedMotion: false })
  assert.ok(doc.querySelector('video').classList.contains('xo-video-playing'))
  XOframeVideo.destroy()
})

test('play() rejection/throw is swallowed (autoplay policy safe)', () => {
  const doc = setup('<video data-xo-video muted data-src="c.mp4"></video>')
  const v = doc.querySelector('video')
  v.play = () => { throw new Error('autoplay blocked') }
  assert.doesNotThrow(() => XOframeVideo.init())
  XOframeVideo.destroy()
})

test('destroy pauses tracked videos and clears the playing class', () => {
  const doc = setup('<video data-xo-video muted data-src="c.mp4"></video>')
  let paused = false
  XOframeVideo.init()
  const v = doc.querySelector('video')
  v.pause = () => (paused = true)
  XOframeVideo.destroy()
  assert.ok(paused, 'pause called on destroy')
  assert.ok(!v.classList.contains('xo-video-playing'))
})

test('custom selector is honored', () => {
  const doc = setup('<video class="bg" muted data-src="c.mp4"></video>')
  XOframeVideo.init('.bg')
  assert.equal(doc.querySelector('video').getAttribute('src'), 'c.mp4')
  XOframeVideo.destroy()
})

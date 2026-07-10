/**
 * Smoke tests for the opt-in React adapter (@xodesign/xoframe/react).
 * Rendered to static markup: effects (which call XOframe.observe) don't run, so
 * these assert the DOM contract the core scans for — the same data-xo* markup a
 * vanilla user would write.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { renderToStaticMarkup } from 'react-dom/server'
import { XOImage, XOBackground, XOBlock } from '../dist/xoframe-react.esm.js'
import { createElement as h } from 'react'

test('XOImage renders the core image contract', () => {
  const html = renderToStaticMarkup(
    h(XOImage, {
      src: 'hero.jpg',
      srcSet: 'hero-2x.jpg 2x',
      sizes: 'auto',
      fallback: 'hero.webp, hero.jpg',
      color: '#d8c6a4',
      ratio: '16/9',
      width: 1600,
      height: 900,
      alt: 'Hero'
    })
  )
  assert.match(html, /data-xo=""/)
  assert.match(html, /data-src="hero\.jpg"/)
  assert.match(html, /data-srcset="hero-2x\.jpg 2x"/)
  assert.match(html, /data-sizes="auto"/)
  assert.match(html, /data-fallback="hero\.webp, hero\.jpg"/)
  assert.match(html, /data-color="#d8c6a4"/)
  assert.match(html, /data-ratio="16\/9"/)
  assert.match(html, /width="1600"/)
  assert.match(html, /alt="Hero"/)
})

test('XOImage priority maps to data-xo-priority="high"', () => {
  const html = renderToStaticMarkup(h(XOImage, { src: 'h.jpg', priority: true, alt: 'H' }))
  assert.match(html, /data-xo-priority="high"/)
})

test('XOImage without priority omits the attribute entirely', () => {
  const html = renderToStaticMarkup(h(XOImage, { src: 'h.jpg', alt: 'H' }))
  assert.ok(!html.includes('data-xo-priority'))
})

test('XOImage strategy and gradient pass through', () => {
  const html = renderToStaticMarkup(
    h(XOImage, { src: 'x.jpg', strategy: 'intent', gradient: '#1,#2,#3,#4', alt: '' })
  )
  assert.match(html, /data-xo-strategy="intent"/)
  assert.match(html, /data-gradient="#1,#2,#3,#4"/)
})

test('XOBackground renders responsive background sources', () => {
  const html = renderToStaticMarkup(
    h(XOBackground, {
      bg: 'd.jpg',
      bgMobile: 'm.jpg',
      bgTablet: 't.jpg',
      bgDesktop: 'd.jpg',
      ratio: '16/9',
      color: '#eee'
    })
  )
  assert.match(html, /data-xo-bg=""/)
  assert.match(html, /data-bg="d\.jpg"/)
  assert.match(html, /data-bg-mobile="m\.jpg"/)
  assert.match(html, /data-bg-tablet="t\.jpg"/)
  assert.match(html, /data-bg-desktop="d\.jpg"/)
})

test('XOBlock renders the block contract and its children', () => {
  const html = renderToStaticMarkup(h(XOBlock, null, 'hello'))
  assert.match(html, /data-xo-block=""/)
  assert.match(html, /hello/)
})

test('className and style are forwarded', () => {
  const html = renderToStaticMarkup(
    h(XOImage, { src: 'x.jpg', alt: '', className: 'rounded', style: { borderRadius: 8 } })
  )
  assert.match(html, /class="rounded"/)
  assert.match(html, /border-radius:8px/)
})

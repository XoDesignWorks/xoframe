# @xodesign/xoframe

**Zero-CLS progressive media loading for modern websites.**

Make image-heavy pages feel instant: reserve space → show placeholder → choose priority → load media → reveal smoothly → prevent layout shift.

- ~**2 KB gzip**, zero dependencies, framework-agnostic
- Native browser features first: `IntersectionObserver`, `loading`, `decoding`, `fetchpriority`, `aspect-ratio`
- **LCP-aware**: never lazy-loads your hero image
- **Zero CLS** with correct `width`/`height` or `data-ratio`
- Images, `<picture>`/`srcset`, background images, content blocks
- SEO/noscript-safe: real `<img>` tags stay in the DOM, nothing is hidden without JS

## Install

```bash
npm install @xodesign/xoframe
```

```js
import { XOframe } from '@xodesign/xoframe'
import '@xodesign/xoframe/styles.css'

XOframe.init()
```

Or via CDN (add `data-xo-auto` for automatic init):

```html
<link rel="stylesheet" href="https://unpkg.com/@xodesign/xoframe/dist/xoframe.css">
<script src="https://unpkg.com/@xodesign/xoframe/dist/xoframe.min.js" data-xo-auto></script>
```

## Quick start

```html
<img
  data-xo
  data-src="image-large.jpg"
  data-color="#d8c6a4"
  width="1200"
  height="800"
  alt="Example image"
>
```

The image gets a dominant-color placeholder, loads when it approaches the viewport, and fades in — without moving the layout by a single pixel.

### Responsive images

```html
<picture data-xo>
  <source data-srcset="image-mobile.webp" media="(max-width: 768px)" type="image/webp">
  <source data-srcset="image-desktop.webp" type="image/webp">
  <img data-src="image.jpg" width="1200" height="800" alt="Responsive image">
</picture>
```

### 4-corner gradient placeholder

A blur-like preview from ~30 bytes of markup — no decoder, no canvas, zero JS cost.
Pass up to four corner colors (top-left, top-right, bottom-right, bottom-left):

```html
<img data-xo data-src="image.jpg" data-gradient="#7a6a52,#b8a88f,#4f5d6b,#8fa3b8"
     width="1200" height="800" alt="">
```

### Tiny blurred placeholder (LQIP)

Put your thumbnail in `src` — it shows immediately and the full image paints over it:

```html
<img data-xo src="tiny-blur.jpg" data-src="image-large.jpg" width="1200" height="800" alt="">
```

### Hero images / LCP

With `lcpAware: true` (default) the first large above-the-fold image is loaded eagerly with `fetchpriority="high"`. To mark it explicitly:

```html
<img data-xo data-xo-priority="high" data-src="hero.jpg" width="1600" height="900" alt="">
```

### Auto mode — zero markup

Existing site, CMS output, no way to change templates? One call manages every plain `<img>` on the page:

```js
XOframe.auto()
```

- a wrongly lazy-loaded above-the-fold hero is upgraded to `loading="eager"` + `fetchpriority="high"`;
- below-the-fold images get native `loading="lazy"`;
- every image gets reveal classes and `xo:*` events;
- nothing else in your HTML changes. Exclude an image with `data-xo-skip`.

### Video and iframes

The same pipeline handles `<video>` and `<iframe>`:

```html
<video data-xo data-poster="poster.jpg" data-src="clip.mp4" data-ratio="16/9" controls muted playsinline></video>
<iframe data-xo data-src="https://example.com/widget" data-ratio="16/9" title="Widget"></iframe>
```

The poster reserves the box and stays visible; the file loads near the viewport.

### Embed facades — the biggest byte win

A YouTube embed costs ~1 MB of JavaScript before the user presses play. The facade module
(`@xodesign/xoframe/embed`, separate ~1.7 KB file, never part of the core bundle) shows a poster +
play button and injects the real iframe only on click, with automatic `preconnect` on hover:

```html
<div data-xo-embed="youtube" data-video="aqz-KE-bpKQ" data-title="Big Buck Bunny"></div>
<div data-xo-embed="vimeo" data-video="76979871" data-poster="poster.jpg"></div>
<div data-xo-embed data-embed-src="https://example.com/embed" data-poster="poster.jpg"></div>
```

```js
import { XOframeEmbed } from '@xodesign/xoframe/embed'
XOframeEmbed.init()
```

Keyboard-accessible (`role="button"`, Enter/Space), YouTube goes through `youtube-nocookie.com`,
fires a bubbling `xo:embed` event on activation.

### Intent strategy

`data-xo-strategy="intent"` loads media on the first hover/focus/touch instead of scroll —
ideal for tab panels, dropdown previews and galleries behind interaction:

```html
<img data-xo data-xo-strategy="intent" data-src="preview.jpg" width="1200" height="600" alt="">
```

### Background images

```html
<div data-xo-bg data-bg="section.jpg" data-ratio="16/9" data-color="#e9e2d8"></div>
```

### Content blocks

```html
<section data-xo-block>…</section>
```

Gets `.xo-visible` (and `.is-xo-visible`) when it enters the viewport. The reveal animation is yours to define in CSS — the library never hides content from search engines.

## Options

```js
XOframe.init({
  imageSelector: '[data-xo]',
  bgSelector: '[data-xo-bg]',
  blockSelector: '[data-xo-block]',
  rootMargin: '300px',        // preload distance for media
  blockRootMargin: '0px',     // reveal offset for blocks
  threshold: 0.01,
  fade: true,
  lcpAware: true,
  nativeLazy: true,           // add loading="lazy" to native-src images
  debug: false,               // warn about images that may cause CLS
  auto: false,                // zero-markup mode: manage plain <img> tags too
  networkAware: true,         // Save-Data / 2G: no fade, load only in-viewport
  onBeforeLoad: (el) => {},
  onLoad: (el) => {},
  onError: (el, error) => {},
  onReveal: (el) => {},
  onVisible: (el) => {}
})
```

## Methods

```js
XOframe.init(options)
XOframe.refresh()             // scan for new elements (after DOM updates)
XOframe.load(element)         // force-load one element
XOframe.loadAll()             // force-load everything pending
XOframe.loadInside('#modal')  // load all media inside a container
XOframe.observe(element)      // observe a single new element
XOframe.unobserve(element)
XOframe.pause()               // stop loading (keeps queue)
XOframe.resume()
XOframe.destroy()
```

## Events

All events bubble, so you can listen on `document`:

```js
document.addEventListener('xo:load', (e) => console.log(e.detail.element))
```

`xo:beforeload` · `xo:load` · `xo:error` · `xo:reveal` · `xo:visible`

## Attributes

| Attribute | Applies to | Meaning |
| --- | --- | --- |
| `data-xo` | `img`, `picture`, `video`, `iframe` | Managed media element |
| `data-poster` | `video` | Deferred poster image |
| `data-src` / `data-srcset` | `img`, `source` | Deferred sources |
| `data-sizes` | `img` | `sizes` value, or `auto` to compute from layout width |
| `data-ratio` | any | Aspect ratio, e.g. `16/9` |
| `data-color` | any | Dominant-color placeholder |
| `data-gradient` | any | 4-corner gradient placeholder (`#c1,#c2,#c3,#c4`) |
| `data-xo-priority="high"` | `img` | Eager + `fetchpriority=high` |
| `data-xo-strategy="manual"` | any | Load only via API |
| `data-xo-strategy="intent"` | any | Load on first hover/focus/touch |
| `data-xo-embed` + `data-video` | any | Click-to-load embed facade (embed module) |
| `data-xo-bg` + `data-bg` | any | Lazy background image |
| `data-xo-block` | any | Content block reveal |

## CSS

State classes: `.xo`, `.xo-loading`, `.xo-loaded`, `.xo-error`, `.xo-visible`, `.xo-placeholder`, `.xo-lqip`, `.xo-bg`, `.xo-block`.

Custom properties: `--xo-duration`, `--xo-ease`, `--xo-radius`, `--xo-bg-size`, `--xo-bg-position`.

`prefers-reduced-motion` is respected out of the box.

## Debug overlay — Core Web Vitals guard

A separate dev-only module (never part of the core bundle) that shows live CLS and LCP in an
on-page panel, flashes the elements that caused each layout shift, flags images without
dimensions, and warns when your LCP image was lazy-loaded:

```js
import { XOframeDebug } from '@xodesign/xoframe/debug'
XOframeDebug.init()
```

Or as a classic script: `<script src=".../xoframe-debug.min.js" data-xo-auto></script>`

## Zero-CLS checklist

1. Always set `width` + `height` (or `data-ratio`) — the browser reserves the box before anything loads.
2. Never lazy-load the LCP image — keep `lcpAware: true` or mark the hero with `data-xo-priority="high"`.
3. Use `data-color` or an LQIP so users never stare at empty white boxes.
4. Run with `debug: true` in development — XOframe warns about images that can shift the layout.

## Browser support

Latest Chrome, Safari, Firefox, Edge, iOS Safari, Android Chrome. If `IntersectionObserver` is missing, all media loads immediately (graceful fallback). Unsupported hints (`fetchpriority` etc.) are simply ignored by the browser.

## Migrating from lazysizes / vanilla-lazyload

- `data-src`/`data-srcset` work the same way — usually a class rename (`lazyload` → `data-xo`) is enough.
- Unlike classic lazyloaders, XOframe will *refuse to sabotage your LCP*: above-the-fold heroes load eagerly.
- Placeholders, aspect-ratio locking, and reveal transitions are built in — remove your custom CSS hacks.
- `data-sizes="auto"` replaces lazysizes' automatic `sizes` calculation.
- Large images are `decode()`d off the paint path before reveal, and Save-Data users automatically get a lighter experience.

## License

MIT

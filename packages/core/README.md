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

### ThumbHash / BlurHash placeholders

Hash placeholders live in separate entry points — **import only the one you use, the other
never reaches your bundle** (and the core stays decoder-free):

```html
<img data-xo data-thumbhash="5CgGNYp1d4eAiIh3h3iId3B0B/eI" data-src="image.jpg" width="1200" height="800" alt="">
<img data-xo data-blurhash="LEHV6nWB2yk8pyo0adR*.7kCMdnj" data-src="image.jpg" width="1200" height="800" alt="">
```

```js
import { XOframeThumbhash } from '@xodesign/xoframe/thumbhash' // ~1.5 KB, alpha support, no canvas
// or
import { XOframeBlurhash } from '@xodesign/xoframe/blurhash'   // ~1 KB, resolution/punch options

XOframeThumbhash.init() // render placeholders first…
XOframe.init()          // …then start the loader
```

An invalid hash falls back to `data-gradient`/`data-color` — the page never breaks. The decoded
placeholder is cleared shortly after the real image loads to free memory. The reference MIT
decoders (evanw/thumbhash, wolt/blurhash) are bundled at build time, so the package keeps zero
runtime dependencies.

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

### INP guard (built in)

Classic lazy-loaders scan every `<img>` in one synchronous pass — on a gallery with hundreds of
images that is a long task that blocks interaction and hurts **INP**. XOframe processes elements
in chunks, yielding to the main thread between them via `scheduler.yield()` (with a `setTimeout`
fallback). The first chunk runs synchronously so the LCP hero is still found immediately; the long
tail is spread across later tasks. On a 300-image page this cut the scan's synchronous work from
~148 ms to ~2 ms in testing.

```js
XOframe.init({ batchSize: 50 }) // default; set 0 to force fully synchronous scanning
```

### Resilient sources (`data-fallback`)

If the primary source fails, XOframe tries each comma-separated fallback before giving up — format
failover (AVIF → WebP → JPG) or a backup CDN:

```html
<img data-xo data-src="hero.avif" data-fallback="hero.webp, hero.jpg" width="1600" height="900" alt="">
```

`.xo-error` is only set once the whole chain is exhausted.

### Auto-preconnect

When a priority image (`data-xo-priority="high"` / the detected LCP) is served from a cross-origin
host, XOframe injects a `<link rel="preconnect">` so the connection is warm before the request —
faster LCP. On by default; disable with `preconnect: false`.

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
<!-- non-video providers use data-embed-id -->
<div data-xo-embed="maps" data-embed-id="Eiffel Tower, Paris"></div>
<div data-xo-embed="spotify" data-embed-id="track/4cOdK2wGLETKBW3PvgPWqT"></div>
<div data-xo-embed="calendly" data-embed-id="acme/intro"></div>
<div data-xo-embed data-embed-src="https://example.com/embed" data-poster="poster.jpg"></div>
```

Providers: `youtube`, `vimeo`, `maps`, `spotify`, `calendly`, or a generic `data-embed-src`.

```js
import { XOframeEmbed } from '@xodesign/xoframe/embed'
XOframeEmbed.init()
```

Keyboard-accessible (`role="button"`, Enter/Space), YouTube goes through `youtube-nocookie.com`,
fires a bubbling `xo:embed` event on activation.

### Background video (play only on screen)

`@xodesign/xoframe/video` (~0.9 KB, separate entry) autoplays a muted background video only while
it is in the viewport and pauses it when scrolled away — saving CPU, battery and main-thread work.
It also lazily applies `data-src`/`data-poster` on first view.

```html
<video data-xo-video muted loop playsinline poster="poster.jpg" data-src="clip.mp4"></video>
```

```js
import { XOframeVideo } from '@xodesign/xoframe/video'
XOframeVideo.init() // { threshold: 0.25, respectReducedMotion: true }
```

Autoplay rejections (browser policy) are swallowed; reduced-motion users get the poster only.

### Intent strategy

`data-xo-strategy="intent"` loads media on the first hover/focus/touch instead of scroll —
ideal for tab panels, dropdown previews and galleries behind interaction:

```html
<img data-xo data-xo-strategy="intent" data-src="preview.jpg" width="1200" height="600" alt="">
```

### Masonry gallery — zero CLS

`@xodesign/xoframe/masonry` (~1.3 KB, separate entry) computes an Unsplash/Pinterest-style
layout from each item's **known aspect ratio** (`width`/`height` or `data-ratio`) — positions
are final before any image loads, so the grid never reflows:

```html
<div data-xo-masonry>
  <img data-xo data-src="1.jpg" width="1200" height="800" alt="">
  <img data-xo data-src="2.jpg" width="900"  height="1200" alt="">
</div>
```

```js
import { XOframeMasonry } from '@xodesign/xoframe/masonry'
XOframeMasonry.init('[data-xo-masonry]', { minColumnWidth: 260, gap: 16 })
```

Responsive column count (via `ResizeObserver`), shortest-column packing, and `XOframeMasonry.layout()`
to re-flow after appending items (load-more). Fires a bubbling `xo:layout` event.

### Skeleton presets

`@xodesign/xoframe/skeleton` (~2 KB, separate entry) fills a block with an animated placeholder
that occupies the same box the real content will — zero layout shift when content swaps in:

```html
<section data-xo-skeleton="cards"></section>
<section data-xo-skeleton="article" data-xo-min-height="480px"></section>
```

```js
import { XOframeSkeleton } from '@xodesign/xoframe/skeleton'
XOframeSkeleton.init()
```

Presets: `hero`, `cards`, `products`, `gallery`, `article`, `testimonial`, `profile`, `video`,
`map`, `pricing`, `media-text`. The skeleton fades out when the block fires `xo:visible`/`xo:reveal`,
when you call `XOframeSkeleton.reveal(el)`, or after the `autoHide` safety timeout. Style it with
`--xo-skeleton-color`, `--xo-skeleton-shine`, `--xo-skeleton-radius`. Respects reduced motion.

### Content-visibility manager

`@xodesign/xoframe/visibility` (~1 KB, separate entry) skips rendering work for off-screen blocks
with `content-visibility: auto` while reserving their height, so the scrollbar never jumps:

```html
<section data-xo-visibility data-xo-intrinsic-size="800px">…</section>
<section data-xo-visibility data-xo-intrinsic-size="600px 900px">…</section>
```

```js
import { XOframeVisibility } from '@xodesign/xoframe/visibility'
XOframeVisibility.init({ debug: true }) // warns when a reserved height is far off
```

Feature-detected (safe no-op where unsupported). Opt a critical/above-the-fold block out with
`data-xo-visibility="off"`.

### XOlightbox

`@xodesign/xoframe/lightbox` (~2.1 KB, separate entry) is a lightbox built on the native
`<dialog>` element (free focus trap, Esc, backdrop, `aria-modal`) and the View Transitions API
for a smooth zoom — vs. ~50 KB for Fancybox:

```html
<a href="full-1.jpg" data-xo-lightbox="portfolio"><img src="thumb-1.jpg" alt="One"></a>
<a href="full-2.jpg" data-xo-lightbox="portfolio" data-caption="Two"><img src="thumb-2.jpg"></a>
<!-- or straight on an image -->
<img data-xo-lightbox data-full="full.jpg" src="thumb.jpg" alt="Caption">
```

```js
import { XOlightbox } from '@xodesign/xoframe/lightbox'
XOlightbox.init()
```

Images sharing a `data-xo-lightbox` value form a group with prev/next and a counter. Keyboard:
Esc to close, ←/→ to navigate. Captions from `data-caption` or the thumbnail's `alt`. Neighbors
are preloaded. Reduced motion disables the transition. `XOlightbox.close()` / `.destroy()` too.

### XOslider

`@xodesign/xoframe/slider` (~2.4 KB, separate entry) is a carousel where the **browser does the
hard part**: native CSS `scroll-snap` provides momentum, touch and trackpad scrolling, so there is
no animation loop, no transform math and no scroll listener. JS only adds arrows, dots, autoplay
and active tracking (via `IntersectionObserver`, keeping INP low) — vs ~40 KB for Swiper.

```html
<div data-xo-slider>
  <div><img data-xo data-src="1.jpg" width="1200" height="800" alt=""></div>
  <div><img data-xo data-src="2.jpg" width="1200" height="800" alt=""></div>
</div>
```

```js
import { XOslider } from '@xodesign/xoframe/slider'
XOslider.init('[data-xo-slider]', {
  slidesPerView: 1, gap: 16, arrows: true, dots: true, loop: true, autoplay: 0, label: 'Photos'
})
```

Returns instances with `next()`, `prev()`, `goTo(i)`, `index`, `destroy()`, and fires a bubbling
`xo:slide` event. Accessible by default (`role="region"`, `aria-roledescription="carousel"`,
labelled slides, arrow keys). Autoplay pauses on hover/focus and when the tab is hidden; reduced
motion disables autoplay and smooth scrolling. `loop` wraps at the ends (it does not clone slides).

### Web font stability

`@xodesign/xoframe/fonts` (~1.2 KB, separate entry) tackles the **#2 cause of CLS after images**:
a web font swapping in with different metrics than the fallback reflows every line of text. It
registers a metric-adjusted fallback `@font-face` (`size-adjust` measured at runtime, or from
precomputed metrics) so the fallback occupies the same space as the web font — the swap shifts
nothing. It also preloads fonts and flags `<html>` once fonts are ready:

```js
import { XOframeFonts } from '@xodesign/xoframe/fonts'
XOframeFonts.init({
  fonts: [{
    family: 'Inter',
    fallback: 'Arial, sans-serif',
    selector: 'body',
    preload: '/fonts/inter.woff2',
    // optional — supply precomputed metrics (e.g. from Fontaine) for pixel-perfect zero CLS:
    sizeAdjust: '107%', ascentOverride: '90%', descentOverride: '22%'
  }]
})
```

Without precomputed metrics the width-based `size-adjust` is measured at runtime (handles the
dominant reflow); for pixel-perfect vertical metrics pass `ascentOverride`/`descentOverride`.
`.xo-fonts-loaded` is added to `<html>` on `document.fonts.ready` for a controlled reveal.

### Background images

```html
<div data-xo-bg data-bg="section.jpg" data-ratio="16/9" data-color="#e9e2d8"></div>
```

Responsive sources per breakpoint (mobile <768, tablet ≥768, desktop ≥1024; `data-bg` is the fallback):

```html
<div data-xo-bg
     data-bg-mobile="s-mobile.jpg" data-bg-tablet="s-tablet.jpg" data-bg-desktop="s-desktop.jpg"
     data-bg="s-desktop.jpg" data-ratio="16/9" data-color="#e9e2d8"></div>
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
  batchSize: 50,              // INP guard: elements per task (0 = fully sync)
  preconnect: true,           // warm the LCP image's cross-origin host
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
| `data-fallback` | `img` | Comma-separated backup sources tried on error |
| `data-ratio` | any | Aspect ratio, e.g. `16/9` |
| `data-color` | any | Dominant-color placeholder |
| `data-gradient` | any | 4-corner gradient placeholder (`#c1,#c2,#c3,#c4`) |
| `data-thumbhash` / `data-blurhash` | any | Hash placeholders (thumbhash/blurhash modules) |
| `data-bg-mobile/tablet/desktop` | `data-xo-bg` | Responsive background sources |
| `data-xo-priority="high"` | `img` | Eager + `fetchpriority=high` |
| `data-xo-strategy="manual"` | any | Load only via API |
| `data-xo-strategy="intent"` | any | Load on first hover/focus/touch |
| `data-xo-embed` + `data-video` | any | Click-to-load embed facade (embed module) |
| `data-xo-masonry` | container | Zero-CLS masonry gallery (masonry module) |
| `data-xo-skeleton` | block | Animated placeholder preset (skeleton module) |
| `data-xo-visibility` + `data-xo-intrinsic-size` | block | content-visibility (visibility module) |
| `data-xo-lightbox` | `a`, `img` | Lightbox trigger; shared value = group (lightbox module) |
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

## React

`@xodesign/xoframe/react` (~1.7 KB, separate entry, React is an optional peer dependency) provides
thin wrappers — no logic is duplicated, they render the same `data-xo*` markup and register with
the core:

```jsx
import { XOframe } from '@xodesign/xoframe'
import { XOImage, XOBackground, XOBlock } from '@xodesign/xoframe/react'

XOframe.init() // once, at app startup

<XOImage src="/hero.jpg" width={1600} height={900} priority alt="Hero" />
<XOImage src="/photo.jpg" color="#d8c6a4" fallback="/photo.webp, /photo.jpg" width={1200} height={800} alt="" />
<XOBackground bg="/section.jpg" bgMobile="/m.jpg" ratio="16/9" color="#e9e2d8" />
<XOBlock>…revealed on scroll…</XOBlock>
```

Components mounted before `init()` are picked up by its initial scan; ones mounted later register
themselves on mount and release on unmount.

## Production vitals reporting

The debug overlay is dev-only. `@xodesign/xoframe/vitals` (~1 KB, separate entry) is the
production-safe reporter — it emits **LCP, CLS, INP** (plus FCP, TTFB) with Google ratings to your
callback, so you can send field data to analytics:

```js
import { XOframeVitals } from '@xodesign/xoframe/vitals'
XOframeVitals.init({
  onReport: (m) => navigator.sendBeacon('/vitals', JSON.stringify(m)) // { name, value, rating }
})
```

Values finalize when the page is hidden/unloaded (or per change with `reportAllChanges: true`).
CLS uses the session-window algorithm; INP approximates as the worst interaction latency.

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

MIT. The optional placeholder entries bundle the reference decoders
[thumbhash](https://github.com/evanw/thumbhash) (© Evan Wallace, MIT) and
[blurhash](https://github.com/woltapp/blurhash) (© Wolt, MIT).

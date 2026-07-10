# Changelog

All notable changes to this project are documented in this file.
The format follows [Keep a Changelog](https://keepachangelog.com/) and the project adheres to [Semantic Versioning](https://semver.org/).

## [0.13.0] — 2026-07-09

### Added
- `@xodesign/xoframe/carousel` (**XOcarousel**, ~3.2 KB) — supersedes XOslider with a **vertical axis** (`axis: 'y'`) alongside the horizontal one, plus:
  - **Mouse drag-to-scroll**, the one thing a native scroll container lacks (touch/trackpad stay native, and drag is not hijacked on touch);
  - **WCAG 2.2.2 compliance**: autoplay is off by default, and when enabled it ships a real pause/play button — once the user pauses, it stays paused (hovering out no longer resumes it);
  - **Live-region announcements** ("Slide 2 of 5") for screen readers;
  - **Scrolling without JavaScript (opt-in)**: link `@xodesign/xoframe/carousel.css` and pre-render the `.xo-car-track` wrapper, and the carousel is a usable snapping strip before JS loads; JS then only upgrades it with arrows, dots and autoplay.
- `@xodesign/xoframe/carousel.css` — the carousel stylesheet, also inlined into the module at build time (single source of truth).

### Changed
- `@xodesign/xoframe/slider` (**deprecated**) is now a thin shim over XOcarousel that keeps the old `[data-xo-slider]` selector working. The CSS classes changed (`.xo-slider-*` → `.xo-car-*`).

### Notes
- Still ~3.2 KB with arrows, dots, ARIA and autoplay included — compare Embla/keen-slider (~7 KB, headless), Splide (~27 KB), Swiper (~47 KB, ~20 KB tree-shaken). Core bundle unchanged (~2.9 KB gzip).

## [0.12.0] — 2026-07-09

### Added
- `@xodesign/xoframe/react` (~1.7 KB) — `XOImage`, `XOBackground`, `XOBlock`: thin wrappers that render the same `data-xo*` markup and register with the core on mount (releasing on unmount). No logic is duplicated. React is an **optional peer dependency**, and the core is imported as an external module so it is never bundled twice.

### Notes
- Core bundle unchanged (~2.9 KB gzip).

## [0.11.0] — 2026-07-09

### Added
- `@xodesign/xoframe/slider` (**XOslider**, ~2.4 KB) — second product in the XOframe family: a carousel built on native CSS `scroll-snap`, so the browser provides momentum, touch and trackpad scrolling. No animation loop, no transform math, no scroll listener; active tracking uses `IntersectionObserver` to keep INP low. Arrows, dots, autoplay (pauses on hover/focus/tab-hidden), `slidesPerView`, `gap`, wrap-around `loop`, keyboard nav, full ARIA carousel semantics, reduced-motion aware, `xo:slide` event, and instance API (`next`/`prev`/`goTo`/`index`/`destroy`). ~40 KB for Swiper → 2.4 KB here.

### Notes
- Core bundle unchanged (~2.9 KB gzip) — separate entry point.
- `loop` wraps at the ends rather than cloning slides for a seamless infinite track.

## [0.10.0] — 2026-07-09

### Added
- **More embed facades** — `maps` (Google Maps), `spotify` and `calendly` join `youtube`/`vimeo`/generic. Non-video providers take `data-embed-id`. Each third-party payload still loads only on click, with hover `preconnect`. Embed module is ~1.8 KB.
- `@xodesign/xoframe/video` (~0.9 KB) — background video that autoplays only while on screen and pauses when scrolled away (saves CPU, battery, main-thread work). Lazily applies `data-src`/`data-poster`, swallows autoplay-policy rejections, and honours `prefers-reduced-motion`.

### Notes
- Core bundle unchanged (~2.9 KB gzip). First test coverage for the embed module (8 tests).

## [0.9.0] — 2026-07-09

### Added
- `@xodesign/xoframe/vitals` (~1 KB) — production Core Web Vitals reporter. Emits LCP, CLS, INP (plus FCP, TTFB) with Google ratings to an `onReport` callback for real-user monitoring (e.g. `navigator.sendBeacon`). CLS uses the session-window algorithm; INP approximates as the worst interaction latency; metrics finalize on page hide, or per change with `reportAllChanges`. Complements the dev-only debug overlay — now XOframe measures all three CWV in both dev and production.

### Notes
- Core bundle unchanged (~2.9 KB gzip) — separate entry point.

## [0.8.0] — 2026-07-09

### Added
- **`data-fallback`** — comma-separated backup sources tried in order when the primary fails (AVIF→WebP→JPG format failover, or a backup CDN). `.xo-error` is set only after the whole chain is exhausted.
- **Auto-preconnect** — a priority/LCP image on a cross-origin host gets a `<link rel="preconnect">` so its connection is warm before the request, speeding up LCP. New `preconnect` option (default true).

### Notes
- Core is now ~2.9 KB gzip, still within the 3 KB budget (headroom is getting tight — further core features will likely land as modules).

## [0.7.0] — 2026-07-09

### Added
- `@xodesign/xoframe/fonts` (~1.2 KB) — web font stability, the #2 cause of CLS after images. Registers a metric-adjusted fallback `@font-face` (`size-adjust` measured at runtime, or precomputed `size-adjust`/`ascent-override`/`descent-override`/`line-gap-override`) so the fallback matches the web font and the swap shifts nothing. Also preloads fonts and adds `.xo-fonts-loaded` to `<html>` on `document.fonts.ready` for a controlled reveal.

### Notes
- Core bundle unchanged (~2.7 KB gzip) — separate entry point.

## [0.6.0] — 2026-07-09

### Added
- **INP guard** in core — scanning is now chunked with `scheduler.yield()` (fallback `setTimeout`) so a page with hundreds of images never blocks the main thread in one long task. The first chunk stays synchronous to keep LCP detection immediate; the tail is spread across later tasks. New `batchSize` option (default 50; 0 disables). In testing, a 300-image scan dropped from ~148 ms to ~2 ms of synchronous work — now XOframe helps all three Core Web Vitals (CLS, LCP, INP).

### Notes
- Core is now ~2.7 KB gzip (from ~2.5 KB), still within the 3 KB budget.

## [0.5.0] — 2026-07-09

### Added
- `@xodesign/xoframe/lightbox` (**XOlightbox**, ~2.1 KB) — first product in the XOframe family: a lightbox on the native `<dialog>` element (free focus trap, Esc, backdrop, aria-modal) + View Transitions API zoom, with graceful fallbacks. Grouped galleries via a shared `data-xo-lightbox` value, prev/next + counter, keyboard nav (←/→/Esc), neighbor preloading, captions from `data-caption`/`alt`, reduced-motion aware. ~50 KB for Fancybox → 2.1 KB here.

### Notes
- Core bundle unchanged (~2.5 KB gzip) — separate entry point.

## [0.4.0] — 2026-07-09

### Added
- `@xodesign/xoframe/skeleton` (~2 KB) — animated block skeleton presets (`hero`, `cards`, `products`, `gallery`, `article`, `testimonial`, `profile`, `video`, `map`, `pricing`, `media-text`). Reserves the block's box, fades out on `xo:visible`/`xo:reveal`, `XOframeSkeleton.reveal(el)`, or an `autoHide` timeout. Themeable via `--xo-skeleton-*`, respects reduced motion.
- `@xodesign/xoframe/visibility` (~1 KB) — content-visibility manager: applies `content-visibility: auto` + `contain-intrinsic-size` to off-screen blocks (feature-detected, safe no-op where unsupported). `data-xo-visibility="off"` opts critical blocks out; `debug: true` warns on wildly wrong intrinsic sizes.

### Notes
- Core bundle unchanged (~2.5 KB gzip) — both are separate entry points, zero cost unless imported.

## [0.3.0] — 2026-07-09

### Added
- `@xodesign/xoframe/masonry` (~1.3 KB) — zero-CLS masonry gallery. Column positions are computed from each item's known aspect ratio (`width`/`height` or `data-ratio`) before any image loads, so the grid never reflows. Responsive column count via `ResizeObserver`, shortest-column packing, `XOframeMasonry.layout()` for load-more, bubbling `xo:layout` event.

### Notes
- Core bundle unchanged (~2.5 KB gzip) — masonry is a separate entry point, so it costs nothing unless imported.

## [0.2.0] — 2026-07-09

One product, modular entry points: everything ships in `@xodesign/xoframe`, but each scenario is
a separate file — importing one placeholder never pulls the code of the others.

### Added
- `@xodesign/xoframe/thumbhash` — ThumbHash placeholders (~28-byte hashes, alpha support, rendered without canvas); invalid hashes fall back to `data-gradient`/`data-color`
- `@xodesign/xoframe/blurhash` — BlurHash placeholders with `resolution`/`punch` options
- Responsive backgrounds: `data-bg-mobile` / `data-bg-tablet` / `data-bg-desktop` with `data-bg` fallback
- Decoded hash placeholders are cleared after the real image loads to free memory

### Notes
- Reference MIT decoders (evanw/thumbhash, wolt/blurhash) are bundled at build time — the package still has zero runtime dependencies

## [0.1.0] — 2026-07-08

First public release of `@xodesign/xoframe`.

### Added
- Lazy loading for `<img>`, `<picture>`/`srcset`, background images (`data-xo-bg`) and content block reveal (`data-xo-block`)
- Zero-CLS space reservation via `width`/`height` or `data-ratio`
- Placeholders: dominant color (`data-color`), 4-corner CSS gradient (`data-gradient`, no decoder), tiny image / LQIP (`src` + `data-src`)
- LCP-aware mode (default): the first large above-the-fold image loads eagerly with `fetchpriority="high"`; explicit `data-xo-priority="high"`
- Zero-markup auto mode: `XOframe.auto()` manages plain `<img>` tags — fixes wrongly lazy-loaded heroes, adds native lazy below the fold
- `data-sizes="auto"` — computes the `sizes` attribute from the actual layout width
- `img.decode()` before reveal with a 250 ms timeout race (no jank, no hangs in background tabs)
- `networkAware` option (default on): Save-Data / 2G connections get no fade and in-viewport-only loading
- Full API: `init`, `auto`, `refresh`, `load`, `loadAll`, `loadInside`, `observe`, `unobserve`, `pause`, `resume`, `destroy`
- Bubbling events `xo:beforeload` / `xo:load` / `xo:error` / `xo:reveal` / `xo:visible` + callbacks
- Lazy `<video>` (deferred `data-poster`/`data-src`/`<source>`, reveal on `loadeddata`) and lazy `<iframe>` through the same pipeline
- `intent` strategy: load on first hover/focus/touch — for tabs, dropdowns and interaction-gated galleries
- Embed facades (`@xodesign/xoframe/embed`, separate ~1.7 KB file): click-to-load YouTube (`youtube-nocookie`) / Vimeo / generic iframes with auto poster, keyboard access and hover `preconnect`
- Dev-only debug overlay (`@xodesign/xoframe/debug`): live CLS/LCP panel, layout-shift culprit flashing, lazy-LCP warning, missing-dimensions audit
- Builds: ESM, CJS, UMD, minified IIFE for CDN (opt-in auto-init via `data-xo-auto`), TypeScript types, optional CSS
- CI-enforced size budget: core ≤ 3 KB gzip (currently ~2.4 KB)
- Graceful fallbacks: no IntersectionObserver → load immediately; SSR-safe no-op

### Known limitations
- WordPress plugin (`packages/wordpress/xoframe`) is an untested MVP and is not part of this release

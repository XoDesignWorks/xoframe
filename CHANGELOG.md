# Changelog

All notable changes to this project are documented in this file.
The format follows [Keep a Changelog](https://keepachangelog.com/) and the project adheres to [Semantic Versioning](https://semver.org/).

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

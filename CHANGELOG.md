# Changelog

All notable changes to this project are documented in this file.
The format follows [Keep a Changelog](https://keepachangelog.com/) and the project adheres to [Semantic Versioning](https://semver.org/).

## [0.1.0] — 2026-07-08

First public release of `@xoframe/core`.

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
- Embed facades (`@xoframe/core/embed`, separate ~1.7 KB file): click-to-load YouTube (`youtube-nocookie`) / Vimeo / generic iframes with auto poster, keyboard access and hover `preconnect`
- Dev-only debug overlay (`@xoframe/core/debug`): live CLS/LCP panel, layout-shift culprit flashing, lazy-LCP warning, missing-dimensions audit
- Builds: ESM, CJS, UMD, minified IIFE for CDN (opt-in auto-init via `data-xo-auto`), TypeScript types, optional CSS
- CI-enforced size budget: core ≤ 3 KB gzip (currently ~2.4 KB)
- Graceful fallbacks: no IntersectionObserver → load immediately; SSR-safe no-op

### Known limitations
- WordPress plugin (`packages/wordpress/xoframe`) is an untested MVP and is not part of this release

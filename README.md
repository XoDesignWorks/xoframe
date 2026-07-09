# XOframe

[![CI](https://github.com/XoDesignWorks/xoframe/actions/workflows/ci.yml/badge.svg)](https://github.com/XoDesignWorks/xoframe/actions/workflows/ci.yml)

Zero-CLS progressive media loading. Monorepo for the XOframe library family.

```text
reserve space → show placeholder → choose priority → load media → reveal smoothly → prevent layout shift
```

**Measured on the same landing page** ([demo/compare.html](demo/compare.html), local Lighthouse run):

| Metric | Before | After (XOframe) |
| --- | --- | --- |
| Cumulative Layout Shift | 0.324 | **0** |
| Page weight (initial load) | 959 KB | **486 KB (−49%)** |
| Network requests | 35 | **13** |
| Lighthouse performance | 69 | **88** |

## Packages

One package, many entry points — **you only ship what you import**; every module below is a
separate file that never reaches your bundle unless used:

| Entry | Status | Description |
| --- | --- | --- |
| [`@xodesign/xoframe`](packages/core) | ✅ v0.6.0 | Core (~2.7 KB gzip): lazy images/`<video>`/`<iframe>`, `<picture>`/srcset, responsive backgrounds, block reveal, **LCP-aware + INP guard**, zero-markup auto mode, intent strategy, color/gradient/LQIP placeholders. Helps all three Core Web Vitals. |
| `@xodesign/xoframe/thumbhash` | ✅ v0.4.0 | ThumbHash placeholders (~1.5 KB, alpha, no canvas) |
| `@xodesign/xoframe/blurhash` | ✅ v0.4.0 | BlurHash placeholders (~1 KB + decoder) |
| `@xodesign/xoframe/embed` | ✅ v0.4.0 | Click-to-load YouTube/Vimeo/iframe facades (~1.7 KB) |
| `@xodesign/xoframe/masonry` | ✅ v0.4.0 | Zero-CLS masonry gallery from known aspect ratios (~1.3 KB) |
| `@xodesign/xoframe/skeleton` | ✅ v0.4.0 | Animated block skeleton presets (~2 KB) |
| `@xodesign/xoframe/visibility` | ✅ v0.4.0 | content-visibility manager for off-screen blocks (~1 KB) |
| `@xodesign/xoframe/lightbox` | ✅ v0.5.0 | **XOlightbox** — native `<dialog>` + View Transitions lightbox (~2.1 KB) |
| `@xodesign/xoframe/fonts` | ✅ v0.7.0 | Web font stability: size-adjusted fallback to stop font CLS (~1.2 KB) |
| `@xodesign/xoframe/debug` | ✅ v0.4.0 | Dev-only live CLS/LCP guard overlay |
| [XOframe for WordPress](packages/wordpress/xoframe) | 🧪 MVP, untested on live WP | Zero-config plugin: rewrites content images on the fly, dominant-color placeholders via GD. Build assets with `npm run build:wp`. |
| XOslider · framework components | planned | Next |

## Development

```bash
npm install
npm run build     # builds packages/core → dist (ESM, CJS, UMD, IIFE, CSS, d.ts)
npm run demo      # serves the repo at http://localhost:4173 — open /demo/
```

The build fails if the CDN bundle exceeds the 3 KB gzip budget (currently ~2.0 KB).

## Demos

Static pages in [demo/](demo/): basic images, LCP-aware hero, product grid, lazy backgrounds, content blocks + manual API.

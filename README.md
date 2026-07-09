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
| [`@xodesign/xoframe`](packages/core) | ✅ v0.3.0 | Core (~2.5 KB gzip): lazy images/`<video>`/`<iframe>`, `<picture>`/srcset, responsive backgrounds, block reveal, LCP-aware mode, zero-markup auto mode, intent strategy, color/gradient/LQIP placeholders. |
| `@xodesign/xoframe/thumbhash` | ✅ v0.3.0 | ThumbHash placeholders (~1.5 KB, alpha, no canvas) |
| `@xodesign/xoframe/blurhash` | ✅ v0.3.0 | BlurHash placeholders (~1 KB + decoder) |
| `@xodesign/xoframe/embed` | ✅ v0.3.0 | Click-to-load YouTube/Vimeo/iframe facades (~1.7 KB) |
| `@xodesign/xoframe/masonry` | ✅ v0.3.0 | Zero-CLS masonry gallery from known aspect ratios (~1.3 KB) |
| `@xodesign/xoframe/debug` | ✅ v0.3.0 | Dev-only live CLS/LCP guard overlay |
| [XOframe for WordPress](packages/wordpress/xoframe) | 🧪 MVP, untested on live WP | Zero-config plugin: rewrites content images on the fly, dominant-color placeholders via GD. Build assets with `npm run build:wp`. |
| skeleton presets / content-visibility / framework components | planned | Next phases |

## Development

```bash
npm install
npm run build     # builds packages/core → dist (ESM, CJS, UMD, IIFE, CSS, d.ts)
npm run demo      # serves the repo at http://localhost:4173 — open /demo/
```

The build fails if the CDN bundle exceeds the 3 KB gzip budget (currently ~2.0 KB).

## Demos

Static pages in [demo/](demo/): basic images, LCP-aware hero, product grid, lazy backgrounds, content blocks + manual API.

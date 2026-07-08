# XOframe

Zero-CLS progressive media loading. Monorepo for the XOframe library family.

```text
reserve space → show placeholder → choose priority → load media → reveal smoothly → prevent layout shift
```

## Packages

| Package | Status | Description |
| --- | --- | --- |
| [`@xoframe/core`](packages/core) | ✅ v0.1.0 | Free core: lazy images, `<picture>`/srcset, backgrounds, block reveal, LCP-aware mode, zero-markup auto mode. ~2.1 KB gzip. Ships a dev-only debug overlay (live CLS/LCP guard) as a separate file. |
| [XOframe for WordPress](packages/wordpress/xoframe) | 🧪 MVP, untested on live WP | Zero-config plugin: rewrites content images on the fly, dominant-color placeholders via GD, piggybacks on WP's LCP heuristics. Build assets with `npm run build:wp`. |
| `@xoframe/blurhash` | planned (Pro) | BlurHash placeholder decoding |
| `@xoframe/thumbhash` | planned (Pro) | ThumbHash placeholder decoding |
| `@xoframe/masonry` | planned (Pro) | Zero-CLS masonry/grid galleries |
| `@xoframe/react` / `vue` / `svelte` | planned (Pro) | Framework components |

## Development

```bash
npm install
npm run build     # builds packages/core → dist (ESM, CJS, UMD, IIFE, CSS, d.ts)
npm run demo      # serves the repo at http://localhost:4173 — open /demo/
```

The build fails if the CDN bundle exceeds the 3 KB gzip budget (currently ~2.0 KB).

## Demos

Static pages in [demo/](demo/): basic images, LCP-aware hero, product grid, lazy backgrounds, content blocks + manual API.

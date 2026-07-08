# XOframe for WordPress (MVP)

Automatic zero-CLS media loading for WordPress. **No template changes** — activate and it works.

## What it does

- Rewrites every content `<img>` on the fly via the `wp_content_img_tag` filter (WP 6.3+), plus featured images via `post_thumbnail_html`.
- Piggybacks on WordPress's own LCP heuristics: images WP marked `fetchpriority="high"`/`loading="eager"` keep their `src` intact (preload scanner still sees them) and get `data-xo-priority="high"`; images WP marked `loading="lazy"` are deferred (`src` → `data-src`) and orchestrated by XOframe.
- Generates a **dominant-color placeholder** per image with GD (1-pixel downscale of the smallest thumbnail), cached in postmeta; computed at upload time for new images.
- Inserts a transparent SVG stand-in so deferred images keep their box and never flash alt text.
- Enqueues `xoframe.min.js` (deferred) + `xoframe.css` and calls `XOframe.init()` on `DOMContentLoaded`.
- Skips admin, feeds, embeds, REST, Customizer preview, and AMP requests.

## Opting out per image

Add the `skip-lazy` class (the ecosystem-standard convention) or a `data-xo-skip` attribute.

## Filters

```php
add_filter( 'xoframe_enabled', '__return_false' );          // kill switch
add_filter( 'xoframe_defer_images', '__return_false' );     // priorities/placeholders only, no src deferral
add_filter( 'xoframe_init_options', function ( $options ) { // JS init options
    $options['rootMargin'] = '500px';
    return $options;
} );
```

## Install (development)

1. Build the core and copy assets: `npm run build:wp` from the repo root.
2. Copy `packages/wordpress/xoframe/` into `wp-content/plugins/`.
3. Activate **XOframe — Zero-CLS Media Loading** in the admin.

Requires WordPress 6.3+ (uses `WP_HTML_Tag_Processor` and script loading strategies) and PHP 7.4+.

## Status

MVP — not yet tested against a live WordPress install. Known gaps for the next iteration: `<noscript>` fallbacks for deferred images, a settings screen, WooCommerce gallery coverage, ThumbHash placeholders (Pro), compatibility detection for other lazy-load plugins.

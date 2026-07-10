<?php
/**
 * Plugin Name: XOframe — Zero-CLS Media Loading
 * Plugin URI:  https://github.com/xoframe/xoframe
 * Description: Automatic zero-CLS progressive image loading. No template changes: rewrites images on the fly, adds dominant-color placeholders, and protects your LCP image from lazy loading.
 * Version:     0.1.0
 * Requires at least: 6.3
 * Requires PHP: 7.4
 * Author:      XOframe
 * License:     GPL-2.0-or-later
 * Text Domain: xoframe
 */

defined( 'ABSPATH' ) || exit;

define( 'XOFRAME_VERSION', '0.1.0' );
define( 'XOFRAME_META_COLOR', '_xoframe_color' );

/**
 * Whether XOframe should touch the current request.
 */
function xoframe_should_run(): bool {
	if ( is_admin() || is_feed() || is_embed() || is_customize_preview() ) {
		return false;
	}
	if ( defined( 'REST_REQUEST' ) && REST_REQUEST ) {
		return false;
	}
	if ( function_exists( 'amp_is_request' ) && amp_is_request() ) {
		return false;
	}
	return (bool) apply_filters( 'xoframe_enabled', true );
}

/**
 * Front-end assets + init call.
 */
add_action( 'wp_enqueue_scripts', function () {
	if ( ! xoframe_should_run() ) {
		return;
	}
	$base = plugin_dir_url( __FILE__ ) . 'assets/';
	wp_enqueue_style( 'xoframe', $base . 'xoframe.css', array(), XOFRAME_VERSION );
	wp_enqueue_script(
		'xoframe',
		$base . 'xoframe.min.js',
		array(),
		XOFRAME_VERSION,
		array(
			'in_footer' => false,
			'strategy'  => 'defer',
		)
	);
	$options = apply_filters(
		'xoframe_init_options',
		array(
			'lcpAware'   => true,
			'rootMargin' => '300px',
		)
	);
	// The main script is deferred, so wait for DOMContentLoaded — by then XOframe exists.
	wp_add_inline_script(
		'xoframe',
		'document.addEventListener("DOMContentLoaded",function(){window.XOframe&&XOframe.init(' . wp_json_encode( $options ) . ')});'
	);
} );

/**
 * Rewrite every content <img> (posts, pages, blocks, WooCommerce descriptions).
 * WordPress has already decided loading/fetchpriority here — we piggyback on
 * its LCP heuristics instead of guessing again.
 */
add_filter( 'wp_content_img_tag', function ( $img, $context, $attachment_id ) {
	if ( ! xoframe_should_run() || ! class_exists( 'WP_HTML_Tag_Processor' ) ) {
		return $img;
	}
	$p = new WP_HTML_Tag_Processor( $img );
	if ( ! $p->next_tag( 'img' ) ) {
		return $img;
	}
	$deferred = xoframe_process_img( $p, (int) $attachment_id );
	return xoframe_with_noscript( $p->get_updated_html(), $img, $deferred );
}, 20, 3 );

/**
 * Featured images.
 */
add_filter( 'post_thumbnail_html', function ( $html ) {
	if ( ! xoframe_should_run() || '' === $html || ! class_exists( 'WP_HTML_Tag_Processor' ) ) {
		return $html;
	}
	$p        = new WP_HTML_Tag_Processor( $html );
	$deferred = false;
	while ( $p->next_tag( 'img' ) ) {
		$id = 0;
		if ( preg_match( '/wp-image-(\d+)/', (string) $p->get_attribute( 'class' ), $m ) ) {
			$id = (int) $m[1];
		}
		$deferred = xoframe_process_img( $p, $id ) || $deferred;
	}
	return xoframe_with_noscript( $p->get_updated_html(), $html, $deferred );
}, 20 );

/**
 * Turn one <img> into XOframe markup, in place.
 *
 * @return bool True when the sources were deferred (the caller should then add
 *              a <noscript> fallback so no-JS clients and crawlers still get
 *              the real image).
 */
function xoframe_process_img( WP_HTML_Tag_Processor $p, int $attachment_id ): bool {
	// Already managed, or explicitly excluded.
	if ( null !== $p->get_attribute( 'data-xo' ) || null !== $p->get_attribute( 'data-src' ) ) {
		return false;
	}
	if ( null !== $p->get_attribute( 'data-xo-skip' )
		|| false !== strpos( (string) $p->get_attribute( 'class' ), 'skip-lazy' ) ) {
		return false;
	}

	$p->set_attribute( 'data-xo', true );

	if ( $attachment_id > 0 ) {
		$color = xoframe_dominant_color( $attachment_id );
		if ( '' !== $color ) {
			$p->set_attribute( 'data-color', $color );
		}
	}

	// WordPress marked this as the likely LCP image: keep src intact so the
	// browser preload scanner sees it. XOframe only manages priority + reveal.
	if ( 'high' === $p->get_attribute( 'fetchpriority' ) || 'eager' === $p->get_attribute( 'loading' ) ) {
		$p->set_attribute( 'data-xo-priority', 'high' );
		return false;
	}

	// Below the fold (per WP heuristics): defer sources so XOframe orchestrates.
	if ( 'lazy' !== $p->get_attribute( 'loading' ) || ! apply_filters( 'xoframe_defer_images', true ) ) {
		return false;
	}

	foreach ( array( 'src', 'srcset', 'sizes' ) as $attr ) {
		$value = $p->get_attribute( $attr );
		if ( null !== $value && '' !== $value ) {
			$p->set_attribute( 'data-' . $attr, $value );
			$p->remove_attribute( $attr );
		}
	}
	$p->remove_attribute( 'loading' ); // XOframe's IntersectionObserver takes over.

	// Transparent SVG stand-in keeps the box (and avoids an alt-text flash)
	// pre-load. base64 avoids any data-URI escaping pitfalls.
	$width  = (int) $p->get_attribute( 'width' );
	$height = (int) $p->get_attribute( 'height' );
	if ( $width > 0 && $height > 0 ) {
		$svg = sprintf(
			'<svg xmlns="http://www.w3.org/2000/svg" width="%d" height="%d"></svg>',
			$width,
			$height
		);
		$p->set_attribute( 'src', 'data:image/svg+xml;base64,' . base64_encode( $svg ) ); // phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions
	}

	return true;
}

/**
 * Append a <noscript> copy of the untouched image so no-JS clients and
 * crawlers that don't execute JavaScript still receive the real <img>.
 */
function xoframe_with_noscript( string $html, string $original, bool $deferred ): string {
	return $deferred ? $html . '<noscript>' . $original . '</noscript>' : $html;
}

/**
 * Cached dominant color for an attachment ('' when unavailable).
 *
 * Rendering a page must NEVER decode an image: with an existing media library
 * (uploaded before this plugin), a cache miss on every <img> would read and
 * decode each file while the response is being generated. So on a miss we
 * return '' and queue the work for a background cron run — the color simply
 * appears on a later render.
 *
 * @param bool $compute Decode now (upload/cron context) instead of deferring.
 */
function xoframe_dominant_color( int $attachment_id, bool $compute = false ): string {
	$cached = get_post_meta( $attachment_id, XOFRAME_META_COLOR, true );
	if ( '' !== $cached && false !== $cached ) {
		return 'none' === $cached ? '' : (string) $cached;
	}

	if ( ! $compute ) {
		if ( ! wp_next_scheduled( 'xoframe_compute_color', array( $attachment_id ) ) ) {
			wp_schedule_single_event( time() + 5, 'xoframe_compute_color', array( $attachment_id ) );
		}
		return '';
	}

	$color = xoframe_compute_dominant_color( $attachment_id );
	update_post_meta( $attachment_id, XOFRAME_META_COLOR, '' === $color ? 'none' : $color );
	return $color;
}

/** Background job queued by a front-end cache miss. */
add_action( 'xoframe_compute_color', function ( $attachment_id ) {
	xoframe_dominant_color( (int) $attachment_id, true );
} );

/**
 * Average color via GD: downscale the smallest thumbnail to a single pixel.
 */
function xoframe_compute_dominant_color( int $attachment_id ): string {
	if ( ! function_exists( 'imagecreatefromstring' ) ) {
		return '';
	}

	$file = get_attached_file( $attachment_id );
	$path = $file;
	$meta = wp_get_attachment_metadata( $attachment_id );
	if ( $file && ! empty( $meta['sizes'] ) ) {
		$smallest = null;
		foreach ( $meta['sizes'] as $size ) {
			if ( empty( $size['file'] ) || empty( $size['width'] ) || empty( $size['height'] ) ) {
				continue;
			}
			if ( null === $smallest || $size['width'] * $size['height'] < $smallest['width'] * $smallest['height'] ) {
				$smallest = $size;
			}
		}
		if ( $smallest ) {
			$candidate = path_join( dirname( $file ), $smallest['file'] );
			if ( file_exists( $candidate ) ) {
				$path = $candidate;
			}
		}
	}
	if ( ! $path || ! file_exists( $path ) || filesize( $path ) > 5 * MB_IN_BYTES ) {
		return '';
	}

	$data = file_get_contents( $path ); // phpcs:ignore WordPress.WP.AlternativeFunctions
	if ( false === $data ) {
		return '';
	}
	$src = @imagecreatefromstring( $data ); // phpcs:ignore WordPress.PHP.NoSilencedErrors
	if ( ! $src ) {
		return '';
	}
	$px = imagecreatetruecolor( 1, 1 );
	imagecopyresampled( $px, $src, 0, 0, 0, 0, 1, 1, imagesx( $src ), imagesy( $src ) );
	$rgb = imagecolorat( $px, 0, 0 );
	imagedestroy( $src );
	imagedestroy( $px );

	return sprintf( '#%06x', $rgb & 0xffffff );
}

/**
 * Pre-compute the color when an image is uploaded, so the first page render
 * never pays for it.
 */
add_filter( 'wp_generate_attachment_metadata', function ( $metadata, $attachment_id ) {
	if ( wp_attachment_is_image( $attachment_id ) ) {
		xoframe_dominant_color( (int) $attachment_id, true );
	}
	return $metadata;
}, 20, 2 );

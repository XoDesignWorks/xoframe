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
	xoframe_process_img( $p, (int) $attachment_id );
	return $p->get_updated_html();
}, 20, 3 );

/**
 * Featured images.
 */
add_filter( 'post_thumbnail_html', function ( $html ) {
	if ( ! xoframe_should_run() || '' === $html || ! class_exists( 'WP_HTML_Tag_Processor' ) ) {
		return $html;
	}
	$p = new WP_HTML_Tag_Processor( $html );
	while ( $p->next_tag( 'img' ) ) {
		$id = 0;
		if ( preg_match( '/wp-image-(\d+)/', (string) $p->get_attribute( 'class' ), $m ) ) {
			$id = (int) $m[1];
		}
		xoframe_process_img( $p, $id );
	}
	return $p->get_updated_html();
}, 20 );

/**
 * Turn one <img> into XOframe markup, in place.
 */
function xoframe_process_img( WP_HTML_Tag_Processor $p, int $attachment_id ): void {
	// Already managed, or explicitly excluded.
	if ( null !== $p->get_attribute( 'data-xo' ) || null !== $p->get_attribute( 'data-src' ) ) {
		return;
	}
	if ( null !== $p->get_attribute( 'data-xo-skip' )
		|| false !== strpos( (string) $p->get_attribute( 'class' ), 'skip-lazy' ) ) {
		return;
	}

	$p->set_attribute( 'data-xo', true );

	// WordPress marked this as the likely LCP image: keep src intact so the
	// browser preload scanner sees it. XOframe only manages priority + reveal.
	if ( 'high' === $p->get_attribute( 'fetchpriority' ) || 'eager' === $p->get_attribute( 'loading' ) ) {
		$p->set_attribute( 'data-xo-priority', 'high' );
		return;
	}

	// Below the fold (per WP heuristics): defer sources so XOframe orchestrates.
	if ( 'lazy' !== $p->get_attribute( 'loading' ) || ! apply_filters( 'xoframe_defer_images', true ) ) {
		return;
	}

	foreach ( array( 'src', 'srcset', 'sizes' ) as $attr ) {
		$value = $p->get_attribute( $attr );
		if ( null !== $value && '' !== $value ) {
			$p->set_attribute( 'data-' . $attr, $value );
			$p->remove_attribute( $attr );
		}
	}
	$p->remove_attribute( 'loading' ); // XOframe's IntersectionObserver takes over.

	// Transparent SVG stand-in keeps the box (and avoids alt-text flash) pre-load.
	$width  = (int) $p->get_attribute( 'width' );
	$height = (int) $p->get_attribute( 'height' );
	if ( $width > 0 && $height > 0 ) {
		$p->set_attribute(
			'src',
			"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='{$width}' height='{$height}'%3E%3C/svg%3E"
		);
	}

	if ( $attachment_id > 0 ) {
		$color = xoframe_dominant_color( $attachment_id );
		if ( '' !== $color ) {
			$p->set_attribute( 'data-color', $color );
		}
	}
}

/**
 * Cached dominant color for an attachment ('' when unavailable).
 */
function xoframe_dominant_color( int $attachment_id ): string {
	$cached = get_post_meta( $attachment_id, XOFRAME_META_COLOR, true );
	if ( '' !== $cached && false !== $cached ) {
		return 'none' === $cached ? '' : (string) $cached;
	}
	$color = xoframe_compute_dominant_color( $attachment_id );
	update_post_meta( $attachment_id, XOFRAME_META_COLOR, '' === $color ? 'none' : $color );
	return $color;
}

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
		xoframe_dominant_color( (int) $attachment_id );
	}
	return $metadata;
}, 20, 2 );

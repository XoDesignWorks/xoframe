/**
 * XOframe React adapter — thin wrappers over the same engine, no logic
 * duplicated. Each component renders a plain DOM element with the usual
 * `data-xo*` attributes and registers it with the core on mount, so React users
 * get identical behavior (zero CLS, LCP-aware, INP-guarded) without imperative
 * calls. Separate entry (@xodesign/xoframe/react); React is a peer dependency.
 *
 *   import { XOImage, XOBackground, XOBlock } from '@xodesign/xoframe/react'
 *   <XOImage src="hero.jpg" width={1600} height={900} priority alt="Hero" />
 */
import { useEffect, useRef } from 'react'
import type { CSSProperties, ReactElement, ReactNode, RefObject } from 'react'
import { XOframe } from '@xodesign/xoframe'

type Strategy = 'manual' | 'intent' | 'hero'

interface Common {
  /** Dominant-color placeholder. */
  color?: string
  /** 4-corner gradient placeholder: "#c1,#c2,#c3,#c4". */
  gradient?: string
  /** Aspect ratio, e.g. "16/9". */
  ratio?: string
  strategy?: Strategy
  className?: string
  style?: CSSProperties
}

/** Observe a node with the core on mount, release it on unmount. */
const useXO = (ref: RefObject<HTMLElement | null>): void => {
  useEffect(() => {
    const el = ref.current
    if (!el) return
    XOframe.observe(el)
    return () => XOframe.unobserve(el)
  }, [ref])
}

export interface XOImageProps extends Common {
  src: string
  srcSet?: string
  /** `sizes` value, or "auto" to compute from the layout width. */
  sizes?: string
  /** Comma-separated backup sources tried on error (AVIF → WebP → JPG). */
  fallback?: string
  /** Eager + fetchpriority=high — use for the LCP hero. */
  priority?: boolean
  width?: number
  height?: number
  alt: string
}

export function XOImage({
  src,
  srcSet,
  sizes,
  fallback,
  priority,
  color,
  gradient,
  ratio,
  strategy,
  alt,
  ...rest
}: XOImageProps): ReactElement {
  const ref = useRef<HTMLImageElement>(null)
  useXO(ref)
  return (
    <img
      ref={ref}
      data-xo=""
      data-src={src}
      data-srcset={srcSet}
      data-sizes={sizes}
      data-fallback={fallback}
      data-color={color}
      data-gradient={gradient}
      data-ratio={ratio}
      data-xo-priority={priority ? 'high' : undefined}
      data-xo-strategy={strategy}
      alt={alt}
      {...rest}
    />
  )
}

export interface XOBackgroundProps extends Common {
  bg: string
  /** Responsive sources per breakpoint. */
  bgMobile?: string
  bgTablet?: string
  bgDesktop?: string
  children?: ReactNode
}

export function XOBackground({
  bg,
  bgMobile,
  bgTablet,
  bgDesktop,
  color,
  gradient,
  ratio,
  strategy,
  children,
  ...rest
}: XOBackgroundProps): ReactElement {
  const ref = useRef<HTMLDivElement>(null)
  useXO(ref)
  return (
    <div
      ref={ref}
      data-xo-bg=""
      data-bg={bg}
      data-bg-mobile={bgMobile}
      data-bg-tablet={bgTablet}
      data-bg-desktop={bgDesktop}
      data-color={color}
      data-gradient={gradient}
      data-ratio={ratio}
      data-xo-strategy={strategy}
      {...rest}
    >
      {children}
    </div>
  )
}

export interface XOBlockProps extends Common {
  children?: ReactNode
}

/** Adds `.xo-visible` when the block enters the viewport (animate it in CSS). */
export function XOBlock({ children, strategy, ...rest }: XOBlockProps): ReactElement {
  const ref = useRef<HTMLDivElement>(null)
  useXO(ref)
  return (
    <div ref={ref} data-xo-block="" data-xo-strategy={strategy} {...rest}>
      {children}
    </div>
  )
}

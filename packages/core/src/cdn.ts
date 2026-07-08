/**
 * CDN (IIFE) entry. Exposes window.XOframe and supports opt-in auto-init:
 *   <script src="xoframe.min.js" data-xo-auto></script>
 */
import { XOframe } from './index'

const script = document.currentScript
if (script && script.hasAttribute('data-xo-auto')) {
  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', () => XOframe.init())
  else XOframe.init()
}

export { XOframe }
export default XOframe

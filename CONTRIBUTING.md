# Contributing to XOframe

Thanks for your interest! XOframe is a performance-first library, and every contribution is judged against one question: **does the page get lighter and more stable?**

## Ground rules

1. **Size budget is law.** The core bundle must stay ≤ 3 KB gzip — the build fails otherwise (`packages/core/build.mjs`). If your feature can't fit, it belongs in a separate module (like the debug overlay).
2. **Native browser features first.** Prefer `IntersectionObserver`, `loading`, `fetchpriority`, `aspect-ratio`, CSS — JavaScript only where the platform has no answer.
3. **Never regress Core Web Vitals.** No forced layout, no layout thrashing, no main-thread jank, no hiding content from search engines, no breaking the browser preload scanner.
4. **Graceful degradation.** Every enhancement must be a best effort with a working fallback (see the `decode()` timeout race in `src/index.ts` for the pattern).

## Development setup

```bash
npm install
npm run build        # ESM/CJS/UMD/IIFE + CSS + types, enforces the size budget
npm test             # node:test + jsdom smoke tests
npm run demo         # http://localhost:4173 → open /demo/
```

## Pull requests

- One focused change per PR.
- Add or update a test in `packages/core/test/` for behavior changes.
- Update `CHANGELOG.md` under an `Unreleased` heading.
- Run `npm run build && npm test` before pushing — CI runs the same.
- Be kind and constructive in reviews and discussions.

## Reporting bugs

Open an issue with: browser + version, minimal HTML to reproduce, expected vs actual behavior. For Core Web Vitals regressions, a Lighthouse trace or the debug overlay screenshot helps a lot.

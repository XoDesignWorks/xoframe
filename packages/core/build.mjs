import { build } from 'esbuild'
import { copyFile, readFile, writeFile, mkdir } from 'node:fs/promises'
import { gzipSync } from 'node:zlib'

const SIZE_BUDGET = 3 * 1024 // 3 KB gzip hard limit for the CDN build

await mkdir('dist', { recursive: true })

const shared = { bundle: true, target: 'es2020' }

// ESM — for bundlers (they minify themselves)
await build({
  ...shared,
  entryPoints: ['src/index.ts'],
  format: 'esm',
  outfile: 'dist/xoframe.esm.js'
})

// CJS
await build({
  ...shared,
  entryPoints: ['src/index.ts'],
  format: 'cjs',
  outfile: 'dist/xoframe.cjs'
})

// IIFE CDN build (minified, opt-in auto-init via data-xo-auto)
await build({
  ...shared,
  entryPoints: ['src/cdn.ts'],
  format: 'iife',
  globalName: 'XOframe',
  minify: true,
  footer: { js: 'XOframe=XOframe.XOframe;' },
  outfile: 'dist/xoframe.min.js'
})

// Debug overlay — separate dev-only file, never part of the core bundle
await build({
  ...shared,
  entryPoints: ['src/debug.ts'],
  format: 'esm',
  outfile: 'dist/xoframe-debug.esm.js'
})
await build({
  ...shared,
  entryPoints: ['src/debug.ts'],
  format: 'iife',
  globalName: 'XOframeDebug',
  minify: true,
  footer: { js: 'XOframeDebug=XOframeDebug.XOframeDebug;' },
  outfile: 'dist/xoframe-debug.min.js'
})

// Opt-in modules — each is a separate file, never part of the core bundle, so
// importing one never pulls in the others. The reference MIT decoders
// (evanw/thumbhash, wolt/blurhash) are bundled at build time, keeping the
// published package free of runtime dependencies.
for (const name of ['embed', 'thumbhash', 'blurhash', 'masonry', 'skeleton', 'visibility']) {
  const globalName = 'XOframe' + name[0].toUpperCase() + name.slice(1)
  await build({
    ...shared,
    entryPoints: [`src/${name}.ts`],
    format: 'esm',
    outfile: `dist/xoframe-${name}.esm.js`
  })
  await build({
    ...shared,
    entryPoints: [`src/${name}.ts`],
    format: 'iife',
    globalName,
    minify: true,
    footer: { js: `${globalName}=${globalName}.${globalName};` },
    outfile: `dist/xoframe-${name}.min.js`
  })
}

// UMD — wrap a minified CJS bundle
const cjsMin = await build({
  ...shared,
  entryPoints: ['src/index.ts'],
  format: 'cjs',
  minify: true,
  write: false
})
const umd = `(function(root,factory){typeof define==='function'&&define.amd?define([],factory):typeof module==='object'&&module.exports?module.exports=factory():root.XOframe=factory()})(typeof self!=='undefined'?self:this,function(){var module={exports:{}},exports=module.exports;${cjsMin.outputFiles[0].text}return module.exports.XOframe});`
await writeFile('dist/xoframe.umd.js', umd)

await copyFile('styles/xoframe.css', 'dist/xoframe.css')

const min = await readFile('dist/xoframe.min.js')
const gzipped = gzipSync(min).length
console.log(`xoframe.min.js: ${min.length} B raw, ${gzipped} B gzip`)
if (gzipped > SIZE_BUDGET) {
  console.error(`Size budget exceeded: ${gzipped} B gzip > ${SIZE_BUDGET} B`)
  process.exit(1)
}

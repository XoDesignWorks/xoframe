/** CSS files are inlined as text at build time (esbuild `text` loader). */
declare module '*.css' {
  const content: string
  export default content
}

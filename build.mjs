// Bundles src/ into the single self-executing client.js that DSH injects.
//
// The bundle is CommonJS wrapped by hand so that every `require("react")` the
// bundle emits resolves through the ModuleLoader factory's own `require`
// parameter (React is a peer dependency served by the host, never bundled).
import { build } from 'esbuild'

const header = `/**
 * Client half of Quick Explain.
 *
 * It watches text selections in the page and, when the user asks, opens a side
 * panel that talks to the Host plugin through /api/quick-explain.
 * Nothing here writes to the main Session: the panel is a separate, disposable
 * conversation rendered above the app.
 *
 * Styling deliberately borrows the app's own vocabulary — the same DESIGN tokens,
 * 0.5px hairlines and 14/22 content rhythm the transcript and composer use — so the
 * panel reads as part of DSH rather than a floating third-party card.
 *
 * Generated from src/ by \`npm run build\` — do not edit by hand.
 */
window.__ModuleLoader__.load({
  id: 'dsh-quick-explain',
  factory(require) {
    const module = { exports: {} }
    const exports = module.exports
`

const footer = `
    return module.exports
  },
})
`

await build({
  entryPoints: ['src/main.cjs'],
  bundle: true,
  format: 'cjs',
  platform: 'browser',
  external: ['react'],
  jsx: 'transform',
  jsxFactory: 'React.createElement',
  jsxFragment: 'React.Fragment',
  outfile: 'client.js',
  banner: { js: header },
  footer: { js: footer },
})

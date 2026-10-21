/*
 * Builds the unchanged app (frontend/) against the Ampere server.
 *
 * It loads frontend/vite.config.ts as-is and adds one plugin: every import that resolves to the in-browser
 * simulation (frontend/src/server/<name>.ts) is redirected to the network client backend/client/<name>.ts,
 * which has the same exports. Pages, components, styles and assets are untouched.
 *
 * Run with the app's own Vite, e.g. (from frontend/):
 *   node_modules/.bin/vite build --config ../backend/web/vite.remote.config.mjs
 */
import { existsSync } from 'node:fs'
import { dirname, join, resolve, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO = resolve(HERE, '../..')
const APP = join(REPO, 'frontend')
const CLIENT = join(REPO, 'backend', 'client')
const SIMULATION = join(APP, 'src', 'server') + sep

const vite = await import(pathToFileURL(join(APP, 'node_modules/vite/dist/node/index.js')).href)

function useServerBackend() {
  return {
    name: 'ampere-server-backend',
    enforce: 'pre',
    async resolveId(source, importer, options) {
      if (!importer || importer.startsWith(CLIENT) || !source.includes('server/')) return null
      const resolved = await this.resolve(source, importer, { ...options, skipSelf: true })
      if (!resolved || !resolved.id.startsWith(SIMULATION)) return null
      const name = resolved.id.slice(SIMULATION.length).replace(/\.ts$/, '')
      const shim = join(CLIENT, `${name}.ts`)
      if (!existsSync(shim)) this.error(`No network client for frontend/src/server/${name}.ts (imported by ${importer}). Add backend/client/${name}.ts.`)
      return shim
    },
    buildEnd(error) {
      if (error) return
      const leaked = [...this.getModuleIds()].filter((id) => id.startsWith(SIMULATION))
      if (leaked.length) this.error(`The in-browser simulation leaked into the server build: ${leaked.join(', ')}`)
    },
  }
}

export default vite.defineConfig(async (env) => {
  const loaded = await vite.loadConfigFromFile(env, join(APP, 'vite.config.ts'), APP)
  const api = process.env.AMPERE_DEV_API ?? 'http://localhost:8787'
  return vite.mergeConfig(loaded?.config ?? {}, {
    root: APP,
    plugins: [useServerBackend()],
    define: { 'import.meta.env.VITE_AMPERE_API_URL': JSON.stringify(process.env.VITE_AMPERE_API_URL ?? '') },
    server: { fs: { allow: [REPO] }, proxy: { '/api': { target: api, changeOrigin: true } } },
    preview: { proxy: { '/api': { target: api, changeOrigin: true } } },
  })
})

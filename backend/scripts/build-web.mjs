/*
 * Builds the landing page and the app for the Ampere server into <repo>/dist, without modifying either project.
 *   1. root `vite build`: landing page (its config also builds the original, in-browser app into dist/app)
 *   2. app rebuilt into dist/app with backend/web/vite.remote.config.mjs, talking to the server instead
 * Set VITE_AMPERE_API_URL when the API lives on another origin; leave it unset when this server serves dist/.
 */
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const APP = join(REPO, 'frontend')

function run(cmd, cwd) {
  console.log(`\n[build-web] ${cmd}  (in ${cwd.replace(REPO, '.') || '.'})`)
  const r = spawnSync(cmd, { cwd, stdio: 'inherit', shell: true })
  if (r.status !== 0) process.exit(r.status ?? 1)
}

if (!existsSync(join(REPO, 'node_modules'))) run('npm ci --no-audit --no-fund', REPO)
if (!existsSync(join(APP, 'node_modules'))) run('npm ci --include=dev --no-audit --no-fund', APP)

run('npx vite build', REPO)
run('node_modules/.bin/vite build --config ../backend/web/vite.remote.config.mjs --base /app/ --outDir ../dist/app --emptyOutDir', APP)
console.log('\n[build-web] done: dist/ (landing) + dist/app/ (app on the Ampere server)')

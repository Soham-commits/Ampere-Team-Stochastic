/*
 * Hot-reloading app against a running Ampere server (npm start in backend/), with /api proxied to it.
 * Opens http://localhost:5173/app/
 */
import { spawnSync } from 'node:child_process'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const APP = join(resolve(dirname(fileURLToPath(import.meta.url)), '../..'), 'frontend')
const r = spawnSync('node_modules/.bin/vite --config ../backend/web/vite.remote.config.mjs --base /app/', { cwd: APP, stdio: 'inherit', shell: true })
process.exit(r.status ?? 0)

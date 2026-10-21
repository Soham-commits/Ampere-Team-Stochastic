import { createReadStream, existsSync, statSync } from 'node:fs'
import { extname, join, normalize, resolve } from 'node:path'
import { Readable } from 'node:stream'
import { config } from './env'

/*
 * Serves the built landing page and app (dist/, from scripts/build-web.mjs) on the same origin as the
 * API, with the same SPA rewrites as the repository's vercel.json. One process, one URL for local demos.
 */

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
}

function file(path: string, status = 200) {
  const headers: Record<string, string> = { 'content-type': TYPES[extname(path)] ?? 'application/octet-stream' }
  if (path.includes(`${join('assets', '')}`)) headers['cache-control'] = 'public, max-age=31536000, immutable'
  else headers['cache-control'] = 'no-cache'
  return new Response(Readable.toWeb(createReadStream(path)) as ReadableStream, { status, headers })
}

export function serveWeb(urlPath: string): Response {
  const root = resolve(config.webDir)
  if (!existsSync(join(root, 'index.html')))
    return new Response('Ampere API is running. Build the web app with `npm run build:web` (in backend/) to serve it here.', { status: 404 })
  if (urlPath === '/app') return new Response(null, { status: 302, headers: { location: '/app/' } })
  const target = normalize(join(root, decodeURIComponent(urlPath)))
  if (!target.startsWith(root)) return new Response('Not found', { status: 404 })
  if (existsSync(target) && statSync(target).isFile()) return file(target)
  if (existsSync(join(target, 'index.html'))) return file(join(target, 'index.html'))
  // App routes (not files or hashed assets) get the app shell, so deep links and reloads work.
  if (urlPath.startsWith('/app/') && !urlPath.startsWith('/app/assets/') && !urlPath.split('/').pop()!.includes('.')) return file(join(root, 'app', 'index.html'))
  return new Response('Not found', { status: 404 })
}

import { randomBytes } from 'node:crypto'

/*
 * Must be the first import of every server entry point.
 * The shared engine (frontend/src/server) treats a missing localStorage as "server memory".
 * Node 25+ defines a localStorage stub whose methods throw, which makes kvGet() silently return null,
 * so remove web storage before any engine module runs.
 */
for (const name of ['localStorage', 'sessionStorage'] as const) {
  Object.defineProperty(globalThis, name, { value: undefined, configurable: true, writable: true })
}

export const config = {
  port: Number(process.env.PORT ?? 8787),
  databaseUrl: process.env.DATABASE_URL ?? 'postgres://localhost:5432/ampere',
  // Without TOKEN_SECRET, sessions are signed with a per-process secret and end when the server restarts.
  tokenSecret: process.env.TOKEN_SECRET ?? randomBytes(32).toString('hex'),
  tokenTtlS: 12 * 3600,
  corsOrigins: (process.env.CORS_ORIGIN ?? 'http://localhost:5173,http://localhost:4173,http://127.0.0.1:5173,http://127.0.0.1:4173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  /** Built landing page + /app/ (node scripts/build-web.mjs). Served when present. */
  webDir: process.env.WEB_DIR ?? new URL('../../dist', import.meta.url).pathname,
  workerIntervalMs: 2000,
}

if (!process.env.TOKEN_SECRET) console.warn('[ampere] TOKEN_SECRET not set: using a random secret, so sessions reset on restart.')

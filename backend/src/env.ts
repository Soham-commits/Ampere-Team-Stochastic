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
  databaseUrl: process.env.DATABASE_URL ?? 'postgres://localhost:5432/ampere',
}

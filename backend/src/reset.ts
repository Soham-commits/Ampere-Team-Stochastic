/*
 * Restores the demo fixtures on a running server: `npm run reset`.
 * Goes through the API rather than the database so the server's memory, Postgres and every
 * open tab (via the realtime reset message) change together. The app has no reset button.
 */
import { config } from './env'

const base = process.env.AMPERE_URL ?? `http://localhost:${config.port}`

async function post<T>(path: string, body: unknown, token?: string): Promise<T> {
  const res = await fetch(base + path, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  })
  return (await res.json()) as T
}

try {
  const session = await post<{ ok: boolean; data?: { token: string } }>('/api/session', { user_id: 'u-admin' })
  if (!session.ok || !session.data) throw new Error('could not open an admin session')
  const result = await post<{ ok: boolean; error?: { message: string } }>('/api/rpc/resetDemo', { args: [] }, session.data.token)
  if (!result.ok) throw new Error(result.error?.message ?? 'reset failed')
  console.log(`[ampere] demo data reset on ${base}`)
} catch (e) {
  console.error(`[ampere] reset failed (${(e as Error).message}). Is the server running? Start it with \`npm start\`.`)
  process.exit(1)
}

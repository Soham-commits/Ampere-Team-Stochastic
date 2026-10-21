import { createServer } from '../src/server'
import { issueToken } from '../src/auth'

export type TestServer = Awaited<ReturnType<typeof createServer>>

export async function startServer() {
  const server = await createServer({ worker: false })
  await server.persistence.reset()
  return server
}

export function client(server: TestServer, userId: string | null) {
  const token = userId ? issueToken(userId)!.token : null
  const headers = { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }
  return {
    token,
    async rpc<T = any>(method: string, ...args: unknown[]): Promise<{ ok: boolean; data: T; error?: { code: string; message: string } }> {
      const res = await server.app.request(`/api/rpc/${method}`, { method: 'POST', headers, body: JSON.stringify({ args }) })
      return res.json()
    },
    async console(line: string, command_id: string) {
      const res = await server.app.request('/api/console', { method: 'POST', headers, body: JSON.stringify({ line, command_id }) })
      return res.json() as Promise<{ ok: boolean; lines: { text: string }[]; booking_id?: string; booking_ref?: string; next_command?: string }>
    },
  }
}

export const DEMO_ORIGIN = { lat: 18.5362, lng: 73.8939 }

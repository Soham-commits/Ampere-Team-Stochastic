import { createHmac, timingSafeEqual } from 'node:crypto'
import { config } from './env'
import { userById, type User } from './engine'

/*
 * Demo sessions. The app keeps its account picker (synthetic demo accounts); the server issues a
 * signed token per browser tab and derives the actor from it on every request. The actor is never
 * read from a request body, so ownership checks in the engine cannot be bypassed from the client.
 */

const sign = (body: string) => createHmac('sha256', config.tokenSecret).update(body).digest('base64url')

export function issueToken(userId: string, now = Date.now()) {
  if (!userById(userId)) return null
  const exp = Math.floor(now / 1000) + config.tokenTtlS
  const body = Buffer.from(JSON.stringify({ sub: userId, exp })).toString('base64url')
  return { token: `${body}.${sign(body)}`, expires_at: new Date(exp * 1000).toISOString() }
}

export function verifyToken(token: string | null | undefined, now = Date.now()): User | null {
  if (!token) return null
  const [body, mac] = token.split('.')
  if (!body || !mac) return null
  const expected = Buffer.from(sign(body))
  const given = Buffer.from(mac)
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null
  try {
    const { sub, exp } = JSON.parse(Buffer.from(body, 'base64url').toString()) as { sub: string; exp: number }
    if (exp * 1000 < now) return null
    return userById(sub) ?? null
  } catch {
    return null
  }
}

/** Bearer header for fetch calls; ?token= for EventSource, which cannot send headers. */
export function tokenFrom(headers: Headers, url: string) {
  const auth = headers.get('authorization')
  if (auth?.startsWith('Bearer ')) return auth.slice(7)
  return new URL(url).searchParams.get('token')
}

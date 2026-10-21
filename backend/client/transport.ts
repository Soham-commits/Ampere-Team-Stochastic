/*
 * Browser side of the Ampere backend. Bundled into the unchanged app by web/vite.remote.config.mjs in
 * place of the in-browser simulation (frontend/src/server/*).
 *
 * Holds the tab's session token, a per-actor read replica of the server (the app reads some data
 * synchronously), the server clock skew and the realtime connection.
 */
import type { BookingEvent } from '../../frontend/src/domain/booking'
import type { Db } from '../../frontend/src/server/db'

export type RealtimeMessage = { kind: 'booking_event'; booking_id: string; event: unknown } | { kind: 'db_changed' } | { kind: 'reset' }

interface Snapshot {
  server_now: number
  actor_id: string | null
  db: Db
  streams: Record<string, BookingEvent[]>
  occupancy: Record<string, { start: number; end: number }[]>
}

const BASE = String(import.meta.env.VITE_AMPERE_API_URL ?? '').replace(/\/$/, '')
const TAB_KEY = 'ampere.session'
const LAST_KEY = 'ampere.lastUser'
const TOKEN_KEY = 'ampere.token'

const safe = <T>(fn: () => T, fallback: T): T => {
  try {
    return fn()
  } catch {
    return fallback
  }
}

/* ---------------- Session ---------------- */

export const sessionStore = {
  userId: (): string | null => safe(() => sessionStorage.getItem(TAB_KEY), null) ?? safe(() => localStorage.getItem(LAST_KEY), null),
  set(userId: string) {
    safe(() => sessionStorage.setItem(TAB_KEY, userId), undefined)
    safe(() => localStorage.setItem(LAST_KEY, userId), undefined)
    safe(() => sessionStorage.removeItem(TOKEN_KEY), undefined)
  },
  clear() {
    safe(() => sessionStorage.removeItem(TAB_KEY), undefined)
    safe(() => localStorage.removeItem(LAST_KEY), undefined)
    safe(() => sessionStorage.removeItem(TOKEN_KEY), undefined)
  },
}

let tokenRequest: { userId: string; promise: Promise<string | null> } | null = null

/** Token for the tab's current account, signing in to the server on first use or after expiry. */
export async function getToken(): Promise<string | null> {
  const userId = sessionStore.userId()
  if (!userId) return null
  const stored = safe(() => JSON.parse(sessionStorage.getItem(TOKEN_KEY) ?? 'null') as { user_id: string; token: string; expires_at: string } | null, null)
  if (stored && stored.user_id === userId && Date.parse(stored.expires_at) - Date.now() > 60_000) return stored.token
  if (tokenRequest?.userId === userId) return tokenRequest.promise
  const promise = (async () => {
    try {
      const res = await timedFetch(`${BASE}/api/session`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ user_id: userId }) })
      if (!res.ok) return null
      const body = (await res.json()) as { data: { user_id: string; token: string; expires_at: string } }
      safe(() => sessionStorage.setItem(TOKEN_KEY, JSON.stringify(body.data)), undefined)
      return body.data.token
    } catch {
      return null
    } finally {
      tokenRequest = null
    }
  })()
  tokenRequest = { userId, promise }
  return promise
}

function forgetToken() {
  safe(() => sessionStorage.removeItem(TOKEN_KEY), undefined)
}

/* ---------------- HTTP ---------------- */

async function timedFetch(url: string, init: RequestInit = {}, timeoutMs = 15_000) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    return await fetch(url, { ...init, signal: ctrl.signal })
  } finally {
    clearTimeout(t)
  }
}

export class NetworkError extends Error {}

/** POST with the tab token. Retries once with a fresh token after a 401. */
export async function post<T>(path: string, body: unknown): Promise<T> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const token = await getToken()
    let res: Response
    try {
      res = await timedFetch(`${BASE}${path}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(body),
      })
    } catch {
      throw new NetworkError('Can’t reach the Ampere server. Check your connection and try again.')
    }
    if (res.status === 401 && attempt === 0) {
      forgetToken()
      continue
    }
    try {
      return (await res.json()) as T
    } catch {
      throw new NetworkError(`The Ampere server returned an unexpected response (${res.status}).`)
    }
  }
  throw new NetworkError('Could not sign in to the Ampere server.')
}

/* ---------------- Replica and clock ---------------- */

function emptyDb(): Db {
  return {
    version: 1,
    mode: 'DEMO',
    seeded_at: new Date(0).toISOString(),
    clock_offset_ms: 0,
    sites: [],
    site_private: [],
    resources: [],
    connectors: [],
    rules: [],
    checks: [],
    tariffs: [],
    vehicles: [],
    exceptions: [],
    quotes: [],
    bookings: [],
    payments: [],
    sessions: [],
    arrival_tokens: [],
    idempotency: {},
    audit: [],
    notif_read: {},
    settings: { route_provider: 'DEMO', realtime_paused: {} },
    last_origin: {},
  }
}

export const replica: { db: Db; streams: Record<string, BookingEvent[]>; occupancy: Snapshot['occupancy']; skew: number; actorId: string | null } = {
  db: emptyDb(),
  streams: {},
  occupancy: {},
  skew: 0,
  actorId: null,
}

let refreshing: Promise<void> | null = null
let refreshAgain = false

/** Fetches this actor's snapshot. Concurrent callers share one request; a call made mid-flight triggers one more. */
export function refresh(): Promise<void> {
  if (refreshing) {
    refreshAgain = true
    return refreshing
  }
  refreshing = (async () => {
    do {
      refreshAgain = false
      const token = await getToken()
      const t0 = Date.now()
      const res = await timedFetch(`${BASE}/api/snapshot`, { headers: token ? { authorization: `Bearer ${token}` } : {} })
      const t1 = Date.now()
      if (!res.ok) throw new NetworkError(`Snapshot failed (${res.status}).`)
      const snap = (await res.json()) as Snapshot
      // Only adopt a snapshot for the account this tab is still signed in as (it may have switched mid-request).
      if ((snap.actor_id ?? null) !== (sessionStore.userId() ?? null)) continue
      replica.db = snap.db
      replica.streams = snap.streams
      replica.occupancy = snap.occupancy
      replica.actorId = snap.actor_id
      replica.skew = snap.server_now - Math.round((t0 + t1) / 2)
    } while (refreshAgain)
  })().finally(() => {
    refreshing = null
  })
  return refreshing
}

export function serverNow() {
  return Date.now() + replica.skew + (replica.db.clock_offset_ms || 0)
}

/* ---------------- Realtime ---------------- */

const listeners = new Set<(m: RealtimeMessage) => void>()

export function onMessage(l: (m: RealtimeMessage) => void) {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}

export function emit(m: RealtimeMessage) {
  listeners.forEach((l) => l(m))
}

let source: EventSource | null = null
let pendingNotice: 'db_changed' | 'reset' | null = null
let noticeTimer: ReturnType<typeof setTimeout> | undefined
let retryMs = 1000

/** Coalesces bursts of notices into one replica refresh, then tells the app. */
function notice(kind: 'db_changed' | 'reset') {
  pendingNotice = pendingNotice === 'reset' || kind === 'reset' ? 'reset' : 'db_changed'
  clearTimeout(noticeTimer)
  noticeTimer = setTimeout(() => {
    const k = pendingNotice!
    pendingNotice = null
    refresh()
      .catch(() => undefined)
      .finally(() => emit({ kind: k }))
  }, 150)
}

function applyEvent(bookingId: string, e: BookingEvent) {
  const cur = replica.streams[bookingId] ?? []
  if (cur.some((x) => x.event_id === e.event_id)) return
  replica.streams = { ...replica.streams, [bookingId]: [...cur, e].sort((a, b) => a.sequence - b.sequence) }
}

export async function connectRealtime() {
  source?.close()
  source = null
  if (typeof EventSource === 'undefined') return
  const token = await getToken()
  const es = new EventSource(`${BASE}/api/stream${token ? `?token=${encodeURIComponent(token)}` : ''}`)
  source = es
  let opened = false
  es.onopen = () => {
    retryMs = 1000
    // After a dropped connection, refetch and replay so nothing missed while offline is lost.
    if (opened) notice('reset')
    opened = true
  }
  es.onmessage = (ev) => {
    let m: RealtimeMessage
    try {
      m = JSON.parse(ev.data) as RealtimeMessage
    } catch {
      return
    }
    if (m.kind === 'booking_event') {
      applyEvent(m.booking_id, m.event as BookingEvent)
      emit(m)
      notice('db_changed')
    } else notice(m.kind)
  }
  es.onerror = () => {
    if (es.readyState !== EventSource.CLOSED) return // the browser is already retrying
    if (source !== es) return
    // Closed for good (e.g. expired token): reconnect with a fresh token, backing off.
    forgetToken()
    setTimeout(() => {
      if (source === es) void connectRealtime()
    }, retryMs)
    retryMs = Math.min(retryMs * 2, 15_000)
  }
}

/** Called when the tab signs in or out: new replica for the new actor, new realtime identity. */
export function sessionChanged() {
  replica.db = emptyDb()
  replica.streams = {}
  replica.occupancy = {}
  void refresh()
    .catch(() => undefined)
    .finally(() => emit({ kind: 'db_changed' }))
  void connectRealtime()
}

let started: Promise<void> | null = null

/** First load: snapshot plus realtime. Never blocks the app for more than ~8 s if the server is down. */
export function start(): Promise<void> {
  if (started) return started
  const attempt = async (delay: number): Promise<void> => {
    try {
      await refresh()
    } catch {
      await new Promise((r) => setTimeout(r, delay))
      return attempt(Math.min(delay * 2, 4000))
    }
  }
  started = Promise.race([attempt(500), new Promise<void>((r) => setTimeout(r, 8000))]).then(() => {
    void connectRealtime()
    if (typeof document !== 'undefined')
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') notice('db_changed')
      })
  })
  return started
}

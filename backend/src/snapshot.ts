import { bookings as B, occupancy, readDb, readStream, type BookingEvent, type Db, type User } from './engine'

/*
 * Per-actor read replica for the browser. The app reads some data synchronously (readDb(),
 * readStream(), slotProblem()), so each signed-in tab keeps this projection and refreshes it on
 * realtime notices. It is an allowlist: private access details, arrival-token hashes, idempotency
 * records, quotes, payments, sessions and other people's streams never leave the server.
 */

export interface Snapshot {
  server_now: number
  actor_id: string | null
  db: Db
  streams: Record<string, BookingEvent[]>
  /** Anonymous held ranges per charger, so the bay picker can grey out taken slots. */
  occupancy: Record<string, { start: number; end: number }[]>
}

export function snapshotFor(actor: User | null): Snapshot {
  const db = readDb()
  const visible = actor ? db.bookings.filter((h) => B.canRead(actor, h)) : []
  const isAdmin = !!actor?.capabilities.includes('ADMIN')
  const own = <T>(rec: Record<string, T>) => (actor && rec[actor.id] !== undefined ? { [actor.id]: rec[actor.id] } : {})

  const projected: Db = {
    version: db.version,
    mode: db.mode,
    seeded_at: db.seeded_at,
    clock_offset_ms: db.clock_offset_ms,
    sites: db.sites,
    site_private: [],
    resources: db.resources,
    connectors: db.connectors,
    rules: db.rules,
    checks: db.checks,
    tariffs: db.tariffs,
    vehicles: actor ? db.vehicles.filter((v) => v.owner_id === actor.id) : [],
    exceptions: db.exceptions,
    quotes: [],
    bookings: visible,
    payments: [],
    sessions: [],
    arrival_tokens: [],
    idempotency: {},
    audit: isAdmin ? db.audit : [],
    notif_read: own(db.notif_read),
    settings: { route_provider: db.settings.route_provider, realtime_paused: {} },
    last_origin: own(db.last_origin),
  }

  return {
    server_now: Date.now(),
    actor_id: actor?.id ?? null,
    db: projected,
    streams: Object.fromEntries(visible.map((h) => [h.id, readStream(h.id)])),
    occupancy: Object.fromEntries(db.resources.map((r) => [r.id, occupancy(r.id).map(({ start, end }) => ({ start, end }))])),
  }
}

/** Whether actor may receive this event live. A brand-new booking's header may not exist yet. */
export function canSeeEvent(actor: User | null, e: BookingEvent) {
  if (!actor) return false
  const header = B.headerById(e.booking_id)
  if (header) return B.canRead(actor, header)
  if (e.event_type !== 'BookingRequested') return false
  const p = e.payload as { driver_id: string; host_account_id: string }
  return B.canRead(actor, { id: e.booking_id, booking_ref: '', created_at: '', driver_id: p.driver_id, host_account_id: p.host_account_id, resource_id: '', site_id: '', is_demo: true })
}

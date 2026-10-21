/*
 * The booking engine is the app's own, already-tested service code (frontend/src/server/*).
 * On the server it runs in memory exactly as in the browser build; this backend adds Postgres
 * persistence, authentication and HTTP around it. Rules are never re-implemented here.
 */
export * as bookings from '../../frontend/src/server/bookings'
export * as listings from '../../frontend/src/server/listings'
export { searchChargers, siteDetail, type SearchInput } from '../../frontend/src/server/discovery'
export { nextSlots, occupancy, stateOf } from '../../frontend/src/server/availability'
export { runConsoleCommand } from '../../frontend/src/server/jury'
export { handle, ApiFail, requireActor, type Ctx } from '../../frontend/src/server/http'
export { readDb, mutateDb, resetDemo, serverNow, EVENTS_PREFIX, DB_KEY, type Db } from '../../frontend/src/server/db'
export { readStream } from '../../frontend/src/server/eventStore'
export { kvGet, kvSet, kvKeys, kvRemove, subscribe, type RealtimeMessage } from '../../frontend/src/server/storage'
export { seedDriverDemoBookings } from '../../frontend/src/server/seed'
export { userById, USERS } from '../../frontend/src/domain/catalogue'
export { istParts } from '../../frontend/src/lib/time'
export type { BookingEvent } from '../../frontend/src/domain/booking'
export type { User, Result } from '../../frontend/src/domain/types'

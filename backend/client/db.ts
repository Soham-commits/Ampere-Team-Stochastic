/* Replaces frontend/src/server/db.ts for the app: a read-only replica of what this account may see. */
import type { Db as EngineDb, Quote as EngineQuote } from '../../frontend/src/server/db'
import { replica, serverNow as transportNow, start } from './transport'

export type Db = EngineDb
export type Quote = EngineQuote

/** Synchronous snapshot read. Callers must not mutate the result. */
export function readDb(): Db {
  return replica.db
}

/** Server clock, corrected for this device's clock skew, plus the shared demo offset. */
export function serverNow(): number {
  return transportNow()
}

/** Loads the first snapshot and opens the realtime connection. The server owns seeding. */
export function ensureSeeded(): Promise<void> {
  return start()
}

import { EVENTS_PREFIX, kvGet, kvKeys, kvRemove, kvSet, mutateDb, readDb, resetDemo, seedDriverDemoBookings, subscribe, type BookingEvent, type Db } from '../engine'
import type { Sql } from './pg'

/*
 * Write-through persistence for the in-memory engine.
 * Every engine write is announced on the storage bus (booking_event / db_changed). Those messages are
 * queued and written to Postgres in one transaction per flush, in the order they happened. Request
 * handlers await barrier() before replying, so nothing is acknowledged until Postgres has it.
 * Postgres is the system of record: on boot (and after any failed write) memory is rebuilt from it.
 */

export interface FlushBatch {
  events: BookingEvent[]
  docChanged: boolean
  reset: boolean
}

export class PersistenceError extends Error {}

const tick = () => new Promise<void>((r) => setImmediate(r))

export function createPersistence(sql: Sql) {
  let pending: BookingEvent[] = []
  let docDirty = false
  let quietDepth = 0
  let scheduled = false
  let chain: Promise<unknown> = Promise.resolve()
  const listeners = new Set<(b: FlushBatch) => void>()

  subscribe((m) => {
    if (quietDepth) return
    if (m.kind === 'booking_event') pending.push(m.event as BookingEvent)
    else if (m.kind === 'db_changed') docDirty = true
    else return
    schedule()
  })

  const notify = (b: FlushBatch) => listeners.forEach((l) => l(b))

  /** Runs fn after every earlier flush, reset or restore has finished. */
  function exclusive<T>(fn: () => Promise<T>): Promise<T> {
    const run = chain.then(fn, fn)
    chain = run.catch(() => undefined)
    return run
  }

  /** Engine writes made inside fn replace state wholesale, so their bus messages are not queued. */
  async function quiet(fn: () => Promise<void>) {
    quietDepth++
    try {
      await fn()
      await tick()
    } finally {
      quietDepth--
      pending = []
      docDirty = false
    }
  }

  function schedule() {
    if (scheduled) return
    scheduled = true
    setImmediate(() => {
      scheduled = false
      flush().catch(() => undefined) // already logged and restored
    })
  }

  function flush() {
    return exclusive(async () => {
      if (!pending.length && !docDirty) return
      const events = pending
      const docChanged = docDirty
      pending = []
      docDirty = false
      try {
        await sql.begin(async (tx) => {
          for (const e of events) await insertEvent(tx as unknown as Sql, e)
          if (docChanged) await upsertDoc(tx as unknown as Sql, readDb())
        })
      } catch (err) {
        console.error('[ampere] persistence failed; restoring memory from Postgres', err)
        await loadIntoMemory()
        notify({ events: [], docChanged: true, reset: true })
        throw new PersistenceError(err instanceof Error ? err.message : String(err))
      }
      notify({ events, docChanged, reset: false })
    })
  }

  async function loadIntoMemory(): Promise<boolean> {
    const [row] = await sql<{ doc: Db }[]>`SELECT doc FROM app_state WHERE id = 1`
    if (!row) return false
    const rows = await sql<{ booking_id: string; event: BookingEvent }[]>`SELECT booking_id, event FROM booking_events ORDER BY booking_id, sequence`
    await quiet(async () => {
      for (const k of kvKeys(EVENTS_PREFIX)) kvRemove(k)
      const streams = new Map<string, BookingEvent[]>()
      for (const r of rows) streams.set(r.booking_id, [...(streams.get(r.booking_id) ?? []), r.event])
      for (const [id, events] of streams) kvSet(EVENTS_PREFIX + id, events)
      await mutateDb((d) => {
        for (const k of Object.keys(d)) delete (d as unknown as Record<string, unknown>)[k]
        Object.assign(d, row.doc)
      })
    })
    return true
  }

  /** Replaces everything in Postgres with the current memory state, in one transaction. */
  async function writeAll() {
    const events = kvKeys(EVENTS_PREFIX)
      .flatMap((k) => kvGet<BookingEvent[]>(k) ?? [])
      .sort((a, b) => a.booking_id.localeCompare(b.booking_id) || a.sequence - b.sequence)
    await sql.begin(async (raw) => {
      const tx = raw as unknown as Sql
      await tx`TRUNCATE booking_events, resource_holds`
      await tx`SELECT set_config('ampere.bulk', 'on', true)`
      for (const e of events) await insertEvent(tx, e)
      await tx`SELECT set_config('ampere.bulk', 'off', true)`
      await tx`SELECT rebuild_resource_holds()`
      await upsertDoc(tx, readDb())
    })
  }

  return {
    onFlush(l: (b: FlushBatch) => void) {
      listeners.add(l)
      return () => listeners.delete(l)
    },

    barrier,

    /** Loads Postgres into memory, or seeds a fresh demo when the database is empty. */
    boot: () =>
      exclusive(async () => {
        if (!(await loadIntoMemory())) {
          await quiet(() => resetDemo())
          await writeAll()
          console.log('[ampere] empty database: seeded a fresh demo')
        }
      }).then(async () => {
        // Idempotent top-ups (extra demo sites, driver examples) go through the normal write path.
        await seedDriverDemoBookings()
        await barrier()
      }),

    /** Demo reset: reseed memory, then replace the database wholesale. */
    reset: () =>
      exclusive(async () => {
        await quiet(() => resetDemo())
        await writeAll()
        notify({ events: [], docChanged: true, reset: true })
      }),

    /** Rebuilds memory from Postgres (used by tests to prove restart recovery). */
    restore: () => exclusive(() => loadIntoMemory()),
  }

  /** Resolves once every engine write made so far is committed; rejects if it could not be. */
  async function barrier() {
    await tick()
    await flush()
  }
}

export type Persistence = ReturnType<typeof createPersistence>

async function insertEvent(tx: Sql, e: BookingEvent) {
  await tx`
    INSERT INTO booking_events
      (booking_id, sequence, event_id, event_type, schema_version, actor_id, actor_role, source,
       recorded_at, reported_at, correlation_id, idempotency_key, payload, event)
    VALUES
      (${e.booking_id}, ${e.sequence}, ${e.event_id}, ${e.event_type}, ${e.schema_version}, ${e.actor_id}, ${e.actor_role}, ${e.source},
       ${e.recorded_at}, ${e.reported_at}, ${e.correlation_id}, ${e.idempotency_key},
       ${tx.json(e.payload as never)}, ${tx.json(e as never)})`
}

async function upsertDoc(tx: Sql, doc: Db) {
  await tx`
    INSERT INTO app_state (id, doc) VALUES (1, ${tx.json(doc as never)})
    ON CONFLICT (id) DO UPDATE SET doc = EXCLUDED.doc, version = app_state.version + 1, updated_at = now()`
}

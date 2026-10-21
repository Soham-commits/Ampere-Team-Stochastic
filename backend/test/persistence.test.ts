import '../src/env'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { EVENTS_PREFIX, kvKeys, kvRemove, runConsoleCommand, stateOf, userById } from '../src/engine'
import { connect, migrate, type Sql } from '../src/store/pg'
import { createPersistence, type Persistence } from '../src/store/persist'

let sql: Sql
let persistence: Persistence
const jury = { actor: userById('u-jury')! }

beforeAll(async () => {
  sql = connect()
  await migrate(sql)
  persistence = createPersistence(sql)
  await persistence.boot()
  await persistence.reset()
})
afterAll(async () => {
  await sql.end({ timeout: 2 })
})

async function ticket(id: string) {
  const t = await runConsoleCommand(jury, 'TICKET|Tata Nexon EV|4|18.5362|73.8939|CCS2', id)
  expect(t.ok).toBe(true)
  return t
}

describe('write-through persistence', () => {
  it('commits every engine write to Postgres before barrier() resolves', async () => {
    const t = await ticket('p-1')
    await persistence.barrier()
    const rows = await sql`SELECT event_type, sequence FROM booking_events WHERE booking_id = ${t.booking_id!}`
    expect(rows.map((r) => r.event_type)).toEqual(['BookingRequested'])
    const [{ doc }] = await sql`SELECT doc FROM app_state WHERE id = 1`
    expect(doc.bookings.some((b: { id: string }) => b.id === t.booking_id)).toBe(true)
  })

  it('rebuilds memory from Postgres after a restart', async () => {
    const t = await ticket('p-2')
    await persistence.barrier()
    for (const k of kvKeys(EVENTS_PREFIX)) kvRemove(k)
    expect(stateOf(t.booking_id!)).toBeNull()
    await persistence.restore()
    expect(stateOf(t.booking_id!)?.lifecycle).toBe('requested')
  })

  it('reset replaces the database with a fresh demo', async () => {
    await ticket('p-3')
    await persistence.barrier()
    await persistence.reset()
    const [{ n }] = await sql`SELECT count(*)::int AS n FROM booking_events WHERE source = 'JURY_CONSOLE'`
    expect(n).toBe(0)
  })
})

describe('database guarantees', () => {
  it('booking_events is append-only and sequences must be contiguous', async () => {
    const [e] = await sql<{ booking_id: string }[]>`SELECT booking_id FROM booking_events LIMIT 1`
    await expect(sql`UPDATE booking_events SET source = 'UI' WHERE booking_id = ${e.booking_id}`).rejects.toThrow(/append-only/)
    await expect(sql`DELETE FROM booking_events WHERE booking_id = ${e.booking_id}`).rejects.toThrow(/append-only/)
    await expect(
      sql`INSERT INTO booking_events (booking_id, sequence, event_id, event_type, schema_version, actor_role, source, recorded_at, correlation_id, payload, event)
          VALUES (${e.booking_id}, 99, gen_random_uuid(), 'HostConfirmed', 1, 'HOST', 'UI', now(), 'x', '{}', '{}')`,
    ).rejects.toThrow(/expected sequence/)
  })

  it('the exclusion constraint rejects an overlapping hold on the same charger', async () => {
    await ticket('p-4')
    await persistence.barrier()
    const [hold] = await sql<{ resource_id: string; lower: Date; upper: Date }[]>`
      SELECT resource_id, lower(during), upper(during) FROM resource_holds WHERE active LIMIT 1`
    expect(hold).toBeTruthy()
    await expect(sql`INSERT INTO resource_holds (booking_id, resource_id, during) VALUES ('forged', ${hold.resource_id}, tstzrange(${hold.lower}, ${hold.upper}))`).rejects.toThrow(/resource_holds_no_overlap/)
  })
})

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { replay } from '../../frontend/src/domain/booking'
import { POLICY } from '../../frontend/src/domain/policy'
import { EVENTS_PREFIX, kvKeys, kvRemove, serverNow } from '../src/engine'
import { client, DEMO_ORIGIN, startServer, type TestServer } from './helpers'

let server: TestServer
beforeAll(async () => {
  server = await startServer()
})
afterAll(async () => {
  await server.close()
})
beforeEach(async () => {
  await server.persistence.reset()
})

const driver = () => client(server, 'u-driver')
const cafeHost = () => client(server, 'u-host-cafe')
const homeHost = () => client(server, 'u-host-home')
const jury = () => client(server, 'u-jury')

async function nextSlot(c: ReturnType<typeof client>, resourceId: string, minutes = 90) {
  const r = await c.rpc<string[]>('slots', resourceId, minutes, 0)
  const tomorrow = r.data.length ? r : await c.rpc<string[]>('slots', resourceId, minutes, 1)
  const start = tomorrow.data[1] ?? tomorrow.data[0] // leave room for the host + checkout windows
  return { start_at: start, end_at: new Date(Date.parse(start) + minutes * 60_000).toISOString() }
}

async function eventsInDb(bookingId: string) {
  return server.sql<{ event_type: string; sequence: number }[]>`SELECT event_type, sequence FROM booking_events WHERE booking_id = ${bookingId} ORDER BY sequence`
}

describe('strict discovery over HTTP', () => {
  it('at 4% hides the out-of-range, wrong-connector and faulted chargers', async () => {
    const r = await driver().rpc('searchChargers', { origin: DEMO_ORIGIN, model_id: 'vm-nexon-ev-demo', soc: 4 })
    const ids = r.data.results.map((x: { site: { id: string } }) => x.site.id)
    expect(ids).toContain('site-cafe')
    expect(ids).not.toContain('site-aundh')
    expect(ids).not.toContain('site-lane7')
    expect(ids).not.toContain('site-studio')
    expect(r.data.budget.range_budget_m).toBe(4000)
  })
})

describe('full journey across separate sessions, persisted in Postgres', () => {
  it('requested → host confirmed → on the way → charging → done, ₹132', async () => {
    const d = driver()
    const h = cafeHost()
    const s = await nextSlot(d, 'res-cafe-1')
    const q = await d.rpc('createQuote', { connector_id: 'con-cafe-t2', model_id: 'vm-nexon-ev-demo', soc: 4, origin: DEMO_ORIGIN, ...s, plan: 'STANDARD', energy: { kind: 'GRID', grid_wh: 8000 } })
    expect(q.ok).toBe(true)
    expect(q.data.snapshot.total_paise).toBe(13200)
    const b = await d.rpc('createBooking', { quote_id: q.data.id, idempotency_key: 'k1', equipment_choice: 'HOST_CABLE', policy_acceptance_version: POLICY.version })
    const id = b.data.booking_id as string
    expect((await d.rpc('createBooking', { quote_id: q.data.id, idempotency_key: 'k1', equipment_choice: 'HOST_CABLE', policy_acceptance_version: POLICY.version })).data.booking_id).toBe(id)

    expect((await d.rpc('depart', id)).error?.code).toBe('HOST_CONFIRMATION_REQUIRED')
    expect((await d.rpc('accept', id, undefined, 'HOST_CABLE')).error?.code).toBe('NOT_FOUND') // a driver cannot confirm
    expect((await homeHost().rpc('accept', id, undefined, 'HOST_CABLE')).error?.code).toBe('NOT_FOUND') // nor another host
    expect((await h.rpc('accept', id, undefined, 'HOST_CABLE')).ok).toBe(true)
    expect((await d.rpc('payDemo', id, 'SUCCESS', 'p1')).ok).toBe(true)
    expect((await d.rpc('payDemo', id, 'SUCCESS', 'p1')).ok).toBe(true) // idempotent retry
    expect((await d.rpc('depart', id)).ok).toBe(true)
    const code = (await d.rpc('arrivalCode', id)).data.code as string
    await d.rpc('advanceClock', Date.parse(s.start_at) - serverNow())
    expect((await h.rpc('checkIn', id, code === '000000' ? '111111' : '000000')).error?.code).toBe('INVALID_ARRIVAL_TOKEN')
    expect((await h.rpc('checkIn', id, code)).ok).toBe(true)
    expect((await h.rpc('startSession', id)).ok).toBe(true)
    expect((await h.rpc('completeSession', id)).error?.code).toBe('SESSION_IN_PROGRESS')
    await d.rpc('advanceClock', 61_000)
    expect((await h.rpc('completeSession', id)).ok).toBe(true)

    const rows = await eventsInDb(id)
    expect(rows.map((r) => r.event_type)).toEqual(['BookingRequested', 'HostConfirmed', 'PaymentCaptured', 'DriverDeparted', 'ArrivalVerified', 'ChargingStarted', 'ChargingCompleted'])
    const ev = await d.rpc('getEvents', id)
    const st = replay(ev.data.events)!
    expect(st.lifecycle).toBe('done')
    expect(st.completed).toMatchObject({ grid_wh: 8000, battery_gain_wh: 7200 })
  })
})

describe('jury console', () => {
  it('TICKET stores a booking, READY appends HostConfirmed, and replay after a memory wipe restores it', async () => {
    const j = jury()
    const t = await j.console('TICKET|Tata Nexon EV|4|18.5362|73.8939|CCS2', 'cmd-1')
    expect(t.ok).toBe(true)
    expect(t.lines.some((l) => l.text === 'STATE requested')).toBe(true)
    const r = await j.console(t.next_command!, 'cmd-2')
    expect(r.ok).toBe(true)
    expect(r.lines.some((l) => l.text === 'STATE host confirmed')).toBe(true)
    expect((await eventsInDb(t.booking_id!)).map((e) => e.event_type)).toEqual(['BookingRequested', 'HostConfirmed'])

    // Simulate a server restart: drop every in-memory stream, then rebuild memory from Postgres.
    for (const k of kvKeys(EVENTS_PREFIX)) kvRemove(k)
    await server.persistence.restore()
    const ev = await j.rpc('getEvents', t.booking_id)
    expect(replay(ev.data.events)!.lifecycle).toBe('host_confirmed')
    expect((await j.rpc('getBooking', t.booking_id)).data.state.lifecycle).toBe('host_confirmed')
  })

  it('wrong connector cannot be booked through TICKET', async () => {
    const t = await jury().console('TICKET|Tata Nexon EV|4|18.5362|73.8939|Bharat AC-001', 'cmd-3')
    expect(t.ok).toBe(false)
    expect(t.booking_id).toBeUndefined()
  })

  it('a driver cannot confirm a booking with READY', async () => {
    const t = await jury().console('TICKET|Tata Nexon EV|4|18.5362|73.8939|CCS2', 'cmd-4')
    const r = await driver().console(`READY|${t.booking_ref}|2026-10-22T10:00:00+05:30`, 'cmd-5')
    expect(r.ok).toBe(false)
  })
})

describe('collisions over HTTP', () => {
  it('two simultaneous requests for one charger yield exactly one hold', async () => {
    const d = driver()
    const j = jury()
    const s = await nextSlot(d, 'res-cafe-1')
    const qa = await d.rpc('createQuote', { connector_id: 'con-cafe-t2', model_id: 'vm-nexon-ev-demo', soc: 4, origin: DEMO_ORIGIN, ...s, plan: 'BASIC', energy: { kind: 'GRID', grid_wh: 4000 } })
    const qb = await j.rpc('createQuote', { connector_id: 'con-cafe-ccs', model_id: 'vm-nexon-ev-demo', soc: 4, origin: DEMO_ORIGIN, ...s, plan: 'BASIC', energy: { kind: 'GRID', grid_wh: 4000 } })
    const results = await Promise.all([
      d.rpc('createBooking', { quote_id: qa.data.id, idempotency_key: 'a', equipment_choice: 'HOST_CABLE', policy_acceptance_version: POLICY.version }),
      j.rpc('createBooking', { quote_id: qb.data.id, idempotency_key: 'b', equipment_choice: 'HOST_CABLE', policy_acceptance_version: POLICY.version }),
    ])
    expect(results.filter((r) => r.ok)).toHaveLength(1)
    expect(results.find((r) => !r.ok)?.error?.code).toBe('SLOT_UNAVAILABLE')
  })
})

describe('sessions', () => {
  it('rejects unknown accounts and forged tokens', async () => {
    const res = await server.app.request('/api/session', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ user_id: 'u-nobody' }) })
    expect(res.status).toBe(404)
    const forged = await server.app.request('/api/rpc/listBookings', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer eyJzdWIiOiJ1LWFkbWluIiwiZXhwIjo5OTk5OTk5OTk5fQ.bad' }, body: JSON.stringify({ args: ['all'] }) })
    expect((await forged.json()).error.code).toBe('UNAUTHENTICATED')
  })
})

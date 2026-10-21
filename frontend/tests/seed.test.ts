import { beforeEach, expect, it } from 'vitest'
import { readDb, resetDemo } from '../src/server/db'
import { seedDriverDemoBookings } from '../src/server/seed'
import { readStream } from '../src/server/eventStore'
import { replay } from '../src/domain/booking'

beforeEach(() => resetDemo())

it('seeds varied confirmed and completed driver examples without duplicates on reload', async () => {
  const before = readDb().bookings.map((b) => b.id)
  await seedDriverDemoBookings()
  await seedDriverDemoBookings()
  expect(readDb().bookings.map((b) => b.id)).toEqual(before)
  const samples = readDb().bookings.filter((b) => b.id.startsWith('demo-driver-booking-'))
  expect(samples).toHaveLength(4)
  expect(new Set(samples.map((b) => b.site_id)).size).toBe(3)
  expect(samples.every((b) => b.driver_id === 'u-driver' && b.is_demo)).toBe(true)
  const states = samples.map((b) => replay(readStream(b.id))!)
  expect(states.map((s) => s.lifecycle).sort()).toEqual(['done', 'done', 'host_confirmed', 'host_confirmed'])
  expect(states.every((s) => s.request.vehicle.model_id === 'vm-nexon-ev-demo')).toBe(true)
})

it('new nearby chargers pass strict discovery and accept a normal booking request', async () => {
  const { searchChargers } = await import('../src/server/discovery')
  const { nextSlots } = await import('../src/server/availability')
  const { createQuote, createBooking } = await import('../src/server/bookings')
  const { userById } = await import('../src/domain/catalogue')
  const { DEMO_ORIGIN, POLICY } = await import('../src/domain/policy')
  const { serverNow } = await import('../src/server/db')
  const result = await searchChargers({ origin: DEMO_ORIGIN, model_id: 'vm-nexon-ev-demo', soc: 4 })
  expect(result.results.map((r) => r.site.id)).toEqual(expect.arrayContaining(['site-riverside', 'site-courtyard']))
  const now = serverNow()
  const start = nextSlots('res-riverside-1', 90, now + 15 * 60_000, now, 1)[0]
  const actor = { actor: userById('u-driver')! }
  const quote = await createQuote(actor, { connector_id: 'con-riverside-t2', model_id: 'vm-nexon-ev-demo', soc: 4, origin: DEMO_ORIGIN, start_at: new Date(start).toISOString(), end_at: new Date(start + 90 * 60_000).toISOString(), plan: 'BASIC', energy: { kind: 'GRID', grid_wh: 4000 } })
  const booking = await createBooking(actor, { quote_id: quote.id, idempotency_key: 'new-site-test', policy_acceptance_version: POLICY.version })
  expect(replay(readStream(booking.booking_id))!.request.site_id).toBe('site-riverside')
})

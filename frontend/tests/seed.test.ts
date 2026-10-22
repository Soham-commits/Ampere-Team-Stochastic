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
  const booking = await createBooking(actor, { quote_id: quote.id, idempotency_key: 'new-site-test', equipment_choice: 'HOST_CABLE', policy_acceptance_version: POLICY.version })
  expect(replay(readStream(booking.booking_id))!.request.site_id).toBe('site-riverside')
})

it('society wallboxes are discoverable near campus and require their residential host', async () => {
  const { searchChargers } = await import('../src/server/discovery')
  const { nextSlots } = await import('../src/server/availability')
  const { createQuote, createBooking, acceptBooking } = await import('../src/server/bookings')
  const { userById } = await import('../src/domain/catalogue')
  const { MIT_WPU_ORIGIN } = await import('../src/domain/mockLocation')
  const { POLICY } = await import('../src/domain/policy')
  const { serverNow } = await import('../src/server/db')
  const results = await searchChargers({ origin: MIT_WPU_ORIGIN, model_id: 'vm-nexon-ev-demo', soc: 4, radius_km: 4, bookable_only: true })
  const societies = results.results.filter((r) => r.site.site_type === 'RESIDENTIAL')
  expect(societies.map((r) => r.site.id)).toEqual(expect.arrayContaining(['site-sahyadri-society', 'site-prabhat-society']))
  expect(societies.every((r) => r.site.location_precision === 'APPROXIMATE' && r.site.host_account_id === 'ha-home')).toBe(true)
  const now = serverNow()
  const start = nextSlots('res-sahyadri-society-1', 90, now + 15 * 60_000, now, 1)[0]
  const driver = { actor: userById('u-driver')! }
  const quote = await createQuote(driver, { connector_id: 'con-sahyadri-society-t2', model_id: 'vm-nexon-ev-demo', soc: 4, origin: MIT_WPU_ORIGIN, start_at: new Date(start).toISOString(), end_at: new Date(start + 90 * 60_000).toISOString(), plan: 'STANDARD', energy: { kind: 'GRID', grid_wh: 4000 } })
  const booking = await createBooking(driver, { quote_id: quote.id, idempotency_key: 'society-test', equipment_choice: 'SOCKET_ONLY', policy_acceptance_version: POLICY.version })
  await expect(acceptBooking({ actor: userById('u-host-cafe')! }, booking.booking_id, { equipment_choice: 'SOCKET_ONLY' })).rejects.toMatchObject({ code: 'NOT_FOUND' })
  await acceptBooking({ actor: userById('u-host-home')! }, booking.booking_id, { equipment_choice: 'SOCKET_ONLY' })
  expect(replay(readStream(booking.booking_id))!.lifecycle).toBe('host_confirmed')
})

it('refreshes legacy café titles and past-visit labels without rewriting booking events', async () => {
  const { mutateDb } = await import('../src/server/db')
  const { bookingSiteName } = await import('../src/lib/bookingSiteName')
  const sample = readDb().bookings.find((b) => b.site_id === 'site-cafe')!
  const before = JSON.stringify(readStream(sample.id))
  await mutateDb((db) => { db.sites.find((s) => s.id === 'site-cafe')!.name = 'Ember & Ohm Café' })
  await seedDriverDemoBookings()
  expect(bookingSiteName({ site_id: 'site-cafe', site_name: 'Ember & Ohm Café' })).toBe('Vaishali Café · demo')
  expect(JSON.stringify(readStream(sample.id))).toBe(before)
})

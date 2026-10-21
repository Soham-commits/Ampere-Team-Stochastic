import { beforeEach, describe, expect, it } from 'vitest'
import { resetDemo, readDb } from '../src/server/db'
import { acceptBooking, createBooking, createQuote } from '../src/server/bookings'
import { nextSlots } from '../src/server/availability'
import { readStream } from '../src/server/eventStore'
import { replay } from '../src/domain/booking'
import { equipmentOptions, type EquipmentChoice } from '../src/domain/equipment'
import { userById } from '../src/domain/catalogue'
import { DEMO_ORIGIN, POLICY } from '../src/domain/policy'

const driver = { actor: userById('u-driver')! }
const host = { actor: userById('u-host-cafe')! }
beforeEach(resetDemo)
async function quote(connectorId = 'con-riverside-t2') {
  const connector = readDb().connectors.find((c) => c.id === connectorId)!
  const start = nextSlots(connector.resource_id, 90, Date.now() + 900000, Date.now(), 1)[0]
  return createQuote(driver, {
    connector_id: connectorId,
    model_id: 'vm-nexon-ev-demo',
    soc: 4,
    origin: DEMO_ORIGIN,
    start_at: new Date(start).toISOString(),
    end_at: new Date(start + 5400000).toISOString(),
    plan: 'STANDARD',
    energy: { kind: 'GRID', grid_wh: 4000 },
  })
}
const request = (quoteId: string, choice?: EquipmentChoice) => ({
  quote_id: quoteId,
  equipment_choice: choice,
  idempotency_key: 'equipment-request',
  policy_acceptance_version: POLICY.version,
})

describe('cable and socket agreement', () => {
  it.each(['HOST_CABLE', 'SOCKET_ONLY'] as const)(
    'requires the host to confirm %s and preserves both choices on replay',
    async (choice) => {
      const q = await quote()
      const booking = await createBooking(driver, request(q.id, choice))
      const id = booking.booking_id
      expect(replay(readStream(id))!.request.equipment_choice).toBe(choice)
      await expect(acceptBooking(host, id)).rejects.toMatchObject({ code: 'EQUIPMENT_CONFIRMATION_REQUIRED' })
      await expect(
        acceptBooking(host, id, { equipment_choice: choice === 'HOST_CABLE' ? 'SOCKET_ONLY' : 'HOST_CABLE' }),
      ).rejects.toMatchObject({ code: 'EQUIPMENT_CONFIRMATION_REQUIRED' })
      expect(readStream(id)).toHaveLength(1)
      await acceptBooking(host, id, { equipment_choice: choice })
      const state = replay(JSON.parse(JSON.stringify(readStream(id))))!
      expect(state.lifecycle).toBe('host_confirmed')
      expect(state.equipment_confirmed).toBe(choice)
    },
  )
  it('requires the driver to choose equipment for a new UI quote', async () => {
    const q = await quote()
    await expect(createBooking(driver, request(q.id))).rejects.toMatchObject({ code: 'EQUIPMENT_CHOICE_REQUIRED' })
  })
  it('allows retries but rejects changed equipment under the same idempotency key', async () => {
    const q = await quote()
    const first = await createBooking(driver, request(q.id, 'HOST_CABLE'))
    expect((await createBooking(driver, request(q.id, 'HOST_CABLE'))).booking_id).toBe(first.booking_id)
    await expect(createBooking(driver, request(q.id, 'SOCKET_ONLY'))).rejects.toMatchObject({ code: 'IDEMPOTENCY_CONFLICT' })
  })
  it('rejects socket-only requests for tethered AC and DC chargers', async () => {
    for (const id of ['con-cafe-t2', 'con-cafe-ccs']) {
      const q = await quote(id)
      expect(q.snapshot.equipment_options).toEqual(['HOST_CABLE'])
      await expect(createBooking(driver, request(q.id, 'SOCKET_ONLY'))).rejects.toMatchObject({ code: 'EQUIPMENT_NOT_SUPPORTED' })
    }
  })
  it('rejects invalid choices and leaves earlier streams without invented confirmations', async () => {
    const q = await quote()
    await expect(createBooking(driver, request(q.id, 'invalid' as EquipmentChoice))).rejects.toMatchObject({
      code: 'INVALID_EQUIPMENT_CHOICE',
    })
    const legacy = replay(readStream('demo-driver-booking-v1-0'))!
    expect(legacy.request.equipment_choice).toBeUndefined()
    expect(legacy.equipment_confirmed).toBeNull()
  })
  it('derives choices from actual charger cable capability', () => {
    expect(equipmentOptions({ mode: 'AC', cable: 'HOST_OR_DRIVER' })).toEqual(['HOST_CABLE', 'SOCKET_ONLY'])
    expect(equipmentOptions({ mode: 'AC', cable: 'DRIVER_REQUIRED' })).toEqual(['SOCKET_ONLY'])
    expect(equipmentOptions({ mode: 'DC', cable: 'HOST_OR_DRIVER' })).toEqual(['HOST_CABLE'])
  })
})

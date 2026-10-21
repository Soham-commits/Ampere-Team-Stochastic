import { afterEach, describe, expect, it, vi } from 'vitest'
import { createHash } from 'node:crypto'
import { sha256 } from '../src/lib/ids'
import { resetDemo, readDb, mutateDb } from '../src/server/db'
import { depart, issueArrivalCode, checkIn } from '../src/server/bookings'
import { readStream } from '../src/server/eventStore'
import { replay } from '../src/domain/booking'
import { userById } from '../src/domain/catalogue'

const browserCrypto = globalThis.crypto
function withoutSubtleCrypto() {
  vi.stubGlobal('crypto', { getRandomValues: browserCrypto.getRandomValues.bind(browserCrypto) })
}
afterEach(() => vi.unstubAllGlobals())

describe('arrival-token hashing across browser origins', () => {
  it.each(['', 'abc', 'Ampere · पुणे · 🚗'.repeat(40)])('matches standard SHA-256 for %j', async (text) => {
    const expected = createHash('sha256').update(text).digest('hex')
    expect(await sha256(text)).toBe(expected)
    withoutSubtleCrypto()
    expect(await sha256(text)).toBe(expected)
  })

  it('generates and verifies an arrival code without SubtleCrypto', async () => {
    withoutSubtleCrypto()
    await resetDemo()
    const id = 'demo-driver-booking-v1-0'
    const driver = { actor: userById('u-driver')! }
    const host = { actor: userById('u-host-cafe')! }
    await depart(driver, id)
    const issued = await issueArrivalCode(driver, id)
    expect(issued.code).toMatch(/^\d{6}$/)
    const token = readDb().arrival_tokens.find((t) => t.booking_id === id)!
    expect(token.token_hash).toBe(createHash('sha256').update(`${id}:${issued.code}`).digest('hex'))
    const state = replay(readStream(id))!
    await mutateDb((db) => { db.clock_offset_ms = Date.parse(state.request.start_at) - Date.now() })
    await expect(checkIn(host, id, issued.code === '000000' ? '111111' : '000000')).rejects.toMatchObject({ code: 'INVALID_ARRIVAL_TOKEN' })
    await checkIn(host, id, issued.code)
    expect(replay(readStream(id))!.arrival_verified_at).toBeTruthy()
    await expect(checkIn(host, id, issued.code)).rejects.toBeDefined()
  })
})

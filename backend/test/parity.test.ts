/*
 * The browser clients copy a few pure helpers so the app's pages can call them synchronously.
 * These tests pin each copy to the engine original.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { replay } from '../../frontend/src/domain/booking'
import * as engineBookings from '../../frontend/src/server/bookings'
import { slotProblem as engineSlotProblem } from '../../frontend/src/server/availability'
import { HELP_LINES as engineHelp } from '../../frontend/src/server/jury'
import { HELP_LINES } from '../client/jury'
import * as shimBookings from '../client/bookings'
import { slotProblem } from '../client/availability'
import { replica } from '../client/transport'
import { readDb, readStream, serverNow, userById, USERS } from '../src/engine'
import { snapshotFor } from '../src/snapshot'
import { client, startServer, type TestServer } from './helpers'

let server: TestServer
beforeAll(async () => {
  server = await startServer()
  // Create a live hold so occupancy is non-trivial.
  await client(server, 'u-jury').console('TICKET|Tata Nexon EV|4|18.5362|73.8939|CCS2', 'parity-1')
})
afterAll(async () => {
  await server.close()
})

describe('client shims match the engine', () => {
  it('allowedActions / arrivalWindow / sessionProgress', () => {
    const now = serverNow()
    let checked = 0
    for (const h of readDb().bookings) {
      const state = replay(readStream(h.id))
      if (!state) continue
      checked++
      for (const u of USERS) expect(shimBookings.allowedActions(state, h, u)).toEqual(engineBookings.allowedActions(state, h, u))
      expect(shimBookings.arrivalWindow(state)).toEqual(engineBookings.arrivalWindow(state))
      expect(shimBookings.sessionProgress(state, now)).toEqual(engineBookings.sessionProgress(state, now))
    }
    expect(checked).toBeGreaterThan(3)
  })

  it('slotProblem on the replica equals the engine for every charger over the next day', () => {
    const snap = snapshotFor(userById('u-driver')!)
    replica.db = snap.db
    replica.occupancy = snap.occupancy
    const now = serverNow()
    const start0 = Math.ceil(now / 900_000) * 900_000
    for (const r of readDb().resources)
      for (let t = start0 - 900_000; t < start0 + 24 * 3600_000; t += 900_000)
        for (const minutes of [30, 60, 90, 120]) expect([r.id, t, minutes, slotProblem(r.id, t, t + minutes * 60_000, now)]).toEqual([r.id, t, minutes, engineSlotProblem(r.id, t, t + minutes * 60_000, now)])
  })

  it('HELP_LINES', () => {
    expect(HELP_LINES).toEqual(engineHelp)
  })

  it('every runtime import the app makes from src/server has a client with that export', async () => {
    const root = new URL('../../frontend/src/', import.meta.url)
    const files = (function walk(dir: URL): URL[] {
      return readdirSync(dir, { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? (d.name === 'server' ? [] : walk(new URL(`${d.name}/`, dir))) : /\.tsx?$/.test(d.name) ? [new URL(d.name, dir)] : []))
    })(root)
    const needed = new Map<string, Set<string>>()
    for (const f of files) {
      for (const m of readFileSync(f, 'utf8').matchAll(/^import (?!type )\{([^}]+)\} from '(?:\.\.\/)+server\/(\w+)'/gm)) {
        const names = m[1].split(',').map((s) => s.trim()).filter((s) => s && !s.startsWith('type '))
        needed.set(m[2], new Set([...(needed.get(m[2]) ?? []), ...names]))
      }
    }
    expect(needed.size).toBeGreaterThan(0)
    for (const [mod, names] of needed) {
      const shim = await import(`../client/${mod}.ts`)
      for (const n of names) expect([mod, n, n in shim]).toEqual([mod, n, true])
    }
  })
})

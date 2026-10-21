import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { loadSnapshot } from '../src/seed/ocmSnapshot'
import { client, DEMO_ORIGIN, startServer, type TestServer } from './helpers'

const snap = loadSnapshot()!
let server: TestServer
beforeAll(async () => {
  server = await startServer()
})
afterAll(async () => {
  await server.close()
})

const search = (soc: number) => client(server, 'u-driver').rpc('searchChargers', { origin: DEMO_ORIGIN, model_id: 'vm-nexon-ev-demo', soc })
type Result = { site: { id: string; source_kind: string }; reservable: boolean; route: { distance_m: number } }
const real = (results: Result[]) => results.filter((r) => r.site.id.startsWith('site-ocm-'))

describe('real public chargers (Open Charge Map + OSRM road distances)', () => {
  it('ships an attributed snapshot', () => {
    expect(snap.chargers.length).toBeGreaterThan(5)
    expect(snap.licence).toBe('CC BY 4.0')
    for (const c of snap.chargers) expect(c.road_distance_m).toBeGreaterThan(0)
  })

  it('at 4% every real charger is beyond the 4 km road budget and hidden', async () => {
    const r = await search(4)
    expect(r.data.budget.range_budget_m).toBe(4000)
    expect(snap.chargers.every((c) => c.road_distance_m > 4000)).toBe(true)
    expect(real(r.data.results)).toHaveLength(0)
  })

  it('with enough battery the same chargers appear with their measured road distance, never reservable', async () => {
    const r = await search(30)
    const shown = real(r.data.results)
    const inBudget = snap.chargers.filter((c) => c.road_distance_m <= r.data.budget.range_budget_m)
    expect(shown).toHaveLength(inBudget.length)
    for (const s of shown) {
      const c = snap.chargers.find((x) => `site-ocm-${x.ocm_id}` === s.site.id)!
      expect(s.route.distance_m).toBe(c.road_distance_m)
      expect(s.reservable).toBe(false)
      expect(s.site.source_kind).toBe('DIRECTORY')
    }
  })

  it('cannot be quoted or booked through Ampere', async () => {
    const c = snap.chargers[0]
    const now = Date.now()
    const q = await client(server, 'u-driver').rpc('createQuote', {
      connector_id: `con-ocm-${c.ocm_id}-1`,
      model_id: 'vm-nexon-ev-demo',
      soc: 90,
      origin: DEMO_ORIGIN,
      start_at: new Date(now + 3600_000).toISOString(),
      end_at: new Date(now + 7200_000).toISOString(),
      plan: 'BASIC',
      energy: { kind: 'GRID', grid_wh: 2000 },
    })
    expect(q.error?.code).toBe('UNSUPPORTED_CAPABILITY')
  })

  it('survive a demo reset', async () => {
    await server.persistence.reset()
    expect(real((await search(30)).data.results).length).toBeGreaterThan(0)
  })
})

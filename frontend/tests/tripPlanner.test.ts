import { describe, expect, it } from 'vitest'
import { planTrip } from '../src/features/trips/planner'

const chargers = [
  { id: 'a', name: 'First', km: 50, powerKw: 50 },
  { id: 'b', name: 'Second', km: 150, powerKw: 50 },
]
describe('illustrative trip planning', () => {
  it('arrives directly when the reserve permits it', () => {
    const result = planTrip(50, 40, 0.16, 80, chargers, 30)
    expect(result.stops).toHaveLength(0)
    expect(result.arrivalSoc).toBeCloseTo(60)
  })
  it('adds a reachable stop and respects car charging power', () => {
    const result = planTrip(200, 40, 0.16, 40, chargers, 25)
    expect(result.problem).toBeNull()
    expect(result.stops.map((s) => s.id)).toEqual(['a'])
    expect(result.stops[0].arrivalSoc).toBeCloseTo(20)
    expect(result.stops[0].minutes).toBe(64)
    expect(result.arrivalSoc).toBeCloseTo(20)
  })
  it('rejects unreachable first stops and incompatible corridors', () => {
    expect(planTrip(200, 40, 0.16, 4, chargers, 50).problem).toMatch(/before departure/)
    expect(planTrip(200, 40, 0.16, 40, [], 50).problem).toBeTruthy()
  })
  it('reports a gap after a reachable stop rather than pretending the route completes', () => {
    const result = planTrip(400, 40, 0.16, 40, chargers.slice(0, 1), 50)
    expect(result.stops).toHaveLength(1)
    expect(result.arrivalSoc).toBeNull()
    expect(result.problem).toMatch(/next leg/)
  })
  it('rejects invalid inputs and ignores malformed charger fixtures', () => {
    expect(planTrip(200, 0, 0.16, 40, chargers, 50).problem).toBeTruthy()
    expect(planTrip(200, 40, 0.16, NaN, chargers, 50).problem).toBeTruthy()
    expect(planTrip(200, 40, 0.16, 40, [{ ...chargers[0], powerKw: 0 }], 50).problem).toBeTruthy()
  })
})

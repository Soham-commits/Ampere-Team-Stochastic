import { describe, expect, it } from 'vitest'
import { calculateSavings } from '../src/features/savings/calculator'

describe('energy savings', () => {
  const inputs = { km: 500, petrolPerLitre: 105, petrolKmPerLitre: 15, electricityPerKwh: 14, kwhPer100Km: 16 }
  it('uses editable assumptions with correct units', () => {
    const result = calculateSavings(inputs)!
    expect(result.petrol).toBeCloseTo(3500)
    expect(result.electricity).toBeCloseTo(1120)
    expect(result.saved).toBeCloseTo(2380)
    expect(result.kwh).toBe(80)
  })
  it('keeps higher EV costs negative instead of claiming savings', () => {
    expect(calculateSavings({ ...inputs, electricityPerKwh: 60 })!.saved).toBeCloseTo(-1300)
  })
  it('supports zero distance but rejects invalid efficiency and prices', () => {
    expect(calculateSavings({ ...inputs, km: 0 })!.saved).toBe(0)
    expect(calculateSavings({ ...inputs, petrolKmPerLitre: 0 })).toBeNull()
    expect(calculateSavings({ ...inputs, km: NaN })).toBeNull()
    expect(calculateSavings({ ...inputs, electricityPerKwh: -1 })).toBeNull()
  })
})

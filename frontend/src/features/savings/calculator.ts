export interface SavingsInputs {
  km: number
  petrolPerLitre: number
  petrolKmPerLitre: number
  electricityPerKwh: number
  kwhPer100Km: number
}
export function calculateSavings(input: SavingsInputs) {
  const { km, petrolPerLitre, petrolKmPerLitre, electricityPerKwh, kwhPer100Km } = input
  if (
    !Object.values(input).every(Number.isFinite) ||
    km < 0 ||
    petrolPerLitre < 0 ||
    petrolKmPerLitre <= 0 ||
    electricityPerKwh < 0 ||
    kwhPer100Km <= 0
  )
    return null
  const petrol = (km / petrolKmPerLitre) * petrolPerLitre
  const electricity = (km / 100) * kwhPer100Km * electricityPerKwh
  if (![petrol, electricity].every(Number.isFinite)) return null
  return { petrol, electricity, saved: petrol - electricity, kwh: (km / 100) * kwhPer100Km }
}

export interface RouteCharger {
  id: string
  name: string
  km: number
  powerKw: number
}
export interface TripStop extends RouteCharger {
  arrivalSoc: number
  departureSoc: number
  chargeKwh: number
  minutes: number
}
export interface TripPlan {
  stops: TripStop[]
  arrivalSoc: number | null
  problem: string | null
}

/** Illustrative corridor distances, constant consumption and 90% charging efficiency. */
export function planTrip(
  distanceKm: number,
  batteryKwh: number,
  consumption: number,
  initialSoc: number,
  chargers: RouteCharger[],
  vehiclePowerKw: number,
): TripPlan {
  if (
    ![distanceKm, batteryKwh, consumption, initialSoc, vehiclePowerKw].every(Number.isFinite) ||
    distanceKm <= 0 ||
    batteryKwh <= 0 ||
    consumption <= 0 ||
    initialSoc < 0 ||
    initialSoc > 100 ||
    vehiclePowerKw <= 0
  ) {
    return { stops: [], arrivalSoc: null, problem: 'Enter valid battery and vehicle values.' }
  }
  const reserve = batteryKwh * 0.1
  let energy = (batteryKwh * initialSoc) / 100
  let position = 0
  const stops: TripStop[] = []
  const candidates = chargers
    .filter((c) => Number.isFinite(c.km) && c.km > 0 && c.km < distanceKm && Number.isFinite(c.powerKw) && c.powerKw > 0)
    .sort((a, b) => a.km - b.km)
  while (energy - (distanceKm - position) * consumption < reserve) {
    const reachable = candidates.filter((c) => c.km > position && energy - (c.km - position) * consumption >= reserve)
    const stop = reachable.at(-1)
    if (!stop)
      return {
        stops,
        arrivalSoc: null,
        problem: stops.length
          ? 'No compatible sample stop is reachable on the next leg. Choose another route or charge further before leaving.'
          : 'Charge before departure: no sample stop is reachable with a 10% reserve.',
      }
    energy -= (stop.km - position) * consumption
    const arrivalSoc = (energy / batteryKwh) * 100
    const chargeKwh = Math.max(0, batteryKwh * 0.8 - energy)
    energy += chargeKwh
    stops.push({
      ...stop,
      arrivalSoc,
      departureSoc: (energy / batteryKwh) * 100,
      chargeKwh,
      minutes: Math.ceil((chargeKwh / (Math.min(stop.powerKw, vehiclePowerKw) * 0.9)) * 60),
    })
    position = stop.km
  }
  return { stops, arrivalSoc: ((energy - (distanceKm - position) * consumption) / batteryKwh) * 100, problem: null }
}

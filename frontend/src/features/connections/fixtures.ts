export interface FleetTask {
  id: string
  vehicle: string
  target: number
  departure: string
}
export const FLEET_VEHICLES = [
  { id: 'AMP-01', name: 'City pool · Nexon EV', soc: 32, km: 84 },
  { id: 'AMP-02', name: 'Operations · MG ZS EV', soc: 68, km: 142 },
  { id: 'AMP-03', name: 'Shuttle · Nexon EV', soc: 21, km: 56 },
]

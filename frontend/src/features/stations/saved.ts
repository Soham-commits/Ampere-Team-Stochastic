import { CONNECTOR_LABEL, hostUser } from '../../domain/catalogue'
import { readDb } from '../../server/db'
import { useDemoState } from '../shared/useDemoState'

export interface AmpereStation {
  id: string
  name: string
  area: string
  lat: number
  lng: number
  hostName: string | null
  connectors: string
  pricePerKwh: number | null
}

/** Active, bookable Ampere stations with public map positions only (never private access details). */
export function listAmpereStations(): AmpereStation[] {
  const db = readDb()
  return db.sites
    .filter((s) => s.listing_state === 'ACTIVE' && s.source_kind !== 'DIRECTORY')
    .flatMap((s) => {
      const resources = db.resources.filter((r) => r.site_id === s.id && r.reservable)
      if (!resources.length) return []
      const connectors = db.connectors.filter((c) => resources.some((r) => r.id === c.resource_id))
      const labels = [...new Set(connectors.map((c) => `${CONNECTOR_LABEL[c.standard]} ${c.rated_power_kw} kW`))]
      return [
        {
          id: s.id,
          name: s.name,
          area: s.public_area,
          lat: s.approx_lat,
          lng: s.approx_lng,
          hostName: hostUser(s.host_account_id)?.display_name ?? null,
          connectors: labels.join(' · '),
          pricePerKwh: db.tariffs.find((t) => t.site_id === s.id)?.energy_paise_per_kwh ?? null,
        },
      ]
    })
}

/** Stations the signed-in user saved for later; stored per account on this device. */
export function useSavedStations(userId: string) {
  const [ids, setIds] = useDemoState<string[]>(userId, 'saved-stations', [])
  const toggle = (id: string) => setIds(ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id])
  return { ids, isSaved: (id: string) => ids.includes(id), toggle }
}

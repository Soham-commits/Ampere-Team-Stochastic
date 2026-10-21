import type { ChargingResource, Connector, Site } from '../../../frontend/src/domain/types'
import { mutateDb } from '../engine'
import { ID_PREFIX, loadSnapshot, type RealCharger, type RealChargerSnapshot } from './ocmSnapshot'

/*
 * Real public chargers around the demo origin, from Open Charge Map, with road distances measured by OSRM.
 * The snapshot in data/real-chargers.json is produced by `npm run import:chargers` and committed, so the demo
 * never depends on either service being reachable. Records are directory listings: Ampere shows them through
 * the same strict range and connector filter, but cannot reserve them or report live status.
 */

/** Catalogue records for one charger. Each OCM connector becomes its own resource, so power stays per connector. */
export function toCatalogue(c: RealCharger, snap: RealChargerSnapshot) {
  const siteId = `${ID_PREFIX}${c.ocm_id}`
  const retrieved = snap.retrieved_at.slice(0, 10)
  const site: Site = {
    id: siteId,
    host_account_id: null,
    name: c.name,
    site_type: 'PUBLIC_NETWORK',
    listing_state: 'ACTIVE',
    public_area: c.area,
    approx_lat: c.lat,
    approx_lng: c.lng,
    location_precision: 'EXACT',
    access_summary: `Public charger${c.operator ? ` operated by ${c.operator}` : ''}. The operator handles access, charging and payment. Ampere has not reserved a connector.`,
    amenities: [],
    accessibility_notes: c.usage ?? 'Unknown.',
    source_kind: 'DIRECTORY',
    source_updated_at: c.verified_at ?? snap.retrieved_at,
    operator_note: `Real listing: Open Charge Map #${c.ocm_id} (${snap.licence}), retrieved ${retrieved}. Road distance from the demo origin measured with ${snap.routing}. ${c.address}`,
    route_fixture_m: c.road_distance_m,
    is_demo: true,
  }
  const resources: ChargingResource[] = []
  const connectors: Connector[] = []
  c.connectors.forEach((k, i) => {
    const resId = `res-ocm-${c.ocm_id}-${i + 1}`
    resources.push({
      id: resId,
      site_id: siteId,
      label: `${k.mode} point${k.quantity > 1 ? ` ×${k.quantity}` : ''}`,
      rated_power_kw: k.power_kw,
      site_power_limit_kw: k.power_kw,
      current_status: 'UNKNOWN',
      status_source: 'DIRECTORY',
      status_observed_at: snap.retrieved_at,
      reservable: false,
      is_demo: true,
    })
    connectors.push({ id: `con-ocm-${c.ocm_id}-${i + 1}`, resource_id: resId, standard: k.standard, mode: k.mode, rated_power_kw: k.power_kw, cable: 'HOST_TETHERED', active: true })
  })
  return { site, resources, connectors }
}

/** Replaces every Open Charge Map record in the database with the committed snapshot. Idempotent. */
export async function syncRealChargers() {
  const snap = loadSnapshot()
  if (!snap) return 0
  const records = snap.chargers.map((c) => toCatalogue(c, snap))
  await mutateDb((d) => {
    const ours = (id: string) => id.startsWith(ID_PREFIX)
    const ourResource = (id: string) => id.startsWith('res-ocm-')
    d.sites = [...d.sites.filter((s) => !ours(s.id)), ...records.map((r) => r.site)]
    d.resources = [...d.resources.filter((r) => !ourResource(r.id)), ...records.flatMap((r) => r.resources)]
    d.connectors = [...d.connectors.filter((c) => !ourResource(c.resource_id)), ...records.flatMap((r) => r.connectors)]
  })
  return records.length
}

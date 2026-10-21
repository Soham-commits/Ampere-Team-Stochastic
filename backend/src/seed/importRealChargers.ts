/*
 * Refreshes data/real-chargers.json: public chargers within IMPORT_RADIUS_KM of the demo origin from
 * Open Charge Map, plus a driving distance to each from OSRM. Run: OCM_API_KEY=... npm run import:chargers
 */
import { writeFileSync } from 'node:fs'
import type { ChargingMode, ConnectorStandard } from '../../../frontend/src/domain/types'
import { DEMO_ORIGIN } from '../../../frontend/src/domain/policy'
import { SNAPSHOT_FILE, type RealCharger, type RealChargerSnapshot } from './ocmSnapshot'

const RADIUS_KM = Number(process.env.IMPORT_RADIUS_KM ?? 20)
const OSRM = process.env.OSRM_URL ?? 'https://router.project-osrm.org'
const key = process.env.OCM_API_KEY
if (!key) {
  console.error('Set OCM_API_KEY (free key from https://openchargemap.org/site/profile/applications).')
  process.exit(1)
}

interface OcmConnection {
  ConnectionTypeID?: number | null
  CurrentTypeID?: number | null
  PowerKW?: number | null
  Quantity?: number | null
  StatusType?: { IsOperational?: boolean | null } | null
}
interface OcmPoi {
  ID: number
  AddressInfo: { Title: string; AddressLine1?: string | null; AddressLine2?: string | null; Town?: string | null; Latitude: number; Longitude: number }
  OperatorInfo?: { Title?: string } | null
  UsageType?: { Title?: string; IsMembershipRequired?: boolean | null } | null
  StatusType?: { IsOperational?: boolean | null } | null
  Connections?: OcmConnection[]
  DateLastVerified?: string | null
}

// Open Charge Map connection type IDs (GET /v3/referencedata) that the app's car catalogue can match.
const CCS2 = 33
const CHADEMO = 2
const TYPE2 = [25, 1036] // socket only, tethered
const DC = 30

/** Maps a listed connection to the app's connector model, skipping two-wheeler and inconsistent records. */
function connector(c: OcmConnection): { standard: ConnectorStandard; mode: ChargingMode } | null {
  const dc = c.CurrentTypeID === DC
  if (c.ConnectionTypeID === CCS2) return dc ? { standard: 'CCS2', mode: 'DC' } : null
  if (c.ConnectionTypeID === CHADEMO) return dc ? { standard: 'CHADEMO', mode: 'DC' } : null
  if (TYPE2.includes(c.ConnectionTypeID ?? -1)) return dc ? null : { standard: 'TYPE2', mode: 'AC' }
  return null
}

async function json<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { 'user-agent': 'ampere-hackathon-import/0.1', ...init?.headers } })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} from ${new URL(url).host}: ${(await res.text()).slice(0, 200)}`)
  return (await res.json()) as T
}

const pois = await json<OcmPoi[]>(
  `https://api.openchargemap.io/v3/poi/?output=json&latitude=${DEMO_ORIGIN.lat}&longitude=${DEMO_ORIGIN.lng}&distance=${RADIUS_KM}&distanceunit=KM&maxresults=200&compact=false&verbose=false`,
  { headers: { 'x-api-key': key } },
)

const candidates = pois
  .filter((p) => p.StatusType?.IsOperational !== false)
  .map((p) => {
    const connectors = (p.Connections ?? [])
      .filter((c) => c.StatusType?.IsOperational !== false && (c.PowerKW ?? 0) > 0)
      .flatMap((c) => {
        const k = connector(c)
        return k ? [{ ...k, power_kw: Math.round(c.PowerKW! * 10) / 10, quantity: Math.max(1, c.Quantity ?? 1) }] : []
      })
    return { p, connectors }
  })
  .filter((x) => x.connectors.length)

// One OSRM table request: driving distance from the demo origin to every candidate (public server limit: 100 points).
const coords = [DEMO_ORIGIN, ...candidates.slice(0, 99).map((x) => ({ lat: x.p.AddressInfo.Latitude, lng: x.p.AddressInfo.Longitude }))]
const table = await json<{ code: string; distances: (number | null)[][] }>(
  `${OSRM}/table/v1/driving/${coords.map((c) => `${c.lng.toFixed(6)},${c.lat.toFixed(6)}`).join(';')}?sources=0&annotations=distance`,
)
if (table.code !== 'Ok') throw new Error(`OSRM returned ${table.code}`)

const chargers: RealCharger[] = candidates
  .slice(0, 99)
  .map((x, i) => ({ x, d: table.distances[0][i + 1] }))
  .filter(({ d }) => d != null)
  .map(({ x: { p, connectors }, d }) => ({
    ocm_id: p.ID,
    name: p.AddressInfo.Title.trim(),
    area: [p.AddressInfo.AddressLine2, p.AddressInfo.Town].filter(Boolean).join(', ') || 'Pune',
    address: [p.AddressInfo.AddressLine1, p.AddressInfo.AddressLine2, p.AddressInfo.Town].filter(Boolean).join(', '),
    lat: p.AddressInfo.Latitude,
    lng: p.AddressInfo.Longitude,
    operator: p.OperatorInfo?.Title && !/unknown/i.test(p.OperatorInfo.Title) ? p.OperatorInfo.Title : null,
    usage: p.UsageType?.Title ?? null,
    connectors,
    road_distance_m: Math.round(d!),
    verified_at: p.DateLastVerified ?? null,
  }))
  .sort((a, b) => a.road_distance_m - b.road_distance_m)

const snapshot: RealChargerSnapshot = {
  source: 'Open Charge Map (https://openchargemap.org)',
  licence: 'CC BY 4.0',
  retrieved_at: new Date().toISOString(),
  origin: DEMO_ORIGIN,
  routing: `OSRM driving route (${new URL(OSRM).host})`,
  chargers,
}
writeFileSync(SNAPSHOT_FILE, JSON.stringify(snapshot, null, 2) + '\n')
console.log(`Wrote ${chargers.length} chargers (of ${pois.length} listed) to ${SNAPSHOT_FILE.pathname}`)
for (const c of chargers.slice(0, 15))
  console.log(`  ${(c.road_distance_m / 1000).toFixed(1).padStart(5)} km  ${c.name}  [${c.connectors.map((k) => `${k.standard} ${k.power_kw} kW`).join(', ')}]`)

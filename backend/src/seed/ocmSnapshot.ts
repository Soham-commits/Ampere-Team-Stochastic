import { existsSync, readFileSync } from 'node:fs'
import type { ChargingMode, ConnectorStandard } from '../../../frontend/src/domain/types'

/** Shape of data/real-chargers.json, written by importRealChargers.ts and read at server start. */

export interface RealCharger {
  ocm_id: number
  name: string
  area: string
  address: string
  lat: number
  lng: number
  operator: string | null
  usage: string | null
  connectors: { standard: ConnectorStandard; mode: ChargingMode; power_kw: number; quantity: number }[]
  road_distance_m: number
  verified_at: string | null
}

export interface RealChargerSnapshot {
  source: string
  licence: string
  retrieved_at: string
  origin: { lat: number; lng: number; label: string }
  routing: string
  chargers: RealCharger[]
}

export const SNAPSHOT_FILE = new URL('../../data/real-chargers.json', import.meta.url)
export const ID_PREFIX = 'site-ocm-'

export function loadSnapshot(): RealChargerSnapshot | null {
  if (!existsSync(SNAPSHOT_FILE)) return null
  return JSON.parse(readFileSync(SNAPSHOT_FILE, 'utf8')) as RealChargerSnapshot
}

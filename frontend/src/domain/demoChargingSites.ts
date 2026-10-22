import type { SiteType } from './types'

interface DemoChargingSiteSpec {
  id: string
  name: string
  area: string
  lat: number
  lng: number
  distance: number | null
  type: Extract<SiteType, 'CAFE' | 'OFFICE'>
}

/** Fictional sites span local and regional distances to exercise battery-aware discovery. */
export const DEMO_CHARGING_SITE_SPECS: DemoChargingSiteSpec[] = [
  { id: 'site-riverside', name: 'Riverside Coffee House', area: 'Koregaon Park riverside', lat: 18.5425, lng: 73.9002, distance: 2200, type: 'CAFE' },
  { id: 'site-courtyard', name: 'The Courtyard Workspace', area: 'Kalyani Nagar business district', lat: 18.5468, lng: 73.9092, distance: 3300, type: 'OFFICE' },
  { id: 'site-kothrud-cafe', name: 'Campus Corner Café', area: 'MIT College Road, Kothrud', lat: 18.5158, lng: 73.8167, distance: null, type: 'CAFE' },
  { id: 'site-paud-workspace', name: 'Paud Road Workspace', area: 'Paud Road, Kothrud', lat: 18.5105, lng: 73.8115, distance: null, type: 'OFFICE' },
  { id: 'site-rambaug-charge', name: 'Rambaug Courtyard', area: 'Rambaug Colony, Kothrud', lat: 18.5077, lng: 73.8225, distance: null, type: 'CAFE' },
  { id: 'site-west-garden', name: 'West Garden Charging', area: 'Western Pune · demo site', lat: 18.5577, lng: 73.8048, distance: null, type: 'CAFE' },
  { id: 'site-north-square', name: 'North Square Workspace', area: 'Pune north corridor · demo site', lat: 18.6477, lng: 73.8048, distance: null, type: 'OFFICE' },
  { id: 'site-orchard-court', name: 'Orchard Charging Court', area: 'Outer Pune corridor · demo site', lat: 18.7177, lng: 73.8048, distance: null, type: 'CAFE' },
  { id: 'site-corridor-stop', name: 'Corridor Coffee Stop', area: 'Regional north corridor · demo site', lat: 18.7977, lng: 73.8048, distance: null, type: 'CAFE' },
  { id: 'site-valley-stop', name: 'Valley Charging Court', area: 'Regional north corridor · demo site', lat: 18.9477, lng: 73.8048, distance: null, type: 'CAFE' },
  { id: 'site-ridge-workspace', name: 'Ridge Workspace', area: 'Regional north corridor · demo site', lat: 19.1477, lng: 73.8048, distance: null, type: 'OFFICE' },
  { id: 'site-hill-court', name: 'Hill Charging Court', area: 'Regional north corridor · demo site', lat: 19.3577, lng: 73.8048, distance: null, type: 'CAFE' },
  { id: 'site-north-rest', name: 'North Rest Charging', area: 'Regional north corridor · demo site', lat: 19.4877, lng: 73.8048, distance: null, type: 'CAFE' },
]

export const EXTRA_DEMO_SITE_IDS = DEMO_CHARGING_SITE_SPECS.map(({ id }) => id)

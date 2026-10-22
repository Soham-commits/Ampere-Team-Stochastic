import type { LatLng } from './types'

/** Fixed campus origin shared by driver discovery and booking quotes. */
export const MIT_WPU_ORIGIN: LatLng & { label: string } = {
  lat: 18.5177,
  lng: 73.8148,
  label: 'MIT-WPU, Pune · mock location',
}

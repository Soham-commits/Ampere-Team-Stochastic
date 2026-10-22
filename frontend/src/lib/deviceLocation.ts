export type DeviceOrigin = { lat: number; lng: number; label: string }

export const MIT_WPU_ORIGIN: DeviceOrigin = { lat: 18.5177, lng: 73.8148, label: 'MIT-WPU, Pune · mock location' }

/** One central mock origin, regardless of legacy saved locations. */
export function startingOrigin(_saved?: DeviceOrigin): DeviceOrigin {
  return MIT_WPU_ORIGIN
}

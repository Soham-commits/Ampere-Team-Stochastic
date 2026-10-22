import type { RouteCharger } from './planner'

export const TRIP_ROUTES: { id: string; destination: string; distanceKm: number; chargers: RouteCharger[] }[] = [
  {
    id: 'lonavala',
    destination: 'Lonavala',
    distanceKm: 65,
    chargers: [
      { id: 'tathawade', name: 'Tathawade charging plaza', km: 22, powerKw: 30 },
      { id: 'kamshet', name: 'Kamshet highway stop', km: 48, powerKw: 50 },
    ],
  },
  {
    id: 'mumbai',
    destination: 'Mumbai',
    distanceKm: 155,
    chargers: [
      { id: 'tathawade', name: 'Tathawade charging plaza', km: 22, powerKw: 30 },
      { id: 'kamshet', name: 'Kamshet highway stop', km: 48, powerKw: 50 },
      { id: 'khalapur', name: 'Khalapur charging plaza', km: 88, powerKw: 60 },
      { id: 'panvel', name: 'Panvel charging stop', km: 122, powerKw: 50 },
    ],
  },
  {
    id: 'nashik',
    destination: 'Nashik',
    distanceKm: 210,
    chargers: [
      { id: 'chakan', name: 'Chakan charging stop', km: 30, powerKw: 30 },
      { id: 'rajgurunagar', name: 'Rajgurunagar plaza', km: 55, powerKw: 50 },
      { id: 'narayangaon', name: 'Narayangaon charging stop', km: 90, powerKw: 50 },
      { id: 'sangamner', name: 'Sangamner plaza', km: 145, powerKw: 60 },
      { id: 'sinnar', name: 'Sinnar charging stop', km: 180, powerKw: 50 },
    ],
  },
]

export interface Coord {
  lat: number
  lng: number
}

export const TRIP_ORIGIN: Coord & { label: string } = { lat: 18.5204, lng: 73.8567, label: 'Pune' }

/** Approximate map positions for the sample corridor stops and destinations. */
export const TRIP_COORDS: Record<string, Coord> = {
  lonavala: { lat: 18.7546, lng: 73.4062 },
  mumbai: { lat: 19.076, lng: 72.8777 },
  nashik: { lat: 19.9975, lng: 73.7898 },
  tathawade: { lat: 18.615, lng: 73.757 },
  kamshet: { lat: 18.752, lng: 73.534 },
  khalapur: { lat: 18.819, lng: 73.274 },
  panvel: { lat: 18.9894, lng: 73.1175 },
  chakan: { lat: 18.76, lng: 73.863 },
  rajgurunagar: { lat: 18.867, lng: 73.887 },
  narayangaon: { lat: 19.119, lng: 73.971 },
  sangamner: { lat: 19.567, lng: 74.209 },
  sinnar: { lat: 19.848, lng: 73.998 },
}

/** Google Maps directions deep link: origin, charging stops as waypoints, destination. */
export function googleMapsDirectionsUrl(origin: Coord, stops: Coord[], destination: Coord): string {
  const at = (c: Coord) => `${c.lat},${c.lng}`
  const params = new URLSearchParams({ api: '1', origin: at(origin), destination: at(destination), travelmode: 'driving' })
  if (stops.length) params.set('waypoints', stops.map(at).join('|'))
  return `https://www.google.com/maps/dir/?${params.toString()}`
}

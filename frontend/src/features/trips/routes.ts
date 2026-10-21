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

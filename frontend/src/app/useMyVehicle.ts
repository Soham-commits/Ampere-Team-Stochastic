import { useQuery, useSession } from './hooks'
import { readDb } from '../server/db'

export function useMyVehicle() {
  const user = useSession()
  const q = useQuery(async () => ({ ok: true as const, data: readDb().vehicles.find((v) => v.owner_id === user?.id) ?? null, request_id: '' }), [user?.id])
  return q.data
}

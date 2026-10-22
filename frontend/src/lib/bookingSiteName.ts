import type { RequestedPayload } from '../domain/booking'
import { readDb } from '../server/db'

/** Use the current listing title while preserving the recorded name as a fallback. */
export function bookingSiteName(request: Pick<RequestedPayload, 'site_id' | 'site_name'>): string {
  return readDb().sites.find((site) => site.id === request.site_id)?.name ?? request.site_name
}

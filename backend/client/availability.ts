/*
 * Replaces frontend/src/server/availability.ts for the app (pages/Station.tsx uses slotProblem to grey out bays).
 * Same rules as the engine, evaluated against the replica's schedules, blackouts and anonymous occupancy.
 * The server re-checks every slot when a quote or booking is requested.
 */
import { POLICY } from '../../frontend/src/domain/policy'
import { istParts } from '../../frontend/src/lib/time'
import { replica } from './transport'

export type SlotProblem = 'OUTSIDE_SCHEDULE' | 'BLACKOUT' | 'SLOT_UNAVAILABLE' | 'IN_PAST' | 'INVALID_DURATION'

export function withinSchedule(resourceId: string, start: number, end: number) {
  const rules = replica.db.rules.filter((r) => r.resource_id === resourceId)
  if (!rules.length) return false
  for (let t = start; t < end; t += 15 * 60_000) {
    const { weekday, minuteOfDay } = istParts(t)
    if (!rules.some((r) => r.weekdays.includes(weekday) && minuteOfDay >= r.start_min && minuteOfDay + 15 <= r.end_min)) return false
  }
  return true
}

export function slotProblem(resourceId: string, start: number, end: number, now: number): SlotProblem | null {
  const dur = (end - start) / 60_000
  if (!(end > start) || dur < POLICY.min_booking_min || dur > POLICY.max_booking_min || dur % POLICY.increment_min !== 0) return 'INVALID_DURATION'
  if (start < now - 60_000) return 'IN_PAST'
  if (!withinSchedule(resourceId, start, end)) return 'OUTSIDE_SCHEDULE'
  const blocked = end + POLICY.buffer_min * 60_000
  if (replica.db.exceptions.some((x) => x.resource_id === resourceId && Date.parse(x.start_at) < blocked && Date.parse(x.end_at) > start)) return 'BLACKOUT'
  if ((replica.occupancy[resourceId] ?? []).some((r) => r.start < blocked && r.end > start)) return 'SLOT_UNAVAILABLE'
  return null
}

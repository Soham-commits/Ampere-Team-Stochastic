/*
 * Replaces frontend/src/server/bookings.ts for the app. Only the pure helpers the pages use for display;
 * every command runs on the server. Kept identical to the engine (checked by test/parity.test.ts).
 */
import type { BookingState } from '../../frontend/src/domain/booking'
import { POLICY } from '../../frontend/src/domain/policy'
import type { User } from '../../frontend/src/domain/types'
import type { BookingHeader } from '../../frontend/src/server/db'

export type Action = 'ACCEPT' | 'DECLINE' | 'PAY' | 'DEPART' | 'ARRIVAL_CODE' | 'CHECK_IN' | 'START' | 'COMPLETE' | 'CANCEL' | 'ACCESS' | 'RECEIPT'

export const isDriver = (a: User, h: BookingHeader) => a.id === h.driver_id
export const isHost = (a: User, h: BookingHeader) => !!a.host_account_id && a.host_account_id === h.host_account_id

export function allowedActions(s: BookingState, h: BookingHeader, actor: User): Action[] {
  const a: Action[] = []
  const driver = isDriver(actor, h)
  const host = isHost(actor, h)
  if (s.lifecycle === 'done') return driver || host ? ['RECEIPT'] : []
  if (s.ended) return []
  if (host && s.lifecycle === 'requested') a.push('ACCEPT', 'DECLINE')
  if (driver && s.lifecycle === 'host_confirmed' && s.payment !== 'CAPTURED') a.push('PAY')
  if (driver && s.lifecycle === 'host_confirmed' && s.payment === 'CAPTURED') a.push('DEPART')
  if (driver && s.payment === 'CAPTURED' && (s.lifecycle === 'host_confirmed' || s.lifecycle === 'on_the_way')) a.push('ARRIVAL_CODE', 'ACCESS')
  if (host && s.lifecycle === 'on_the_way' && !s.arrival_verified_at) a.push('CHECK_IN')
  if (host && s.lifecycle === 'on_the_way' && s.arrival_verified_at) a.push('START')
  if (host && s.lifecycle === 'charging') a.push('COMPLETE')
  if ((driver || host) && s.lifecycle !== 'charging') a.push('CANCEL')
  if (host && s.lifecycle !== 'requested') a.push('ACCESS')
  return a
}

export function arrivalWindow(s: BookingState) {
  const start = Date.parse(s.request.start_at)
  return { opens: start - POLICY.arrival_before_min * 60_000, closes: start + POLICY.arrival_after_min * 60_000 }
}

export function sessionProgress(s: BookingState, now: number) {
  if (s.completed) return 1
  if (!s.session) return 0
  return Math.min(1, Math.max(0, (now - Date.parse(s.session.started_at)) / (s.session.demo_seconds * 1000)))
}

/** Expiry runs on the server; kept so the app's startup code has nothing to change. */
export async function runExpiryWorker() {}

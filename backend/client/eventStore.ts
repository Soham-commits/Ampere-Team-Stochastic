/* Replaces frontend/src/server/eventStore.ts for the app: streams this account may read, kept live by realtime. */
import type { BookingEvent } from '../../frontend/src/domain/booking'
import { replica } from './transport'

export function readStream(bookingId: string): BookingEvent[] {
  return replica.streams[bookingId] ?? []
}

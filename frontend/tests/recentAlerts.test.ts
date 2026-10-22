import { describe, expect, it } from 'vitest'
import { recentBookingAlerts } from '../src/features/notifications/recentAlerts'

describe('recent booking alerts', () => {
  it('keeps the newest update per booking and preserves separate payment transactions', () => {
    const events = [
      { booking_id: 'society', event: 'completed' },
      { booking_id: 'society', event: 'charging' },
      { booking_id: 'cafe-durga', event: 'payment' },
      { booking_id: 'vaishali', event: 'payment' },
      { booking_id: 'cafe-durga', event: 'confirmed' },
      { booking_id: 'home', event: 'confirmed' },
      { booking_id: 'office', event: 'requested' },
    ]
    expect(recentBookingAlerts(events)).toEqual([events[0], events[2], events[3], events[5]])
    expect(events).toHaveLength(7)
  })
  it('handles an empty inbox and a single booking without filler alerts', () => {
    expect(recentBookingAlerts([])).toEqual([])
    expect(recentBookingAlerts([{ booking_id: 'one', event: 'payment' }, { booking_id: 'one', event: 'confirmed' }])).toEqual([{ booking_id: 'one', event: 'payment' }])
  })
})

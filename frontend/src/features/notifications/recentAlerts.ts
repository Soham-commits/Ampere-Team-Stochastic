/** Input is newest first. Home shows one update per booking; Inbox retains every event. */
export function recentBookingAlerts<T extends { booking_id: string }>(alerts: T[], limit = 4): T[] {
  const seen = new Set<string>()
  return alerts.filter((alert) => {
    if (seen.has(alert.booking_id)) return false
    seen.add(alert.booking_id)
    return true
  }).slice(0, limit)
}

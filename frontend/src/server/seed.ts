import type { EventType, QuoteSnapshot, VehicleSnapshot } from '../domain/booking'
import { buildCatalogue, EXTRA_DEMO_SITE_IDS } from '../domain/catalogue'
import { POLICY } from '../domain/policy'
import { price } from '../domain/calc'
import { bookingRef, uuid } from '../lib/ids'
import { ceilToStep, istParts } from '../lib/time'
import { mutateDb, readDb, serverNow, type BookingHeader } from './db'
import { appendEvent, readStream, type AppendMeta } from './eventStore'

/*
 * Seeds two synthetic streams so the demo has history:
 *  - Kabir's confirmed, paid booking on the residential wallbox (an existing overlapping booking);
 *  - Kabir's completed café session yesterday (receipt and illustrative host proceeds).
 * Streams are built with the same append routine as live commands.
 */
export async function seedDemoBookings() {
  const now = serverNow()
  const iso = (t: number) => new Date(t).toISOString()
  const headers: BookingHeader[] = []

  const vehicle: VehicleSnapshot = { model_id: 'vm-zs-ev-demo', model_label: 'MG ZS EV (Demo profile · 48 kWh usable)', soc: 30, origin: { lat: 18.536, lng: 73.894 }, range_budget_m: 63247, route_m: 2600, route_provider: 'Seeded demo road distance' }
  const quote = (gridWh: number, powerKw: number, plan: 'BASIC' | 'STANDARD', std: 'TYPE2'): QuoteSnapshot => {
    const fee = plan === 'STANDARD' ? 2000 : 0
    const p = price(gridWh, 1400, fee)
    return { quote_id: uuid(), plan, connector_standard: std, charging_mode: 'AC', effective_power_kw: powerKw, grid_wh: gridWh, battery_wh: Math.floor(gridWh * POLICY.efficiency), duration_s: Math.round((gridWh / 1000 / powerKw) * 3600), energy_paise_per_kwh: 1400, energy_subtotal_paise: p.energy_subtotal_paise, booking_fee_paise: fee, total_paise: p.total_paise, tariff_version: 1, is_demo: true }
  }

  // 1. Upcoming confirmed booking on the home wallbox.
  {
    let start = ceilToStep(now + 60 * 60_000, 15)
    const { minuteOfDay, dayStart } = istParts(start)
    if (minuteOfDay < 7 * 60 || minuteOfDay > 20 * 60) start = (minuteOfDay > 20 * 60 ? dayStart + 86_400_000 : dayStart) + 10 * 3600_000
    const end = start + 60 * 60_000
    const id = uuid()
    const ref = bookingRef()
    const q = quote(6000, 7.2, 'STANDARD', 'TYPE2')
    const t0 = now - 20 * 60_000
    const meta = (role: AppendMeta['actor_role'], actor: string, at: number): AppendMeta => ({ actor_id: actor, actor_role: role, source: 'UI', seed_recorded_at: iso(at) })
    appendEvent(id, 'BookingRequested', { booking_ref: ref, site_id: 'site-home', site_name: 'Kalyani Nagar residence', resource_id: 'res-home-1', connector_id: 'con-home-t2', host_account_id: 'ha-home', driver_id: 'u-driver2', start_at: iso(start), end_at: iso(end), blocked_until: iso(end + POLICY.buffer_min * 60_000), host_response_deadline: iso(t0 + 120_000), policy_version: POLICY.version, quote: q, vehicle }, meta('DRIVER', 'u-driver2', t0))
    appendEvent(id, 'HostConfirmed', { checkout_deadline: iso(t0 + 60_000 + 300_000) }, meta('HOST', 'u-host-home', t0 + 60_000))
    appendEvent(id, 'PaymentCaptured', { payment_attempt_id: uuid(), amount_paise: q.total_paise, provider: 'DEMO' }, { ...meta('DRIVER', 'u-driver2', t0 + 120_000), source: 'PROVIDER' })
    headers.push({ id, booking_ref: ref, created_at: iso(t0), driver_id: 'u-driver2', host_account_id: 'ha-home', resource_id: 'res-home-1', site_id: 'site-home', is_demo: true })
  }

  // 2. Completed café session yesterday.
  {
    const { dayStart } = istParts(now)
    const start = dayStart - 86_400_000 + 18 * 3600_000
    const end = start + 90 * 60_000
    const id = uuid()
    const ref = bookingRef()
    const q = quote(8000, 7.4, 'STANDARD', 'TYPE2')
    const t0 = start - 25 * 60_000
    const meta = (role: AppendMeta['actor_role'], actor: string, at: number): AppendMeta => ({ actor_id: actor, actor_role: role, source: 'UI', seed_recorded_at: iso(at) })
    appendEvent(id, 'BookingRequested', { booking_ref: ref, site_id: 'site-cafe', site_name: 'Vaishali Café · demo', resource_id: 'res-cafe-2', connector_id: 'con-cafe2-t2', host_account_id: 'ha-cafe', driver_id: 'u-driver2', start_at: iso(start), end_at: iso(end), blocked_until: iso(end + POLICY.buffer_min * 60_000), host_response_deadline: iso(t0 + 120_000), policy_version: POLICY.version, quote: q, vehicle: { ...vehicle, route_m: 1800 } }, meta('DRIVER', 'u-driver2', t0))
    appendEvent(id, 'HostConfirmed', { checkout_deadline: iso(t0 + 50_000 + 300_000) }, meta('HOST', 'u-host-cafe', t0 + 50_000))
    appendEvent(id, 'PaymentCaptured', { payment_attempt_id: uuid(), amount_paise: q.total_paise, provider: 'DEMO' }, { ...meta('DRIVER', 'u-driver2', t0 + 100_000), source: 'PROVIDER' })
    appendEvent(id, 'DriverDeparted', { range_budget_m: 63247, route_m: 1800, route_provider: 'Seeded demo road distance' }, meta('DRIVER', 'u-driver2', t0 + 150_000))
    appendEvent(id, 'ArrivalVerified', {}, meta('HOST', 'u-host-cafe', start - 4 * 60_000))
    const sid = uuid()
    appendEvent(id, 'ChargingStarted', { session_id: sid, estimated_duration_s: q.duration_s, demo_seconds: POLICY.demo_session_seconds }, meta('HOST', 'u-host-cafe', start))
    appendEvent(id, 'ChargingCompleted', { session_id: sid, grid_wh: 8000, battery_gain_wh: 7200, metering_source: 'DEMO' }, meta('HOST', 'u-host-cafe', start + q.duration_s * 1000))
    headers.push({ id, booking_ref: ref, created_at: iso(t0), driver_id: 'u-driver2', host_account_id: 'ha-cafe', resource_id: 'res-cafe-2', site_id: 'site-cafe', is_demo: true })
  }

  await mutateDb((d) => {
    d.bookings.push(...headers)
  })
}

/** Add driver-facing examples once, including to an already-used demo browser. */
export async function seedDriverDemoBookings() {
  const { withLocks } = await import('./storage')
  const { nextSlots } = await import('./availability')
  await withLocks(['demo-driver-fixtures-v1'], async () => {
    if (readDb().mode !== 'DEMO') return
    const missing = EXTRA_DEMO_SITE_IDS.filter((id) => !readDb().sites.some((s) => s.id === id))
    if (missing.length) {
      const catalogue = buildCatalogue(serverNow())
      const resources = catalogue.resources.filter((r) => missing.includes(r.site_id))
      const resourceIds = resources.map((r) => r.id)
      await mutateDb((d) => {
        d.sites.push(...catalogue.sites.filter((s) => missing.includes(s.id)))
        d.site_private.push(...catalogue.site_private.filter((s) => missing.includes(s.site_id)))
        d.resources.push(...resources)
        d.connectors.push(...catalogue.connectors.filter((c) => resourceIds.includes(c.resource_id)))
        d.rules.push(...catalogue.rules.filter((r) => resourceIds.includes(r.resource_id)))
        d.checks.push(...catalogue.checks.filter((c) => missing.includes(c.site_id)))
        d.tariffs.push(...catalogue.tariffs.filter((t) => missing.includes(t.site_id)))
      })
    }
    // Refresh seeded display names without rewriting immutable booking events.
    const names = new Map(buildCatalogue(serverNow()).sites.map((site) => [site.id, site.name]))
    if (readDb().sites.some((site) => names.has(site.id) && names.get(site.id) !== site.name)) {
      await mutateDb((d) => {
        for (const site of d.sites) if (names.has(site.id)) site.name = names.get(site.id)!
      })
    }
    // These sample AC wallboxes have sockets plus a host-supplied detachable cable.
    const flexibleIds = ['con-cafe2-t2', 'con-riverside-t2', 'con-courtyard-t2']
    if (readDb().connectors.some((c) => flexibleIds.includes(c.id) && c.cable !== 'HOST_OR_DRIVER')) {
      await mutateDb((db) => {
        for (const connector of db.connectors) if (flexibleIds.includes(connector.id)) connector.cable = 'HOST_OR_DRIVER'
      })
    }
    const sources = readDb().bookings.filter((b) => b.driver_id === 'u-driver2')
    for (const [index, source] of [sources[0], sources[1], sources[0], sources[1]].entries()) {
      if (!source) continue
      const id = `demo-driver-booking-v1-${index}`
      if (readDb().bookings.some((b) => b.id === id)) continue
      const events = readStream(source.id)
      if (!events.length) continue
      const completed = events.some((e) => e.event_type === 'ChargingCompleted')
      const siteId = index === 2 ? 'site-riverside' : index === 3 ? 'site-courtyard' : 'site-cafe'
      const resourceId = index === 2 ? 'res-riverside-1' : index === 3 ? 'res-courtyard-1' : 'res-cafe-2'
      const connectorId = index === 2 ? 'con-riverside-t2' : index === 3 ? 'con-courtyard-t2' : 'con-cafe2-t2'
      const site = readDb().sites.find((s) => s.id === siteId)!
      const shift = index === 3 ? -86_400_000 : 0
      const recordedAt = (at: string) => new Date(Date.parse(at) + shift).toISOString()
      const now = serverNow()
      const { dayStart } = istParts(now)
      const start = completed ? null : nextSlots(resourceId, 90, dayStart + 86_400_000 + (index === 2 ? 16 : 10) * 3600_000, now, 1)[0]
      if (!completed && start === undefined) continue
      const ref = `AMP-DEMO0${index + 1}`
      for (const event of events) {
        if (event.event_type === 'BookingRequested') {
          const original = event.payload as import('../domain/booking').RequestedPayload
          const payload = {
            ...original, booking_ref: ref, driver_id: 'u-driver',
            vehicle: { ...original.vehicle, model_id: 'vm-nexon-ev-demo', model_label: 'Tata Nexon EV (Demo profile · 40 kWh usable)', soc: 30, range_budget_m: 56000, route_m: site.route_fixture_m ?? 1800 },
            site_id: siteId, site_name: site.name, resource_id: resourceId, connector_id: connectorId, host_account_id: 'ha-cafe',
            start_at: completed ? recordedAt(original.start_at) : new Date(start!).toISOString(),
            end_at: completed ? recordedAt(original.end_at) : new Date(start! + 90 * 60_000).toISOString(),
            blocked_until: completed ? recordedAt(original.blocked_until) : new Date(start! + (90 + POLICY.buffer_min) * 60_000).toISOString(),
          }
          appendEvent(id, 'BookingRequested', payload, { actor_id: 'u-driver', actor_role: 'DRIVER', source: 'UI', seed_recorded_at: recordedAt(event.recorded_at) })
        } else if (event.event_type === 'DriverDeparted') {
          appendEvent(id, 'DriverDeparted', { range_budget_m: 56000, route_m: site.route_fixture_m ?? 1800, route_provider: 'Seeded demo road distance' }, { actor_id: 'u-driver', actor_role: 'DRIVER', source: 'UI', seed_recorded_at: recordedAt(event.recorded_at) })
        } else {
          appendEvent<EventType>(id, event.event_type, event.payload, { actor_id: event.actor_role === 'DRIVER' ? 'u-driver' : event.actor_role === 'HOST' ? 'u-host-cafe' : event.actor_id, actor_role: event.actor_role, source: event.source, seed_recorded_at: recordedAt(event.recorded_at) })
        }
      }
      await mutateDb((d) => d.bookings.push({ ...source, id, booking_ref: ref, driver_id: 'u-driver', host_account_id: 'ha-cafe', resource_id: resourceId, site_id: siteId, created_at: recordedAt(source.created_at) }))
    }
  })
}

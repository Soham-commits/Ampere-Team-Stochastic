import type { Sql } from './store/pg'
import type { Persistence } from './store/persist'
import { ApiFail, bookings as B, istParts, listings as L, mutateDb, nextSlots, readDb, requireActor, runConsoleCommand, searchChargers, serverNow, siteDetail, type Ctx } from './engine'
import { modelById } from '../../frontend/src/domain/catalogue'

/*
 * One entry per method of the app's `api` object (frontend/src/server/api.ts), calling the same
 * engine services with the same arguments. The only differences: the actor comes from the session
 * token, request fields are whitelisted, booking events are read back from Postgres, and demo reset
 * goes through the persistence layer.
 */

type Method = (ctx: Ctx, args: any[]) => unknown // eslint-disable-line @typescript-eslint/no-explicit-any

const VEHICLE_FIELDS = ['soc', 'target_soc', 'model_id', 'nickname'] as const

export function createMethods(sql: Sql, persistence: Persistence): Record<string, Method> {
  return {
    // Discovery
    searchChargers: (_ctx, [input]) => searchChargers(input),
    siteDetail: (_ctx, [siteId]) => siteDetail(String(siteId)),

    // Vehicles
    updateVehicle: async (ctx, [vehicleId, rawPatch]) => {
      const actor = requireActor(ctx)
      const patch: Record<string, unknown> = {}
      for (const k of VEHICLE_FIELDS) if (rawPatch && k in rawPatch) patch[k] = rawPatch[k]
      if (patch.soc !== undefined && !(typeof patch.soc === 'number' && patch.soc >= 0 && patch.soc <= 100)) throw new ApiFail('INVALID_SOC', 'Battery must be 0–100%.', 400)
      if (patch.target_soc !== undefined && !(typeof patch.target_soc === 'number' && patch.target_soc > 0 && patch.target_soc <= 100)) throw new ApiFail('INVALID_TARGET', 'Target must be 1–100%.', 400)
      if (patch.model_id !== undefined && !modelById(String(patch.model_id))) throw new ApiFail('VEHICLE_REQUIRED', 'Choose a reviewed car profile.', 400)
      if (patch.nickname !== undefined) patch.nickname = String(patch.nickname).slice(0, 40)
      await mutateDb((d) => {
        const v = d.vehicles.find((x) => x.id === vehicleId && x.owner_id === actor.id)
        if (!v) throw new ApiFail('NOT_FOUND', 'Vehicle not found.', 404)
        Object.assign(v, patch)
      })
    },
    setOrigin: async (ctx, [origin]) => {
      const actor = requireActor(ctx)
      if (!origin || !Number.isFinite(origin.lat) || !Number.isFinite(origin.lng)) throw new ApiFail('ORIGIN_REQUIRED', 'Choose a starting location.', 400)
      await mutateDb((d) => {
        d.last_origin[actor.id] = { lat: Number(origin.lat), lng: Number(origin.lng), label: String(origin.label ?? '').slice(0, 80) }
      })
    },

    slots: (ctx, [resourceId, durationMin, day]) => {
      requireActor(ctx)
      const now = serverNow()
      const { dayStart } = istParts(now)
      const from = day === 0 ? now : dayStart + 86_400_000
      const to = day === 0 ? dayStart + 86_400_000 : dayStart + 2 * 86_400_000
      return nextSlots(String(resourceId), Number(durationMin), from, now, 96, Math.max(0, (to - from) / 3600_000)).map((t) => new Date(t).toISOString())
    },

    // Quote and reserve
    createQuote: (ctx, [input]) => B.createQuote(ctx, input),
    createBooking: (ctx, [input]) => B.createBooking(ctx, { ...input, source: 'UI', command_request_id: undefined }),
    getBooking: (ctx, [id]) => B.getBooking(ctx, String(id)),
    getEvents: async (ctx, [id, after]) => {
      B.getEvents(ctx, String(id)) // authorisation only; the stream itself is read from Postgres
      await persistence.barrier()
      const rows = await sql<{ event: unknown; sequence: number }[]>`
        SELECT event, sequence FROM booking_events WHERE booking_id = ${String(id)} ORDER BY sequence`
      const afterSeq = Number(after ?? 0)
      return { events: rows.filter((r) => r.sequence > afterSeq).map((r) => r.event), latest_sequence: rows.at(-1)?.sequence ?? 0, has_more: false }
    },
    listBookings: (ctx, [scope]) => B.listBookings(ctx, scope),
    accept: (ctx, [id, expected_sequence, equipment_choice]) => B.acceptBooking(ctx, String(id), { expected_sequence, equipment_choice }),
    decline: (ctx, [id, reason, expected_sequence]) => B.declineBooking(ctx, String(id), String(reason ?? ''), expected_sequence),
    cancel: (ctx, [id, reason, expected_sequence]) => B.cancelBooking(ctx, String(id), String(reason ?? ''), expected_sequence),

    // Payments and arrival
    payDemo: (ctx, [id, scenario, key]) => B.payDemo(ctx, String(id), scenario === 'FAILURE' ? 'FAILURE' : 'SUCCESS', String(key ?? '')),
    depart: (ctx, [id, expected_sequence]) => B.depart(ctx, String(id), expected_sequence),
    arrivalCode: (ctx, [id]) => B.issueArrivalCode(ctx, String(id)),
    checkIn: (ctx, [id, code]) => B.checkIn(ctx, String(id), String(code ?? '')),
    access: (ctx, [id]) => B.getAccess(ctx, String(id)),

    // Sessions
    startSession: (ctx, [id]) => B.startSession(ctx, String(id)),
    completeSession: (ctx, [id]) => B.completeSession(ctx, String(id)),
    hostEarnings: (ctx) => B.hostEarnings(ctx),

    // Host listings
    hostSites: (ctx) => L.hostSites(ctx),
    createDraft: (ctx, [input]) => L.createDraft(ctx, input),
    submitForReview: (ctx, [siteId]) => L.submitForReview(ctx, String(siteId)),
    setPaused: (ctx, [siteId, paused]) => L.setPaused(ctx, String(siteId), !!paused),
    setResourceStatus: (ctx, [resourceId, status]) => L.setResourceStatus(ctx, String(resourceId), status),
    updateSchedule: (ctx, [resourceId, start, end]) => L.updateSchedule(ctx, String(resourceId), Number(start), Number(end)),
    addBlackout: (ctx, [resourceId, start, end, kind, reason]) => L.addBlackout(ctx, String(resourceId), String(start), String(end), kind === 'HOST_USE' ? 'HOST_USE' : 'BLACKOUT', String(reason ?? '')),
    removeBlackout: (ctx, [id]) => L.removeBlackout(ctx, String(id)),

    // Admin
    adminQueue: (ctx) => L.adminQueue(ctx),
    recordCheck: (ctx, [checkId, outcome, notes]) => L.recordCheck(ctx, String(checkId), outcome, String(notes ?? '')),
    activateSite: (ctx, [siteId]) => L.activateSite(ctx, String(siteId)),
    rejectSite: (ctx, [siteId, reasons]) => L.rejectSite(ctx, String(siteId), Array.isArray(reasons) ? reasons.map(String) : []),
    suspendSite: (ctx, [siteId, reason]) => L.suspendSite(ctx, String(siteId), String(reason ?? '')),

    // Demo controls (isolated demo environment only). Every use is audited because it affects all devices.
    advanceClock: async (ctx, [ms]) => {
      const actor = requireActor(ctx)
      if (readDb().mode !== 'DEMO') throw new ApiFail('DEMO_ONLY', 'Clock control is demo-only.', 403)
      const step = Number(ms)
      if (!Number.isFinite(step) || step < 0 || step > 24 * 3600_000) throw new ApiFail('INVALID_STEP', 'Clock steps must be between 0 and 24 hours.', 400)
      await mutateDb((d) => {
        d.clock_offset_ms = step === 0 ? 0 : d.clock_offset_ms + step
        d.audit.push({ id: crypto.randomUUID(), at: new Date().toISOString(), actor_id: actor.id, action: 'DEMO_CLOCK', detail: step === 0 ? 'reset to real time' : `+${Math.round(step / 60_000)} min` })
      })
    },
    setRouteProvider: async (ctx, [p]) => {
      requireActor(ctx)
      await mutateDb((d) => {
        d.settings.route_provider = p === 'OSRM' ? 'OSRM' : 'DEMO'
      })
    },
    markNotificationsRead: async (ctx, [eventIds]) => {
      const actor = requireActor(ctx)
      const ids = Array.isArray(eventIds) ? eventIds.map(String) : []
      await mutateDb((d) => {
        const set = new Set([...(d.notif_read[actor.id] ?? []), ...ids])
        d.notif_read[actor.id] = [...set].slice(-500)
      })
    },
    resetDemo: async (ctx) => {
      requireActor(ctx)
      if (readDb().mode !== 'DEMO') throw new ApiFail('DEMO_ONLY', 'Reset refuses a non-demo environment.', 403)
      await persistence.reset()
    },
  }
}

/** The console returns its own result shape rather than the API envelope, exactly as in the app. */
export function runJury(ctx: Ctx, line: unknown, commandId: unknown) {
  return runConsoleCommand(ctx, String(line ?? ''), String(commandId ?? ''))
}

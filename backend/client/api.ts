/*
 * Replaces frontend/src/server/api.ts for the app: the same `api` object and method signatures, each call
 * sent to the server (POST /api/rpc/<method>) and answered in the same { ok, data | error, request_id }
 * envelope. Changes are read back before a call resolves, so the next synchronous read sees them.
 */
import type { EquipmentChoice } from '../../frontend/src/domain/equipment'
import type { CheckOutcome, ConnectorStandard, LatLng, ResourceStatus, Result, SiteType } from '../../frontend/src/domain/types'
import type * as B from '../../frontend/src/server/bookings'
import type { ConsoleResult } from '../../frontend/src/server/jury'
import type * as Engine from '../../frontend/src/server/api'
import type { SearchInput } from '../../frontend/src/server/discovery'
import { NetworkError, post, refresh } from './transport'

type EngineApi = typeof Engine.api
type Data<K extends keyof EngineApi> = Awaited<ReturnType<EngineApi[K]>> extends Result<infer T> ? T : never

/** Reads never change server state, so they skip the read-back. */
const READS = new Set(['searchChargers', 'siteDetail', 'slots', 'getBooking', 'getEvents', 'listBookings', 'hostEarnings', 'hostSites', 'adminQueue', 'access'])

async function call<K extends keyof EngineApi>(method: K, ...args: unknown[]): Promise<Result<Data<K>>> {
  let result: Result<Data<K>>
  try {
    result = await post<Result<Data<K>>>(`/api/rpc/${method}`, { args })
  } catch (e) {
    return { ok: false, error: { code: 'NETWORK', message: e instanceof NetworkError ? e.message : 'Can’t reach the Ampere server.' }, request_id: '' }
  }
  if (!READS.has(method)) await refresh().catch(() => undefined)
  return result
}

export const api = {
  // Discovery
  searchChargers: (input: SearchInput) => call('searchChargers', input),
  siteDetail: (siteId: string) => call('siteDetail', siteId),

  // Vehicles
  updateVehicle: (vehicleId: string, patch: { soc?: number; target_soc?: number; model_id?: string; nickname?: string }) => call('updateVehicle', vehicleId, patch),
  setOrigin: (origin: LatLng & { label: string }) => call('setOrigin', origin),

  slots: (resourceId: string, durationMin: number, day: 0 | 1) => call('slots', resourceId, durationMin, day),

  // Quote and reserve
  createQuote: (input: B.QuoteInput) => call('createQuote', input),
  createBooking: (input: B.CreateBookingInput) => call('createBooking', input),
  getBooking: (id: string) => call('getBooking', id),
  getEvents: (id: string, after?: number) => call('getEvents', id, after),
  listBookings: (scope: 'driver' | 'host' | 'all') => call('listBookings', scope),
  accept: (id: string, expected_sequence?: number, equipment_choice?: EquipmentChoice) => call('accept', id, expected_sequence, equipment_choice),
  decline: (id: string, reason: string, expected_sequence?: number) => call('decline', id, reason, expected_sequence),
  cancel: (id: string, reason: string, expected_sequence?: number) => call('cancel', id, reason, expected_sequence),

  // Payments and arrival
  payDemo: (id: string, scenario: 'SUCCESS' | 'FAILURE', idempotencyKey: string) => call('payDemo', id, scenario, idempotencyKey),
  depart: (id: string, expected_sequence?: number) => call('depart', id, expected_sequence),
  arrivalCode: (id: string) => call('arrivalCode', id),
  checkIn: (id: string, code: string) => call('checkIn', id, code),
  access: (id: string) => call('access', id),

  // Sessions
  startSession: (id: string) => call('startSession', id),
  completeSession: (id: string) => call('completeSession', id),
  hostEarnings: () => call('hostEarnings'),

  // Host listings
  hostSites: () => call('hostSites'),
  createDraft: (input: Parameters<EngineApi['createDraft']>[0]) => call('createDraft', input),
  submitForReview: (siteId: string) => call('submitForReview', siteId),
  setPaused: (siteId: string, paused: boolean) => call('setPaused', siteId, paused),
  setResourceStatus: (resourceId: string, status: ResourceStatus) => call('setResourceStatus', resourceId, status),
  updateSchedule: (resourceId: string, start: number, end: number) => call('updateSchedule', resourceId, start, end),
  addBlackout: (resourceId: string, start: string, end: string, kind: 'BLACKOUT' | 'HOST_USE', reason: string) => call('addBlackout', resourceId, start, end, kind, reason),
  removeBlackout: (id: string) => call('removeBlackout', id),

  // Admin
  adminQueue: () => call('adminQueue'),
  recordCheck: (checkId: string, outcome: CheckOutcome, notes: string) => call('recordCheck', checkId, outcome, notes),
  activateSite: (siteId: string) => call('activateSite', siteId),
  rejectSite: (siteId: string, reasons: string[]) => call('rejectSite', siteId, reasons),
  suspendSite: (siteId: string, reason: string) => call('suspendSite', siteId, reason),

  // Jury console: same result shape as the in-app console
  juryCommand: async (line: string, commandId: string): Promise<ConsoleResult> => {
    try {
      const result = await post<ConsoleResult>('/api/console', { line, command_id: commandId })
      await refresh().catch(() => undefined)
      return result
    } catch (e) {
      const message = e instanceof NetworkError ? e.message : 'Can’t reach the Ampere server.'
      return { ok: false, lines: [{ text: `ERROR NETWORK — ${message}`, tone: 'err' }], error_code: 'NETWORK', request_id: '' }
    }
  },

  // Demo controls (affect every device using this server)
  advanceClock: (ms: number) => call('advanceClock', ms),
  setRouteProvider: (p: 'DEMO' | 'OSRM') => call('setRouteProvider', p),
  markNotificationsRead: (eventIds: string[]) => call('markNotificationsRead', eventIds),
  resetDemo: () => call('resetDemo'),
}

export type { SearchInput, ConnectorStandard, SiteType }

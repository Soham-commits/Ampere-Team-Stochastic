/*
 * Replaces frontend/src/server/storage.ts. Per-viewer preferences (useDemoState) stay in this browser;
 * the realtime bus is fed by the server's event stream instead of a BroadcastChannel.
 */
import { onMessage, type RealtimeMessage } from './transport'

export type { RealtimeMessage }

const memory = new Map<string, string>()

function ls(): Storage | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null
  } catch {
    return null
  }
}

export function kvGet<T>(key: string): T | null {
  try {
    const raw = ls()?.getItem(key) ?? memory.get(key) ?? null
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

export function kvSet(key: string, value: unknown) {
  const raw = JSON.stringify(value)
  memory.set(key, raw)
  try {
    ls()?.setItem(key, raw)
  } catch {
    /* quota or privacy mode: memory copy keeps this tab working */
  }
}

export function subscribe(l: (m: RealtimeMessage) => void) {
  return onMessage(l)
}

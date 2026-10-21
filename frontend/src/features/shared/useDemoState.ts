import { useState } from 'react'
import { kvGet, kvSet } from '../../server/storage'

/** Per-account demo preferences; never writes vehicle telemetry or booking records. */
export function useDemoState<T>(userId: string, name: string, initial: T) {
  const key = `ampere.mobility.v1.${userId}.${name}`
  const [value, setValue] = useState<T>(() => kvGet<T>(key) ?? initial)
  const update = (next: T) => {
    kvSet(key, next)
    setValue(next)
  }
  return [value, update] as const
}

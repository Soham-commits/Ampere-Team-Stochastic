import type { Context } from 'hono'
import { streamSSE } from 'hono/streaming'
import type { User } from './engine'
import type { FlushBatch, Persistence } from './store/persist'
import { canSeeEvent } from './snapshot'

/*
 * Server-sent events. Messages keep the app's own realtime shape ({ kind: 'booking_event' | 'db_changed' | 'reset' })
 * and are sent only after Postgres has committed them. Booking events go only to actors allowed to read
 * that booking; everyone gets the coarse db_changed / reset notices that trigger a replica refresh.
 */

interface Client {
  actor: User | null
  send: (data: string) => void
}

export function createRealtime(persistence: Persistence) {
  const clients = new Set<Client>()

  persistence.onFlush((b: FlushBatch) => {
    for (const c of clients) {
      if (b.reset) {
        c.send(JSON.stringify({ kind: 'reset' }))
        continue
      }
      for (const e of b.events) if (canSeeEvent(c.actor, e)) c.send(JSON.stringify({ kind: 'booking_event', booking_id: e.booking_id, event: e }))
      if (b.docChanged || b.events.length) c.send(JSON.stringify({ kind: 'db_changed' }))
    }
  })

  return {
    get size() {
      return clients.size
    },
    handler(c: Context, actor: User | null) {
      c.header('X-Accel-Buffering', 'no')
      c.header('Cache-Control', 'no-cache, no-transform')
      return streamSSE(c, async (stream) => {
        const queue: string[] = []
        let wake: (() => void) | null = null
        const client: Client = {
          actor,
          send: (data) => {
            queue.push(data)
            wake?.()
          },
        }
        clients.add(client)
        stream.onAbort(() => {
          clients.delete(client)
          wake?.()
        })
        await stream.writeSSE({ event: 'hello', data: JSON.stringify({ actor_id: actor?.id ?? null, server_now: Date.now() }) })
        // One writer per connection: drain queued messages, otherwise send a heartbeat every 15 s.
        while (!stream.aborted) {
          while (queue.length) await stream.writeSSE({ data: queue.shift()! })
          await new Promise<void>((resolve) => {
            const t = setTimeout(resolve, 15_000)
            wake = () => {
              clearTimeout(t)
              resolve()
            }
          })
          wake = null
          if (!queue.length && !stream.aborted) await stream.writeSSE({ event: 'ping', data: '' })
        }
        clients.delete(client)
      })
    },
  }
}

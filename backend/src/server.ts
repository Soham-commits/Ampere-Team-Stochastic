import './env'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { config } from './env'
import { issueToken, tokenFrom, verifyToken } from './auth'
import { bookings, handle, readDb, type User } from './engine'
import { createRealtime } from './realtime'
import { createMethods, runJury } from './rpc'
import { snapshotFor } from './snapshot'
import { serveWeb } from './static'
import { connect, migrate, type Sql } from './store/pg'
import { createPersistence, PersistenceError } from './store/persist'

export async function createServer(opts: { databaseUrl?: string; worker?: boolean } = {}) {
  const sql: Sql = connect(opts.databaseUrl)
  await migrate(sql)
  const persistence = createPersistence(sql)
  await persistence.boot()
  const realtime = createRealtime(persistence)
  const methods = createMethods(sql, persistence)
  const startedAt = new Date().toISOString()

  const app = new Hono()
  const actorOf = (c: { req: { raw: Request } }): User | null => verifyToken(tokenFrom(c.req.raw.headers, c.req.raw.url))

  app.use('/api/*', cors({ origin: (o) => (config.corsOrigins.includes(o) ? o : null), allowHeaders: ['content-type', 'authorization'], allowMethods: ['GET', 'POST', 'OPTIONS'], maxAge: 600 }))

  app.get('/healthz', async (c) => {
    const [{ events }] = await sql<{ events: number }[]>`SELECT count(*)::int AS events FROM booking_events`
    return c.json({ ok: true, started_at: startedAt, bookings: readDb().bookings.length, events, realtime_clients: realtime.size })
  })

  // Demo account sign-in: picks one of the synthetic accounts and returns a signed tab token.
  app.post('/api/session', async (c) => {
    const body = await c.req.json<{ user_id?: string }>().catch(() => ({}) as { user_id?: string })
    const issued = issueToken(String(body.user_id ?? ''))
    if (!issued) return c.json({ ok: false, error: { code: 'UNKNOWN_ACCOUNT', message: 'Unknown demo account.' } }, 404)
    return c.json({ ok: true, data: { user_id: body.user_id, ...issued } })
  })

  app.get('/api/snapshot', (c) => c.json(snapshotFor(actorOf(c))))

  app.get('/api/stream', (c) => realtime.handler(c, actorOf(c)))

  app.post('/api/console', async (c) => {
    const actor = actorOf(c)
    const body = await c.req.json<{ line?: string; command_id?: string }>().catch(() => ({}) as { line?: string; command_id?: string })
    const result = await runJury({ actor }, body.line, body.command_id)
    try {
      await persistence.barrier()
    } catch {
      return c.json({ ok: false, lines: [{ text: 'ERROR PERSISTENCE_FAILED — the server could not save that command. Nothing was committed.', tone: 'err' }], error_code: 'PERSISTENCE_FAILED', request_id: result.request_id }, 503)
    }
    return c.json(result)
  })

  app.post('/api/rpc/:method', async (c) => {
    const name = c.req.param('method')
    const fn = Object.hasOwn(methods, name) ? methods[name] : undefined
    if (!fn) return c.json({ ok: false, error: { code: 'UNKNOWN_METHOD', message: `Unknown method ${name}.` }, request_id: '' }, 404)
    const body = await c.req.json<{ args?: unknown[] }>().catch(() => ({}) as { args?: unknown[] })
    // JSON has no undefined: the app's optional arguments (e.g. accept(id, undefined, choice)) arrive as null.
    const args = Array.isArray(body.args) ? body.args.map((a) => (a === null ? undefined : a)) : []
    const result = await handle(() => fn({ actor: actorOf(c) }, args))
    try {
      await persistence.barrier()
    } catch (e) {
      if (!(e instanceof PersistenceError)) throw e
      return c.json({ ok: false, error: { code: 'PERSISTENCE_FAILED', message: 'The server could not save that change. Nothing was committed — try again.' }, request_id: result.request_id }, 503)
    }
    return c.json(result)
  })

  app.get('*', (c) => serveWeb(c.req.path))

  let worker: ReturnType<typeof setInterval> | undefined
  if (opts.worker !== false)
    worker = setInterval(() => {
      bookings.runExpiryWorker().catch((e) => console.error('[ampere] expiry worker', e))
    }, config.workerIntervalMs)

  return {
    app,
    sql,
    persistence,
    async close() {
      clearInterval(worker)
      await sql.end({ timeout: 2 })
    },
  }
}

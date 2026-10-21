import './env'
import { serve } from '@hono/node-server'
import { networkInterfaces } from 'node:os'
import { config } from './env'
import { createServer } from './server'

const server = await createServer()
serve({ fetch: server.app.fetch, port: config.port, hostname: '0.0.0.0' }, ({ port }) => {
  const lan = Object.values(networkInterfaces())
    .flat()
    .find((i) => i && i.family === 'IPv4' && !i.internal)?.address
  console.log(`[ampere] API on http://localhost:${port}`)
  if (lan) console.log(`[ampere] on your network: http://${lan}:${port}`)
})

for (const signal of ['SIGINT', 'SIGTERM'] as const)
  process.on(signal, () => {
    void server.close().finally(() => process.exit(0))
  })

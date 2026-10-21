import { Cable, Car, Check, RefreshCw, Unplug } from 'lucide-react'
import { useState } from 'react'
import { FleetWorkspace } from './FleetWorkspace'
import { useSession } from '../../app/hooks'
import { Page, PageHeader } from '../../components/Shell'
import { Button, Card } from '../../components/ui'
import { useDemoState } from '../shared/useDemoState'

interface Connection {
  provider: string
  syncedAt: string
}
export default function Connections() {
  const user = useSession()!
  const [connection, setConnection] = useDemoState<Connection | null>(user.id, 'connection', null)
  const [provider, setProvider] = useState('Tata vehicle simulator')
  const [consent, setConsent] = useState(false)
  return (
    <>
      <PageHeader back title="Connections" subtitle="Explore carmaker & fleet workflows." />
      <Page className="mx-auto max-w-2xl">
        <p className="mb-5 text-xs leading-relaxed text-muted">
          Frontend simulation · no manufacturer API, OAuth, fleet account or live vehicle telemetry is connected.
        </p>
        <Card className="border border-line !rounded-[2rem] !p-5">
          <div className="flex items-center gap-3">
            <span className="grid size-12 place-items-center rounded-2xl bg-volt-soft text-volt">
              <Cable className="size-6" />
            </span>
            <div>
              <h2 className="text-xl font-semibold">Your car connection</h2>
              <p className="mt-1 text-xs text-muted">Try a read-only vehicle sync</p>
            </div>
          </div>
          {connection ? (
            <div className="mt-6">
              <p className="flex items-center gap-2 text-sm font-medium text-volt">
                <Check className="size-4" />
                {connection.provider}
              </p>
              <p role="status" className="mt-2 text-xs text-muted">
                Sample refreshed {new Date(connection.syncedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-surface-2 p-4">
                  <p className="text-xs text-muted">Sample battery</p>
                  <p className="mt-2 text-3xl font-medium">64%</p>
                </div>
                <div className="rounded-2xl bg-surface-2 p-4">
                  <p className="text-xs text-muted">Sample odometer</p>
                  <p className="mt-2 text-2xl font-medium">
                    12,480<span className="ml-1 text-xs text-muted">km</span>
                  </p>
                </div>
              </div>
              <p className="mt-3 text-xs text-muted">Fixed sample payload; your saved car and battery remain unchanged.</p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Button size="sm" onClick={() => setConnection({ ...connection, syncedAt: new Date().toISOString() })}>
                  <RefreshCw className="size-4" />
                  Refresh sample
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setConnection(null)
                    setConsent(false)
                  }}
                >
                  <Unplug className="size-4" />
                  Disconnect
                </Button>
              </div>
              <details className="mt-5 rounded-2xl border border-line p-3">
                <summary className="cursor-pointer text-xs font-medium">Sample vehicle payload</summary>
                <pre className="mt-3 overflow-auto text-[11px] leading-relaxed">
                  {JSON.stringify(
                    {
                      source: 'SIMULATOR',
                      provider: connection.provider,
                      battery_pct: 64,
                      odometer_km: 12480,
                      observed_at: connection.syncedAt,
                    },
                    null,
                    2,
                  )}
                </pre>
              </details>
            </div>
          ) : (
            <>
              <label className="mt-6 block text-sm">
                Choose a demo adapter
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  className="mt-2 h-12 w-full rounded-2xl border border-line bg-surface-2 px-3"
                >
                  <option>Tata vehicle simulator</option>
                  <option>MG vehicle simulator</option>
                  <option>Generic fleet simulator</option>
                </select>
              </label>
              <label className="mt-4 flex items-start gap-3 text-xs leading-relaxed text-ink-2">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-0.5 size-4 shrink-0 accent-[#2345a1]"
                />
                Allow this demo to display sample battery and odometer data. No real account access is requested.
              </label>
              <Button
                disabled={!consent}
                className="mt-5 w-full"
                onClick={() => setConnection({ provider, syncedAt: new Date().toISOString() })}
              >
                <Car className="size-4" />
                Connect simulator
              </Button>
            </>
          )}
        </Card>
        <FleetWorkspace userId={user.id} />
      </Page>
    </>
  )
}

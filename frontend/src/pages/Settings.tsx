import { ProfileTools } from '../components/ProfileTools'
import { ArrowUpRight, BatteryCharging, Gauge, Target, Download, FastForward, LogOut, RotateCcw, Route, Terminal, Wifi, WifiOff } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { realtime, useInstall, useNow, useQuery, useRealtimePaused, useSession } from '../app/hooks'
import { rangeBudget } from '../domain/calc'
import { CONNECTOR_LABEL, modelById } from '../domain/catalogue'
import { POLICY } from '../domain/policy'
import { Avatar } from '../components/Shell'
import { Page, PageHeader } from '../components/Shell'
import { BarGauge, Button, Card, Chip, Notice, Range, SectionTitle, Segmented, Sheet, useAction } from '../components/ui'
import { isoIst } from '../lib/format'
import { api } from '../server/api'
import { readDb } from '../server/db'
import { signOut } from '../server/session'

export default function Settings() {
  const user = useSession()!
  const nav = useNavigate()
  const now = useNow(1000)
  const paused = useRealtimePaused()
  const { run, busy } = useAction()
  const { available, install, standalone, ios } = useInstall()
  const [resetOpen, setResetOpen] = useState(false)
  const db = useQuery(async () => ({ ok: true as const, data: readDb(), request_id: '' }))
  const offset = db.data?.clock_offset_ms ?? 0
  const provider = db.data?.settings.route_provider ?? 'DEMO'
  const vehicle = db.data?.vehicles.find((v) => v.owner_id === user.id)
  const model = vehicle ? modelById(vehicle.model_id) : undefined
  const budget = vehicle && model ? rangeBudget(model, vehicle.soc, POLICY) : null

  return (
    <>
      <PageHeader back title="Profile & settings" />
      <Page className="mx-auto max-w-2xl">
        <div className="flex items-center gap-3 py-2">
          <Avatar user={user} />
          <div className="min-w-0 flex-1">
            <div className="font-semibold">{user.display_name}</div>
            <div className="truncate text-sm text-muted">{user.email}</div>
          </div>
          <Button size="sm" variant="secondary" onClick={() => nav('/signin')}>
            Switch
          </Button>
        </div>

        {vehicle && model && budget ? (
          <section aria-label="Your car" className="mt-6">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-2xl font-semibold tracking-tight">{model.make}</h2>
                <p className="mt-1 text-sm text-ink-2">{model.model} · {model.variant}</p>
              </div>
              <Chip tone="volt">Demo profile</Chip>
            </div>
            <figure className="relative -mx-2 mt-1 mb-4">
              <img src={`${import.meta.env.BASE_URL}car-profile.png`} alt="Illustrative white electric SUV with a black roof, front three-quarter view" className="aspect-[1.65] w-full object-contain" />
              <figcaption className="text-center text-[10px] text-muted">Illustrative vehicle · your saved specifications below</figcaption>
            </figure>

            <div className="grid grid-cols-2 gap-3">
              <Card className="row-span-2 flex min-w-0 flex-col !rounded-[1.75rem] !p-4">
                <div className="flex items-center gap-1.5 text-xs font-medium text-ink-2"><BatteryCharging className="size-4 shrink-0" /> Battery level</div>
                <div className="mt-6 flex items-baseline gap-1"><span className="text-[2.6rem] font-medium leading-none tracking-tight">{vehicle.soc}</span><span className="text-lg text-ink-2">%</span></div>
                <div className="mt-auto pt-7">
                  <div className="mb-2 flex justify-between text-[10px] text-muted"><span>0%</span><span>100%</span></div>
                  <BarGauge value={vehicle.soc} segments={11} tone="volt" height="h-14" />
                  <Range className="mt-4" label="Profile battery level" value={vehicle.soc} min={0} max={100} onChange={(soc) => void api.updateVehicle(vehicle.id, { soc })} />
                </div>
              </Card>
              <Card className="min-w-0 !rounded-[1.75rem] !p-4">
                <div className="flex items-center gap-1.5 text-xs font-medium text-ink-2"><Gauge className="size-4 shrink-0" /> Range budget</div>
                <div className="mt-5 flex flex-wrap items-baseline gap-1"><span className="text-[2.25rem] font-medium leading-none tracking-tight">{(budget.range_budget_m / 1000).toFixed(1)}</span><span className="text-lg text-muted">km</span></div>
              </Card>
              <Card className="min-w-0 !rounded-[1.75rem] !p-4">
                <div className="flex items-center gap-1.5 text-xs font-medium text-ink-2"><Target className="size-4 shrink-0" /> Charge target</div>
                <div className="mt-5 flex items-baseline gap-1"><span className="text-[2.25rem] font-medium leading-none tracking-tight">{vehicle.target_soc}</span><span className="text-lg text-muted">%</span></div>
              </Card>
            </div>
            <div className="mt-5 flex items-center justify-between gap-2">
              <div className="flex flex-wrap gap-1.5">
                <Chip>{(model.usable_battery_wh / 1000).toFixed(0)} kWh usable</Chip>
                {model.connectors.map((c) => <Chip key={c.standard} tone="outline">{CONNECTOR_LABEL[c.standard]}</Chip>)}
              </div>
              <Link to="/vehicle" className="flex shrink-0 items-center gap-1 text-xs font-semibold text-volt-strong">Edit car <ArrowUpRight className="size-4" /></Link>
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-muted">Battery level is entered by you, not live telemetry. Range budget includes {POLICY.reserve_pct}% reserve and ×{POLICY.uncertainty} uncertainty.</p>
          </section>
        ) : null}

        <ProfileTools />

        <details className="mt-6 rounded-3xl border border-line bg-surface p-4">
          <summary className="cursor-pointer text-sm font-semibold">App & demo settings</summary>
        <SectionTitle>App</SectionTitle>
        <Card className="space-y-3">
          {standalone ? (
            <div className="text-sm text-muted">Installed — running as an app.</div>
          ) : available ? (
            <Button className="w-full" onClick={install}>
              <Download className="size-4" /> Install Ampere
            </Button>
          ) : (
            <div className="text-sm text-muted">{ios ? 'On iPhone: tap Share → “Add to Home Screen”.' : 'Use your browser menu → “Install app” / “Add to Home screen”.'} Works offline for browsing fixtures; live multi-user booking needs this browser’s shared storage.</div>
          )}
          {user.capabilities.includes('JURY') || user.capabilities.includes('ADMIN') ? null : (
            <Link to="/jury" className="flex items-center gap-2 text-sm font-semibold">
              <Terminal className="size-4" /> Open the jury console
            </Link>
          )}
        </Card>

        <SectionTitle>Demo controls</SectionTitle>
        <Card className="space-y-5">
          <div>
            <div className="flex items-center justify-between">
              <div className="font-semibold">Server clock</div>
              {offset ? <Chip tone="amber">+{Math.round(offset / 60000)} min</Chip> : <Chip>real time</Chip>}
            </div>
            <div className="mt-1 font-mono text-sm text-muted">{isoIst(now)}</div>
            <p className="mt-1 text-xs text-muted">Injected demo clock, shared by every tab. Deadlines, expiry and arrival windows all use it — never the device clock.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {[1, 5, 15, 60].map((m) => (
                <Button key={m} size="sm" variant="secondary" onClick={() => run('c', () => api.advanceClock(m * 60_000), `Clock +${m} min`)}>
                  <FastForward className="size-3.5" /> +{m} min
                </Button>
              ))}
              <Button size="sm" variant="ghost" disabled={!offset} onClick={() => run('c', () => api.advanceClock(0), 'Clock back to real time')}>
                Reset clock
              </Button>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between">
              <div className="font-semibold">Live updates (this tab)</div>
              <Chip tone={paused ? 'amber' : 'volt'} icon={paused ? <WifiOff className="size-3" /> : <Wifi className="size-3" />}>
                {paused ? 'disconnected' : 'connected'}
              </Chip>
            </div>
            <p className="mt-1 text-xs text-muted">Simulate a dropped connection. On reconnect, open bookings fetch the events they missed and replay them in sequence.</p>
            <Button size="sm" variant="secondary" className="mt-3" onClick={() => realtime.setPaused(!paused)}>
              {paused ? 'Reconnect' : 'Disconnect'}
            </Button>
          </div>
          <div>
            <div className="flex items-center gap-2 font-semibold">
              <Route className="size-4" /> Route evidence away from the demo origin
            </div>
            <Segmented
              className="mt-2"
              size="sm"
              value={provider}
              onChange={(v) => run('r', () => api.setRouteProvider(v), v === 'OSRM' ? 'Using live OSRM demo routing' : 'Using labelled demo estimates')}
              options={[
                { value: 'DEMO', label: 'Labelled demo estimate' },
                { value: 'OSRM', label: 'Live OSRM (public demo)' },
              ]}
            />
            <p className="mt-2 text-xs text-muted">The demo origin always uses seeded road distances so jury results are reproducible. OSRM’s public server has no SLA; failures fall back to the labelled estimate.</p>
          </div>
          <div>
            <Button variant="danger" onClick={() => setResetOpen(true)}>
              <RotateCcw className="size-4" /> Reset demo data
            </Button>
          </div>
        </Card>

        <SectionTitle>What’s simulated</SectionTitle>
        <Notice>
          This build runs entirely in your browser — the “server”, database and realtime channel are simulated with local storage, cross-tab locks and a broadcast channel. Listings are synthetic; payments, refunds, metering, receipts and payouts are demo-only; tariffs (₹14/kWh, ₹20 Standard fee) are illustrative, not approved tariffs or tax treatment. Range estimates are disclosed assumptions, not guarantees.
        </Notice>

        </details>

        <Button variant="secondary" className="mt-6 w-full" onClick={() => (signOut(), nav('/signin'))}>
          <LogOut className="size-4" /> Sign out
        </Button>
      </Page>
      <Sheet open={resetOpen} onClose={() => setResetOpen(false)} title="Reset demo data?">
        <p className="text-sm text-ink-2">Deletes every booking stream, quote and listing change in this browser and re-seeds the synthetic catalogue. Other open tabs reload their streams. This only works in the isolated demo environment.</p>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={() => setResetOpen(false)}>
            Keep data
          </Button>
          <Button variant="danger" loading={busy === 'reset'} onClick={async () => (await run('reset', () => api.resetDemo(), 'Demo data reset')) !== null && setResetOpen(false)}>
            Reset
          </Button>
        </div>
      </Sheet>
    </>
  )
}

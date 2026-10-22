import { ProfileTools } from '../components/ProfileTools'
import { ArrowUpRight, BatteryCharging, Gauge, Target, LogOut } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useSession } from '../app/hooks'
import { useMyVehicle } from '../app/useMyVehicle'
import { rangeBudget } from '../domain/calc'
import { CONNECTOR_LABEL, modelById } from '../domain/catalogue'
import { POLICY } from '../domain/policy'
import { Avatar } from '../components/Shell'
import { Page, PageHeader } from '../components/Shell'
import { BarGauge, Button, Card, Chip, Range } from '../components/ui'
import { api } from '../server/api'
import { signOut } from '../server/session'

export default function Settings() {
  const user = useSession()!
  const nav = useNavigate()
  const vehicle = useMyVehicle()
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
                <p className="mt-1 text-sm text-ink-2">{model.model}</p>
              </div>
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

        <Button variant="secondary" className="mt-6 w-full" onClick={() => (signOut(), nav('/signin'))}>
          <LogOut className="size-4" /> Sign out
        </Button>
      </Page>

    </>
  )
}

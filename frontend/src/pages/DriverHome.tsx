import { ArrowRight, BatteryCharging, Bell, Gauge, CreditCard, CircleCheck, Clock3, Target, LocateFixed } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useNotifications } from '../app/notifications'
import { useNow, useQuery, useSession } from '../app/hooks'
import { MapView } from '../components/MapView'
import { siteIcon } from '../components/booking'
import { Avatar, Page, PageHeader } from '../components/Shell'
import { Button, Card, EmptyState, Range, SectionTitle } from '../components/ui'
import { rangeBudget } from '../domain/calc'
import { CONNECTOR_LABEL, modelById } from '../domain/catalogue'
import { POLICY } from '../domain/policy'
import { istDayLabel, istTime, km, relativeAge } from '../lib/format'
import { MIT_WPU_ORIGIN } from '../domain/mockLocation'
import { useMyVehicle } from '../app/useMyVehicle'
import { useBookableChargers } from '../features/discovery/useBookableChargers'
import { api } from '../server/api'
import { readDb } from '../server/db'


export default function DriverHome() {
  const user = useSession()!
  const navigate = useNavigate()
  const vehicle = useMyVehicle()
  const model = vehicle ? modelById(vehicle.model_id) : undefined
  const now = useNow(1000)
  const bookings = useQuery(() => api.listBookings('driver'))
  const { items } = useNotifications(user)
  const [soc, setSoc] = useState<number | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    if (vehicle) setSoc(vehicle.soc)
  }, [vehicle?.soc]) // eslint-disable-line react-hooks/exhaustive-deps

  const commitSoc = (v: number) => {
    setSoc(v)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => vehicle && api.updateVehicle(vehicle.id, { soc: v }), 350)
  }

  const origin = MIT_WPU_ORIGIN
  const search = useBookableChargers({ modelId: vehicle?.model_id, soc })
  const mapSites = [...new Map((search.data?.results ?? []).map((r) => [r.site.id, {
    site: r.site, reservable: r.reservable, label: r.site.name,
  }])).values()]
  const furthestRouteM = Math.max(0, ...(search.data?.results ?? []).map((result) => result.route.distance_m))
  const hour = Number(new Intl.DateTimeFormat('en-IN', { hour: 'numeric', hourCycle: 'h23', timeZone: 'Asia/Kolkata' }).format(now))
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  if (!vehicle || !model || soc === null)
    return (
      <>
        <PageHeader user={user} title={`Hi, ${user.display_name}`} />
        <Page>
          <EmptyState title="Add your car first" action={<Link to="/vehicle"><Button>Add a car profile</Button></Link>}>
            Ampere needs your car, connector support and battery level before it can show chargers.
          </EmptyState>
        </Page>
      </>
    )

  const budget = rangeBudget(model, soc, POLICY)
  const active = (bookings.data ?? []).filter((b) => !b.state.ended)

  return (
    <>
      <Page className="driver-home !px-5 !pt-7 sm:!px-6 sm:!pt-8">
        <header className="mb-8 flex items-start justify-between gap-3">
          <h1 className="min-w-0 text-left text-[clamp(1.5rem,6.5vw,2rem)] font-medium leading-[1.15] tracking-[-0.04em]">
            {greeting},<br />
            <span className="break-words">{user.display_name.split(' ')[0]}</span>
          </h1>
          <div className="flex shrink-0 items-center gap-2 pt-1">
            <Link to="/inbox" aria-label="Notifications" className="grid size-11 place-items-center rounded-full border border-line">
              <Bell className="size-5" />
            </Link>
            <Link to="/settings" aria-label="Profile and settings" className="home-profile rounded-full ring-4 ring-volt-soft">
              <Avatar user={user} />
            </Link>
          </div>
        </header>
        <div className="lg:grid lg:grid-cols-[1.15fr_1fr] lg:gap-10">
          <div className="min-w-0">
            <div className="mb-3 flex items-center justify-between gap-2 text-xs font-semibold">
              <span>Your next charge</span>
              <span className="flex min-w-0 items-center gap-1 text-ink-2"><LocateFixed className="size-3.5 shrink-0" /><span className="truncate">{origin.label}</span></span>
            </div>
            <section aria-label="Reachable chargers map" className="relative isolate h-[clamp(17rem,76vw,24rem)] overflow-hidden rounded-[2.5rem] bg-night">
              <MapView origin={origin} budgetM={Math.min(soc * 1000, budget.range_budget_m)} sites={mapSites} selectedId={null} onSelect={(id) => navigate(`/station/${id}`)} compact className="absolute inset-0" />
              <div className="pointer-events-none absolute inset-x-0 top-0 z-[500] bg-gradient-to-b from-white/95 to-transparent p-5 text-[#0e0f0e]">
                <p className="text-[11px] font-medium text-[#526079]">Compatible with your {model.make} {model.model}</p>
                <p aria-live="polite" className="mt-1 text-lg font-semibold tracking-tight">{search.loading ? 'Finding reachable chargers…' : search.error ? 'Charger search unavailable' : `${mapSites.length} reachable demo ${mapSites.length === 1 ? 'site' : 'sites'}`}</p>
                <p className="mt-1 text-[11px] text-[#526079]">At {soc}% battery · searching within {km(Math.min(soc * 1000, budget.range_budget_m))} · {furthestRouteM ? `furthest option ${km(furthestRouteM)} away` : 'no reachable option'} · simulated routes</p>
              </div>
              <Link to="/discover" className="absolute bottom-8 right-4 z-[500] rounded-full bg-surface px-5 py-3 text-xs font-semibold shadow-soft">View chargers <ArrowRight className="ml-1 inline size-4" /></Link>
            </section>

            <Link to="/discover" className="mt-5 flex min-h-[88px] items-center gap-3 rounded-[2rem] bg-volt px-5 py-3 text-white transition active:scale-[0.99]">
              <span className="min-w-0 flex-1">
                <span className="block text-lg font-semibold tracking-tight">Find a reachable charger</span>
                <span className="mt-0.5 block text-xs">Within {km(Math.min(soc * 1000, budget.range_budget_m))} of MIT-WPU · your connectors only</span>
              </span>
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-ink text-white"><ArrowRight className="size-5" /></span>
            </Link>

            <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-4">
              <div className="min-w-0 min-h-[150px] rounded-[2rem] bg-volt-soft p-4 sm:p-5">
                <div className="flex items-baseline gap-1"><span className="text-[clamp(1.75rem,8.5vw,2.25rem)] font-semibold tracking-tight">{soc}</span><span className="text-lg">%</span></div>
                <div className="mt-1 flex items-center gap-1.5 text-xs text-ink-2"><BatteryCharging className="size-3.5" /> Battery level</div>
                <Range className="mt-3" label="Battery level" value={soc} min={0} max={100} onChange={commitSoc} />
              </div>
              <div className="min-w-0 min-h-[150px] rounded-[2rem] bg-ink p-4 sm:p-5 text-white">
                <div className="flex items-baseline gap-1 text-volt"><span className="text-[clamp(1.75rem,8.5vw,2.25rem)] font-semibold tracking-tight">{(budget.range_budget_m / 1000).toFixed(1)}</span><span className="text-lg">km</span></div>
                <div className="mt-1 flex items-center gap-1.5 text-xs text-white/65"><Gauge className="size-3.5" /> Range budget</div>
                <p className="mt-3 text-[10px] leading-relaxed text-white/50">After {POLICY.reserve_pct}% reserve · ×{POLICY.uncertainty} uncertainty</p>
              </div>
            </div>
            <Link to="/vehicle" className="mt-5 flex items-center gap-3 rounded-3xl border border-line p-4 sm:p-5">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-volt-soft"><Target className="size-5 text-volt-strong" /></span>
              <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{model.make} {model.model} · {model.variant}</span><span className="block text-xs text-ink-2">Target {vehicle.target_soc}% · {(model.usable_battery_wh / 1000).toFixed(0)} kWh · AC {model.ac_limit_kw} kW</span><span className="block text-[10px] text-muted">{model.connectors.map((c) => CONNECTOR_LABEL[c.standard]).join(' · ')} · Demo profile</span></span>
              <ArrowRight className="size-4 shrink-0" />
            </Link>
            {soc <= POLICY.reserve_pct ? (
              <Card className="mt-4 bg-amber-soft text-sm text-[#6d4710] shadow-none">At or below the {POLICY.reserve_pct}% reserve there is no discretionary range. Ampere won’t invent a reachable option — contact your roadside assistance.</Card>
            ) : null}
          </div>

          <div className="mt-8 min-w-0 lg:mt-0">
            <SectionTitle className="!mt-0 !mb-4" action={<Link to="/bookings" className="text-sm font-semibold text-ink">View all</Link>}>Active bookings</SectionTitle>
            {active.length ? (
              <div className="space-y-4">
                {active.map(({ header, state }) => (
                  <Link key={header.id} to={`/booking/${header.id}`} className="block">
                    <Card className="!p-5 transition hover:shadow-float">
                      <div className="flex items-center gap-3">
                        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-surface-2">{siteIcon(readDb().sites.find((s) => s.id === header.site_id)?.site_type ?? 'CAFE')}</span>
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold leading-snug">{state.request.site_name}</div>
                          <div className="mt-1 text-xs leading-relaxed text-muted">
                            {istDayLabel(state.request.start_at, now)} · {istTime(state.request.start_at)}–{istTime(state.request.end_at)}
                          </div>
                          <p className="mt-2 text-xs font-medium text-volt-strong">{state.lifecycle === 'charging' ? 'Charging in progress' : state.lifecycle === 'on_the_way' ? 'On your way' : state.lifecycle === 'host_confirmed' ? 'Your space is reserved' : 'Waiting for your host'}</p>
                        </div>
                        <ArrowRight className="size-4 shrink-0 text-ink-2" />
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            ) : (
              <Card className="text-sm text-muted">No active bookings. Find a charger to request a slot.</Card>
            )}

            <SectionTitle className="!mt-8 !mb-4" action={<Link to="/inbox" className="text-sm font-semibold text-ink">View all</Link>}>Recent alerts</SectionTitle>
            <div className="grid grid-cols-2 gap-4">
              {items.slice(0, 4).map((n) => {
                const booking = bookings.data?.find((b) => b.header.id === n.booking_id)
                const title = n.event.event_type === 'PaymentCaptured' ? 'Payment received' : n.event.event_type === 'HostConfirmed' ? 'Space confirmed' : n.event.event_type === 'ChargingCompleted' ? 'Charge complete' : n.title
                const Icon = n.event.event_type === 'PaymentCaptured' ? CreditCard : n.event.event_type === 'HostConfirmed' || n.event.event_type === 'ChargingCompleted' ? CircleCheck : Clock3
                return (
                  <Link key={n.event.event_id} to={`/booking/${n.booking_id}`} className="group flex min-w-0 flex-col rounded-[1.75rem] border border-line bg-surface-2 p-4 sm:p-5 transition hover:-translate-y-0.5 hover:shadow-soft">
                    <div className="flex items-start justify-between gap-2">
                      <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-white text-volt shadow-soft"><Icon className="size-[18px]" /></span>
                      <span className="pt-1 text-right text-[10px] leading-tight text-muted">{relativeAge(n.event.recorded_at, now)}</span>
                    </div>
                    <h3 className="mt-5 text-sm font-semibold leading-snug tracking-tight">{title}</h3>
                    <p className="mt-2 flex-1 text-[11px] leading-relaxed text-muted">{booking?.state.request.site_name ?? n.body}</p>
                    <span className="mt-4 inline-flex items-center justify-between text-[10px] font-medium text-volt-strong">View booking <ArrowRight className="size-3.5 transition group-hover:translate-x-0.5" /></span>
                  </Link>
                )
              })}
              {!items.length ? <Card className="col-span-2 text-sm text-muted">Booking updates will appear here.</Card> : null}
            </div>
          </div>
        </div>
      </Page>
    </>
  )
}

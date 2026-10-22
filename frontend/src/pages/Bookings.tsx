import { bookingSiteName } from '../lib/bookingSiteName'
import { ArrowUpRight, CalendarDays, Clock3, Zap } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useNow, useQuery, useSession } from '../app/hooks'
import { Page, PageHeader } from '../components/Shell'
import { Card, EmptyState, Segmented, Sheet, Skeleton } from '../components/ui'
import { OUTCOME_LABEL } from '../domain/booking'
import { CONNECTOR_LABEL, userById } from '../domain/catalogue'
import { istDayLabel, istTime, rupees } from '../lib/format'
import { stationImage } from '../lib/stationImages'
import { api } from '../server/api'

export default function Bookings() {
  const user = useSession()!
  const now = useNow(10000)
  const caps = user.capabilities
  const scopes: { value: 'driver' | 'host' | 'all'; label: string }[] = [
    ...(caps.includes('DRIVER') ? [{ value: 'driver' as const, label: 'My trips' }] : []),
    ...(caps.includes('HOST') ? [{ value: 'host' as const, label: 'At my chargers' }] : []),
    ...(caps.includes('ADMIN') || caps.includes('JURY') ? [{ value: 'all' as const, label: 'All demo bookings' }] : []),
  ]
  const [scope, setScope] = useState(scopes[scopes.length > 1 && caps.includes('JURY') ? scopes.length - 1 : 0].value)
  const [visitId, setVisitId] = useState<string | null>(null)
  const q = useQuery(() => api.listBookings(scope), [scope])
  const rows = q.data ?? []
  const visit = rows.find((r) => r.header.id === visitId)
  const active = rows.filter((r) => !r.state.ended)
  const past = rows.filter((r) => r.state.ended)
  return (
    <>
      <PageHeader user={user} title="Bookings" />
      <Page>
        {scopes.length > 1 ? <Segmented className="mb-4 max-w-md" size="sm" value={scope} onChange={setScope} options={scopes} /> : null}
        {q.loading && !q.data ? (
          <Skeleton className="h-32" />
        ) : !rows.length ? (
          <EmptyState icon={<CalendarDays className="size-6" />} title="No bookings yet" action={<Link to="/discover" className="font-semibold underline">Find a charger</Link>} />
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {[
              ['Coming up', active],
              ['Previous visits', past],
            ].map(([label, list]) =>
              (list as typeof rows).length ? (
                <section key={label as string}>
                  <h2 className="mb-3 text-[17px] font-semibold text-ink-2">{label as string}</h2>
                  <div className="space-y-3">
                    {(list as typeof rows).map(({ header, state }) => (
                      <Card key={header.id} className="relative overflow-hidden !rounded-[2rem] !p-0">
                        {!state.ended ? (
                          <div className="relative">
                            <img src={stationImage(header.site_id)} alt="Illustrative charging location" className="aspect-[2.1] w-full object-cover" />
                            <span className="absolute bottom-3 left-4 text-[10px] text-white drop-shadow">Illustrative location</span>
                          </div>
                        ) : null}
                        <div className="p-5">
                          <div className="flex items-start gap-3">
                            {state.ended ? <img src={stationImage(header.site_id)} alt="" className="size-16 shrink-0 rounded-2xl object-cover" /> : null}
                            <div className="min-w-0 flex-1">
                              <p className="text-[11px] font-medium text-volt-strong">{state.outcome ? 'Cancelled' : state.lifecycle === 'done' ? 'Charging completed' : state.lifecycle === 'charging' ? 'Charging in progress' : state.lifecycle === 'on_the_way' ? 'On your way' : state.lifecycle === 'host_confirmed' ? 'Your space is reserved' : 'Waiting for your host'}</p>
                              <h3 className="mt-1 text-xl font-semibold leading-tight tracking-tight">{bookingSiteName(state.request)}</h3>
                              {scope !== 'driver' ? <p className="mt-1 text-xs text-muted">{userById(header.driver_id)?.display_name}</p> : null}
                            </div>
                            {state.ended ? <span className="text-base font-semibold">{rupees(state.request.quote.total_paise)}</span> : null}
                          </div>
                          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-ink-2">
                            <span className="inline-flex items-center gap-1.5"><CalendarDays className="size-3.5" />{istDayLabel(state.request.start_at, now)}</span>
                            <span className="inline-flex items-center gap-1.5"><Clock3 className="size-3.5" />{istTime(state.request.start_at)}–{istTime(state.request.end_at)}</span>
                            {state.ended ? <span className="ml-auto inline-flex items-center gap-1 text-volt-strong">View visit <ArrowUpRight className="size-3.5" /></span> : null}
                          </div>
                          {!state.ended ? (
                            <>
                              <div className="mt-4 flex items-center justify-between border-t border-line pt-4">
                                <span className="inline-flex items-center gap-1.5 text-xs text-ink-2"><Zap className="size-3.5 text-volt" />{(state.request.quote.grid_wh / 1000).toFixed(0)} kWh planned</span>
                                <span className="text-xl font-semibold tracking-tight">{rupees(state.request.quote.total_paise)}</span>
                              </div>
                              <Link to={`/booking/${header.id}`} className="mt-4 flex min-h-12 items-center justify-center gap-2 rounded-full bg-volt text-sm font-semibold text-white hover:bg-volt-strong">Manage booking <ArrowUpRight className="size-4" /></Link>
                            </>
                          ) : null}
                          {state.ended ? <button onClick={() => setVisitId(header.id)} aria-label={`View charging summary for ${bookingSiteName(state.request)}`} className="absolute inset-0 rounded-[2rem] transition hover:bg-volt/5 focus-visible:ring-2 focus-visible:ring-volt" /> : null}
                          {state.outcome ? <p className="mt-3 text-xs text-muted">{OUTCOME_LABEL[state.outcome]}</p> : null}
                        </div>
                      </Card>
                    ))}
                  </div>
                </section>
              ) : null,
            )}
          </div>
        )}
        {rows.some((r) => r.header.id.startsWith('demo-driver-booking-')) ? <p className="mt-5 px-1 text-[11px] text-muted">Includes sample bookings for this demo. No real payment was taken.</p> : null}
      </Page>
      <Sheet open={!!visit} onClose={() => setVisitId(null)} title="Your charging visit">
        {visit ? (
          <div>
            <img src={stationImage(visit.header.site_id)} alt="Illustrative white SUV at a charging location" className="aspect-[2.2] w-full rounded-2xl object-cover" />
            <h2 className="mt-4 text-2xl font-semibold tracking-tight">{bookingSiteName(visit.state.request)}</h2>
            <p className="mt-1 text-xs text-muted">{istDayLabel(visit.state.request.start_at, now)} · {istTime(visit.state.request.start_at)}–{istTime(visit.state.request.end_at)}</p>
            {visit.state.completed ? <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-volt-soft p-4"><p className="text-[11px] text-ink-2">Energy delivered</p><p className="mt-1 text-2xl font-semibold">{(visit.state.completed.grid_wh / 1000).toFixed(1)} <span className="text-sm font-normal">kWh</span></p></div>
              <div className="rounded-2xl bg-surface-2 p-4"><p className="text-[11px] text-ink-2">Estimated battery gain</p><p className="mt-1 text-2xl font-semibold">{(visit.state.completed.battery_gain_wh / 1000).toFixed(1)} <span className="text-sm font-normal">kWh</span></p></div>
            </div> : null}
            <div className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between gap-3"><span className="text-muted">Connector</span><span>{CONNECTOR_LABEL[visit.state.request.quote.connector_standard]} · {visit.state.request.quote.effective_power_kw} kW</span></div>
              <div className="flex justify-between gap-3"><span className="text-muted">Energy charge</span><span>{rupees(visit.state.request.quote.energy_subtotal_paise)}</span></div>
              <div className="flex justify-between gap-3"><span className="text-muted">Booking fee</span><span>{rupees(visit.state.request.quote.booking_fee_paise)}</span></div>
              <div className="flex justify-between gap-3 border-t border-line pt-3 font-semibold"><span>Total</span><span>{rupees(visit.state.request.quote.total_paise)}</span></div>
            </div>
            <p className="mt-4 text-[11px] text-muted">{visit.state.outcome ? OUTCOME_LABEL[visit.state.outcome] : 'Completed demo session. Energy and payment are simulated.'}</p>
            {visit.state.completed ? <Link to={`/receipt/${visit.header.id}`} className="mt-5 flex min-h-12 items-center justify-center gap-2 rounded-full bg-volt text-sm font-semibold text-white">View receipt <ArrowUpRight className="size-4" /></Link> : null}
          </div>
        ) : null}
      </Sheet>
    </>
  )
}

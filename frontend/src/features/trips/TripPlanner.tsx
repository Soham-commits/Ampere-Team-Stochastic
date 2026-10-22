import { BatteryCharging, Flag, MapPin, Navigation, Route, Zap } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useSession } from '../../app/hooks'
import { Page, PageHeader } from '../../components/Shell'
import { Card, Notice, Range } from '../../components/ui'
import { modelById } from '../../domain/catalogue'
import { planTrip } from './planner'
import { TripMap, type CorridorCharger, type TripMapPoint } from './TripMap'
import { googleMapsDirectionsUrl, TRIP_COORDS, TRIP_ORIGIN, TRIP_ROUTES } from './routes'
import { useDemoState } from '../shared/useDemoState'
import { listAmpereStations, useSavedStations } from '../stations/saved'
import { readDb } from '../../server/db'

export default function TripPlanner() {
  const user = useSession()!
  const vehicle = readDb().vehicles.find((v) => v.owner_id === user.id)
  const model = vehicle ? modelById(vehicle.model_id) : undefined
  const [routeId, setRouteId] = useDemoState(user.id, 'trip-route', TRIP_ROUTES[0].id)
  const [saved, setSaved] = useDemoState<{ routeId: string; soc: number } | null>(user.id, 'saved-trip', null)
  const [soc, setSoc] = useState(saved?.routeId === routeId ? saved.soc : (vehicle?.soc ?? 40))
  const route = TRIP_ROUTES.find((r) => r.id === routeId) ?? TRIP_ROUTES[0]
  const compatible = !!model?.connectors.some((c) => c.standard === 'CCS2' && c.mode === 'DC')
  const plan = model
    ? planTrip(
        route.distanceKm,
        model.usable_battery_wh / 1000,
        model.consumption_kwh_per_km,
        soc,
        compatible ? route.chargers : [],
        model.dc_limit_kw,
      )
    : null
  const mapPoints = useMemo<TripMapPoint[]>(() => {
    const stops = (plan?.stops ?? []).flatMap((stop, i) => (TRIP_COORDS[stop.id] ? [{ ...TRIP_COORDS[stop.id], label: stop.name, kind: 'stop' as const, order: i + 1, detail: [`Planned stop ${i + 1} · ${stop.km} km from Pune`, `CCS2 DC · ${stop.powerKw} kW`, `${Math.floor(stop.arrivalSoc)}% → ${Math.round(stop.departureSoc)}% · ~${stop.minutes} min`, 'Sample stop · cannot be reserved'] }] : []))
    return [
      { lat: TRIP_ORIGIN.lat, lng: TRIP_ORIGIN.lng, label: TRIP_ORIGIN.label, kind: 'start' },
      ...stops,
      { ...TRIP_COORDS[route.id], label: route.destination, kind: 'end' },
    ]
  }, [plan, route])
  const corridor = useMemo<CorridorCharger[]>(() => {
    const planned = new Set((plan?.stops ?? []).map((s) => s.id))
    return route.chargers.flatMap((c) =>
      TRIP_COORDS[c.id] && !planned.has(c.id)
        ? [{ ...TRIP_COORDS[c.id], id: c.id, label: c.name, detail: [`${c.km} km from Pune`, `CCS2 DC · ${c.powerKw} kW`, 'Sample stop · cannot be reserved'] }]
        : [],
    )
  }, [plan, route])
  const mapsUrl = googleMapsDirectionsUrl(
    TRIP_ORIGIN,
    mapPoints.filter((p) => p.kind === 'stop'),
    TRIP_COORDS[route.id],
  )
  const stations = useMemo(() => listAmpereStations(), [])
  const savedStations = useSavedStations(user.id)
  const isSaved = saved?.routeId === route.id && saved.soc === soc
  return (
    <>
      <PageHeader back title="Trip planner" subtitle="A charging plan, before you leave." />
      <Page className="mx-auto max-w-2xl">
        <p className="mb-5 text-xs leading-relaxed text-muted">
          Route simulation · sample highway stops and distances, not live routing or charger availability.
        </p>
        <Card className="border border-line !rounded-[2rem] !p-5">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-volt-soft text-volt">
              <MapPin className="size-5" />
            </span>
            <div>
              <p className="text-xs text-muted">Leaving from</p>
              <p className="font-medium">Pune · city centre</p>
            </div>
          </div>
          <label className="mt-5 block text-sm font-medium">
            Destination
            <select
              value={route.id}
              onChange={(e) => setRouteId(e.target.value)}
              className="mt-2 h-12 w-full rounded-2xl border border-line bg-surface-2 px-4"
            >
              {TRIP_ROUTES.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.destination} · {r.distanceKm} km
                </option>
              ))}
            </select>
          </label>
          <div className="mt-6 flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm">
              <BatteryCharging className="size-4 text-volt" />
              Departure battery
            </span>
            <strong className="text-2xl text-volt">{soc}%</strong>
          </div>
          <Range label="Departure battery percentage" value={soc} min={0} max={100} onChange={setSoc} />
          <p className="mt-2 text-xs text-muted">
            {model
              ? `${model.make} ${model.model} · ${(model.usable_battery_wh / 1000).toFixed(0)} kWh`
              : 'Add your car in profile to calculate a plan.'}{' '}
            · Planning here does not change your profile battery.
          </p>
        </Card>
        {!model ? (
          <div className="mt-5">
            <Link to="/vehicle" className="text-sm font-semibold text-volt">
              Add your vehicle →
            </Link>
          </div>
        ) : (
          <>
            {!compatible ? (
              <p className="mt-5 text-sm text-amber">
                These sample corridor chargers use CCS2. No compatible stops are available for this car.
              </p>
            ) : null}
            {plan?.problem ? (
              <div className="mt-5">
                <Notice tone="amber">{plan.problem}</Notice>
                <Link to="/discover" className="mt-3 inline-block text-sm font-semibold text-volt">
                  Find a charger before departure →
                </Link>
              </div>
            ) : null}
            <div className="mt-6 grid grid-cols-3 gap-2">
              {[
                { label: 'Distance', value: `${route.distanceKm} km` },
                { label: 'Stops', value: `${plan?.stops.length ?? 0}` },
                { label: 'Charging', value: `${plan?.stops.reduce((sum, stop) => sum + stop.minutes, 0) ?? 0} min` },
              ].map((item) => (
                <div key={item.label} className="rounded-3xl bg-surface-2 p-4">
                  <p className="text-[11px] text-muted">{item.label}</p>
                  <p className="mt-3 text-lg font-semibold">{item.value}</p>
                </div>
              ))}
            </div>
            <TripMap points={mapPoints} corridor={corridor} stations={stations} isSaved={savedStations.isSaved} onToggleSave={savedStations.toggle} className="mt-6 h-80 overflow-hidden rounded-3xl border border-line sm:h-[28rem]" />
            <p className="mt-2 text-xs text-muted">Blue pins are Ampere stations you can save and book; numbered pins are your planned stops and grey pins are other chargers along the route (sample data). Tap any pin for details.</p>
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-volt px-5 font-semibold text-volt"
            >
              <Navigation className="size-4" /> Open route in Google Maps
            </a>
            <h2 className="mb-4 mt-7 text-xl font-semibold">Your route</h2>
            <div className="space-y-3">
              <Card className="flex items-center gap-3 border border-line">
                <Route className="size-5 text-volt" />
                <div>
                  <p className="font-medium">Start in Pune</p>
                  <p className="text-xs text-muted">{soc}% departure battery</p>
                </div>
              </Card>
              {plan?.stops.map((stop, index) => (
                <Card key={stop.id} className="border border-line !p-5">
                  <div className="flex items-start gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-volt-soft font-semibold text-volt">
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <h3 className="font-semibold">{stop.name}</h3>
                      <p className="mt-1 text-xs text-muted">
                        {stop.km} km from Pune · CCS2 · {stop.powerKw} kW
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3 text-sm">
                    <span>
                      {Math.floor(stop.arrivalSoc)}% → {Math.round(stop.departureSoc)}%
                    </span>
                    <span className="inline-flex items-center gap-1 text-volt">
                      <Zap className="size-4" />
                      {stop.chargeKwh.toFixed(1)} kWh · ~{stop.minutes} min
                    </span>
                  </div>
                </Card>
              ))}
              {plan?.arrivalSoc != null ? (
                <Card className="flex items-center gap-3 border border-line">
                  <Flag className="size-5 text-volt" />
                  <div>
                    <p className="font-medium">Arrive in {route.destination}</p>
                    <p className="text-xs text-muted">
                      ~{Math.floor(plan.arrivalSoc)}% battery remaining{!plan.stops.length ? ' · No charging stop needed' : ''}
                    </p>
                  </div>
                </Card>
              ) : null}
            </div>
            <p className="mt-4 text-xs leading-relaxed text-muted">
              Uses your model’s constant consumption, a 10% arrival reserve, an 80% charge target and 90% charging efficiency. Traffic,
              terrain, charging taper and queues are excluded. Stops are illustrative and cannot be reserved.
            </p>
            <button
              disabled={!!plan?.problem}
              onClick={() => setSaved({ routeId: route.id, soc })}
              className="mt-5 min-h-12 w-full rounded-full bg-volt px-5 font-semibold text-white disabled:opacity-40"
            >
              {isSaved ? 'Plan saved on this device' : 'Save this plan'}
            </button>
          </>
        )}
      </Page>
    </>
  )
}

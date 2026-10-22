import L from 'leaflet'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { MapContainer, Marker, Polyline, Popup, TileLayer, Tooltip, useMap } from 'react-leaflet'
import type { AmpereStation } from '../stations/saved'
import type { Coord } from './routes'

export interface TripMapPoint extends Coord {
  label: string
  kind: 'start' | 'stop' | 'end'
  order?: number
  detail?: string[]
}

/** Sample highway charger along the route that the plan does not need to stop at. */
export interface CorridorCharger extends Coord {
  id: string
  label: string
  detail: string[]
}

const BOLT = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2 4 14h7l-1 8 9-12h-7z"/></svg>'

function pointIcon(p: TripMapPoint) {
  const inner = p.kind === 'stop' ? `${BOLT}<b style="margin-left:2px;font-size:12px">${p.order}</b>` : p.kind === 'start' ? 'A' : 'B'
  return L.divIcon({ className: '', html: `<div class="amp-pin ${p.kind === 'stop' ? '' : 'is-directory'}">${inner}</div>`, iconSize: [44, 44], iconAnchor: [22, 22] })
}

function FitRoute({ points }: { points: Coord[] }) {
  const map = useMap()
  useEffect(() => {
    map.invalidateSize()
    map.fitBounds(L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number])), { padding: [36, 36], animate: false })
  }, [map, points])
  return null
}

/** Road geometry from the public OSRM demo server; falls back to straight legs when it is unreachable. */
function useRoadLine(points: Coord[]) {
  const key = points.map((p) => `${p.lng.toFixed(5)},${p.lat.toFixed(5)}`).join(';')
  const [line, setLine] = useState<[number, number][] | null>(null)
  useEffect(() => {
    setLine(null)
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 5000)
    fetch(`https://router.project-osrm.org/route/v1/driving/${key}?overview=full&geometries=geojson`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((j: { code: string; routes?: { geometry: { coordinates: [number, number][] } }[] }) => {
        if (j.code === 'Ok' && j.routes?.[0]) setLine(j.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]))
      })
      .catch(() => undefined)
      .finally(() => clearTimeout(timer))
    return () => {
      clearTimeout(timer)
      ctrl.abort()
    }
  }, [key])
  return line
}

const corridorIcon = L.divIcon({ className: '', html: `<div class="amp-pin is-directory" style="width:30px;height:30px">${BOLT}</div>`, iconSize: [30, 30], iconAnchor: [15, 15] })

const stationIcon = (saved: boolean) =>
  L.divIcon({ className: '', html: `<div class="amp-pin ${saved ? 'is-selected' : ''}" style="width:34px;height:34px">${BOLT}</div>`, iconSize: [34, 34], iconAnchor: [17, 17] })

export function TripMap({
  points,
  stations = [],
  corridor = [],
  isSaved,
  onToggleSave,
  className,
}: {
  points: TripMapPoint[]
  stations?: AmpereStation[]
  corridor?: CorridorCharger[]
  isSaved?: (id: string) => boolean
  onToggleSave?: (id: string) => void
  className?: string
}) {
  const road = useRoadLine(points)
  const straight = useMemo(() => points.map((p) => [p.lat, p.lng] as [number, number]), [points])
  return (
    <div className={className}>
      <MapContainer center={[points[0].lat, points[0].lng]} zoom={9} zoomControl={false} className="h-full w-full" style={{ background: '#eef2f7' }}>
        <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' maxZoom={19} />
        <FitRoute points={points} />
        <Polyline positions={road ?? straight} pathOptions={{ color: '#3560cf', weight: 5, opacity: 0.85, dashArray: road ? undefined : '8 10' }} />
        {points.map((p) => (
          <Marker key={`${p.kind}-${p.label}`} position={[p.lat, p.lng]} icon={pointIcon(p)} keyboard={false}>
            <Tooltip className="amp-tip" direction="top" offset={[0, -14]}>
              {p.label}
            </Tooltip>
            {p.detail ? (
              <Popup minWidth={200}>
                <div className="space-y-1 text-[13px]">
                  <div className="text-sm font-semibold text-[#102455]">{p.label}</div>
                  {p.detail.map((d) => (
                    <div key={d}>{d}</div>
                  ))}
                </div>
              </Popup>
            ) : null}
          </Marker>
        ))}
        {corridor.map((c) => (
          <Marker key={`corridor-${c.id}`} position={[c.lat, c.lng]} icon={corridorIcon} keyboard={false} title={c.label} alt={c.label}>
            <Tooltip className="amp-tip" direction="top" offset={[0, -12]}>
              {c.label}
            </Tooltip>
            <Popup minWidth={200}>
              <div className="space-y-1 text-[13px]">
                <div className="text-sm font-semibold text-[#102455]">{c.label}</div>
                {c.detail.map((d) => (
                  <div key={d}>{d}</div>
                ))}
              </div>
            </Popup>
          </Marker>
        ))}
        {stations.map((st) => {
          const saved = isSaved?.(st.id) ?? false
          return (
            <Marker key={st.id} position={[st.lat, st.lng]} icon={stationIcon(saved)} title={st.name} alt={st.name}>
              <Popup minWidth={210}>
                <div className="space-y-1 text-[13px]">
                  <div className="text-sm font-semibold text-[#102455]">{st.name}</div>
                  <div className="text-xs text-[#526079]">{st.area}</div>
                  <div>{st.connectors}</div>
                  {st.pricePerKwh != null ? <div>₹{(st.pricePerKwh / 100).toFixed(0)}/kWh · host confirms before you go</div> : null}
                  {st.hostName ? <div className="text-xs text-[#526079]">Host: {st.hostName}</div> : null}
                  <div className="flex gap-2 pt-1.5">
                    <button type="button" onClick={() => onToggleSave?.(st.id)} className="min-h-9 flex-1 rounded-full border border-[#3560cf] px-3 text-xs font-semibold text-[#3560cf]">
                      {saved ? 'Saved ✓' : 'Save'}
                    </button>
                    <Link to={`/station/${st.id}`} className="grid min-h-9 flex-1 place-items-center rounded-full bg-[#3560cf] px-3 text-xs font-semibold !text-white">
                      View &amp; book
                    </Link>
                  </div>
                </div>
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>
    </div>
  )
}

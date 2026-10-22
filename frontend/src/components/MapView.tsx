import L from 'leaflet'
import { Minus, Plus } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Circle, MapContainer, Marker, TileLayer, Tooltip, useMap } from 'react-leaflet'
import type { LatLng } from '../domain/types'
import type { PublicSite } from '../server/discovery'

const BOLT = '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2 4 14h7l-1 8 9-12h-7z"/></svg>'
const HOME = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 11 12 4l9 7v9H3z"/><path d="M12 20v-6"/></svg>'

function pinIcon(selected: boolean, directory: boolean, residential: boolean) {
  return L.divIcon({
    className: '',
    html: `<div class="amp-pin ${selected ? 'is-selected' : ''} ${directory ? 'is-directory' : ''}">${residential ? HOME : BOLT}</div>`,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  })
}

const originIcon = L.divIcon({ className: '', html: '<div class="amp-origin"></div>', iconSize: [18, 18], iconAnchor: [9, 9] })

export interface MapSite {
  site: PublicSite
  reservable: boolean
  label: string
}

function OriginView({ origin }: { origin: LatLng }) {
  const map = useMap()
  useEffect(() => {
    map.setView([origin.lat, origin.lng], 14, { animate: false })
    const resize = () => map.invalidateSize()
    const raf = requestAnimationFrame(resize)
    const observer = new ResizeObserver(resize)
    observer.observe(map.getContainer())
    return () => {
      cancelAnimationFrame(raf)
      observer.disconnect()
    }
  }, [map, origin.lat, origin.lng])
  return null
}

function FlyTo({ target, compact }: { target: LatLng | null; compact: boolean }) {
  const map = useMap()
  useEffect(() => {
    if (target) {
      const zoom = Math.max(map.getZoom(), 14)
      const center = compact ? L.latLng(target.lat, target.lng) : map.unproject(map.project([target.lat, target.lng], zoom).add([0, map.getSize().y * 0.18]), zoom)
      map.flyTo(center, zoom, { duration: 0.6 })
    }
  }, [target, map, compact])
  return null
}

function MapZoomControls() {
  const map = useMap()
  return <div className="absolute right-4 top-4 z-[650] flex gap-2" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
    <button type="button" aria-label="Zoom in" onClick={() => map.zoomIn()} className="grid size-11 place-items-center rounded-full bg-white text-[#102455] shadow-soft"><Plus className="size-5" /></button>
    <button type="button" aria-label="Zoom out" onClick={() => map.zoomOut()} className="grid size-11 place-items-center rounded-full bg-white text-[#102455] shadow-soft"><Minus className="size-5" /></button>
  </div>
}

export function MapView({
  origin,
  budgetM,
  sites,
  selectedId,
  onSelect,
  className,
  compact = false,
}: {
  origin: LatLng
  budgetM: number
  sites: MapSite[]
  selectedId: string | null
  onSelect: (id: string) => void
  className?: string
  compact?: boolean
}) {
  const [tileErrors, setTileErrors] = useState(0)
  const selected = useMemo(() => sites.find((s) => s.site.id === selectedId)?.site ?? null, [sites, selectedId])
  return (
    <div className={className}>
      <MapContainer center={[origin.lat, origin.lng]} zoom={14} zoomControl={false} attributionControl className="h-full w-full" style={{ background: '#eef2f7' }}>
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          maxZoom={19}
          eventHandlers={{ tileerror: () => setTileErrors((n) => n + 1), tileload: () => setTileErrors(0) }}
        />
        <OriginView origin={origin} />
        <FlyTo target={selected ? { lat: selected.lat, lng: selected.lng } : null} compact={compact} />
        {!compact ? <MapZoomControls /> : null}
        {budgetM > 0 ? (
          <Circle center={[origin.lat, origin.lng]} radius={budgetM} interactive={false} pathOptions={{ color: '#3560cf', weight: 1.5, dashArray: '6 8', fillColor: '#3560cf', fillOpacity: 0.05 }} />
        ) : null}
        <Marker position={[origin.lat, origin.lng]} icon={originIcon} keyboard={false}>
          <Tooltip className="amp-tip" direction="top" offset={[0, -10]}>
            You are here
          </Tooltip>
        </Marker>
        {sites.map(({ site, reservable, label }) => (
          <div key={site.id}>
            {site.location_precision === 'APPROXIMATE' ? <Circle center={[site.lat, site.lng]} radius={350} interactive={false} pathOptions={{ color: '#c7cbc2', weight: 1, dashArray: '3 6', fillOpacity: 0.06 }} /> : null}
            <Marker
              position={[site.lat, site.lng]}
              icon={pinIcon(site.id === selectedId, !reservable, site.location_precision === 'APPROXIMATE')}
              eventHandlers={{ click: () => onSelect(site.id), keypress: () => onSelect(site.id) }}
              title={label}
              alt={label}
            />
          </div>
        ))}
      </MapContainer>
      {tileErrors > 3 ? (
        <div className="pointer-events-none absolute inset-x-0 top-24 z-[500] mx-auto w-fit rounded-full bg-night-2/90 px-4 py-2 text-xs font-semibold text-white">
          Map tiles unavailable — schematic view. The list stays fully usable.
        </div>
      ) : null}
    </div>
  )
}

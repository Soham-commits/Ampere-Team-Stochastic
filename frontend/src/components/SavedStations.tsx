import { Bookmark, MapPin, X } from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useSession } from '../app/hooks'
import { listAmpereStations, useSavedStations } from '../features/stations/saved'
import { Button, Card } from './ui'

export function SavedStations() {
  const user = useSession()!
  const saved = useSavedStations(user.id)
  const stations = useMemo(() => listAmpereStations(), [])
  const items = saved.ids.flatMap((id) => stations.find((s) => s.id === id) ?? [])
  return (
    <section aria-label="Saved stations" className="mt-6">
      <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
        <Bookmark className="size-4 text-volt" /> Saved stations
      </h2>
      {items.length ? (
        <div className="mt-3 space-y-2">
          {items.map((s) => (
            <Card key={s.id} className="flex items-center gap-3 !p-3.5">
              <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-surface-2">
                <MapPin className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">{s.name}</div>
                <div className="truncate text-xs text-muted">{s.area} · {s.connectors}</div>
              </div>
              <Link to={`/station/${s.id}`}>
                <Button size="sm">Book</Button>
              </Link>
              <button type="button" aria-label={`Remove ${s.name}`} onClick={() => saved.toggle(s.id)} className="shrink-0 p-1 text-muted hover:text-danger">
                <X className="size-4" />
              </button>
            </Card>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-sm text-muted">
          Nothing saved yet. Save stations from the <Link to="/trip-planner" className="font-semibold text-volt">trip planner map</Link> to book them later.
        </p>
      )}
    </section>
  )
}

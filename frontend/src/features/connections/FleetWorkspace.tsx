import { Truck } from 'lucide-react'
import { useState } from 'react'
import { Button, Card, Sheet } from '../../components/ui'
import { uuid } from '../../lib/ids'
import { useDemoState } from '../shared/useDemoState'
import { FLEET_VEHICLES, type FleetTask } from './fixtures'

export function FleetWorkspace({ userId }: { userId: string }) {
  const [tasks, setTasks] = useDemoState<FleetTask[]>(userId, 'fleet-tasks', [])
  const [open, setOpen] = useState(false)
  const [vehicle, setVehicle] = useState(FLEET_VEHICLES[0].id)
  const [target, setTarget] = useState(80)
  const [departure, setDeparture] = useState('09:00')
  return (
    <>
      <div className="mb-3 mt-8 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-xl font-semibold">
          <Truck className="size-5 text-volt" />
          Fleet workspace
        </h2>
        <Button size="sm" onClick={() => setOpen(true)}>
          Plan a charge
        </Button>
      </div>
      <p className="mb-4 text-xs text-muted">Three sample vehicles. Plans below are local drafts and do not reserve charger slots.</p>
      <div className="space-y-3">
        {FLEET_VEHICLES.map((car) => (
          <Card key={car.id} className="border border-line !p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] text-muted">{car.id}</p>
                <h3 className="mt-1 text-sm font-semibold">{car.name}</h3>
              </div>
              <p className="text-2xl font-medium text-volt">{car.soc}%</p>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface-2">
              <div className="h-full rounded-full bg-volt" style={{ width: `${car.soc}%` }} />
            </div>
            <p className="mt-2 text-xs text-muted">Sample range · {car.km} km</p>
          </Card>
        ))}
      </div>
      <h2 className="mb-3 mt-7 text-lg font-semibold">Charging drafts</h2>
      <div className="space-y-3">
        {tasks.length ? (
          tasks.map((task) => (
            <Card key={task.id} className="border border-line">
              <p className="text-sm font-semibold">
                {task.vehicle} · charge to {task.target}%
              </p>
              <p className="mt-1 text-xs text-muted">Ready by {task.departure} · next departure · local draft</p>
              <button
                onClick={() => setTasks(tasks.filter((t) => t.id !== task.id))}
                className="mt-3 min-h-10 text-xs font-semibold text-volt"
              >
                Remove draft
              </button>
            </Card>
          ))
        ) : (
          <Card className="text-sm text-muted">No charging drafts yet. Choose a vehicle to plan its next charge.</Card>
        )}
      </div>
      <p className="mt-5 text-xs text-muted">
        Manufacturer names describe sample adapters only; no partnership or supported production integration is implied.
      </p>
      <Sheet open={open} onClose={() => setOpen(false)} title="Plan a fleet charge">
        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault()
            setTasks([{ id: uuid(), vehicle, target, departure }, ...tasks])
            setOpen(false)
          }}
        >
          <label className="block text-sm">
            Vehicle
            <select
              value={vehicle}
              onChange={(e) => setVehicle(e.target.value)}
              className="mt-2 h-12 w-full rounded-2xl border border-line bg-surface-2 px-3"
            >
              {FLEET_VEHICLES.map((car) => (
                <option key={car.id} value={car.id}>
                  {car.id} · {car.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            Target battery
            <select
              value={target}
              onChange={(e) => setTarget(Number(e.target.value))}
              className="mt-2 h-12 w-full rounded-2xl border border-line bg-surface-2 px-3"
            >
              {[80, 90, 100].map((soc) => (
                <option key={soc} value={soc}>
                  {soc}%
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            Next departure time
            <input
              required
              type="time"
              value={departure}
              onChange={(e) => setDeparture(e.target.value)}
              className="mt-2 h-12 w-full rounded-2xl border border-line bg-surface-2 px-3"
            />
          </label>
          <p className="text-xs text-muted">Saves a local planning draft. No charger booking or remote command is sent.</p>
          <Button type="submit" className="w-full">
            Save charging draft
          </Button>
        </form>
      </Sheet>
    </>
  )
}

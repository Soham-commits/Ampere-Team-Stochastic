import { useState } from 'react'
import { uuid } from '../../lib/ids'
import { Button, Card } from '../../components/ui'
import { calculateSavings, type SavingsInputs } from './calculator'
import { useDemoState } from '../shared/useDemoState'

interface LogEntry {
  id: string
  date: string
  inputs: SavingsInputs
}
const money = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)
export function SavingsLog({ userId, inputs }: { userId: string; inputs: SavingsInputs }) {
  const [entries, setEntries] = useDemoState<LogEntry[]>(userId, 'savings-log', [])
  const [date, setDate] = useState(() => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }))
  const [month, setMonth] = useState(date.slice(0, 7))
  const selected = entries.filter((entry) => entry.date.startsWith(month))
  const total = selected.reduce((sum, entry) => sum + (calculateSavings(entry.inputs)?.saved ?? 0), 0)
  return (
    <section className="mt-7">
      <h2 className="mb-3 text-xl font-semibold">Your driving journal</h2>
      <Card className="border border-line !p-5">
        <p className="text-xs leading-relaxed text-muted">
          Record a distance from the calculator above. Each entry keeps its own price assumptions. Enter only the distance for that day to
          avoid double counting.
        </p>
        <form
          className="mt-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            if (!calculateSavings(inputs) || inputs.km <= 0) return
            setEntries([{ id: uuid(), date, inputs: { ...inputs } }, ...entries])
            setMonth(date.slice(0, 7))
          }}
        >
          <label className="block text-xs">
            Drive date
            <input
              required
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-2 h-11 w-full rounded-xl border border-line bg-surface-2 px-3"
            />
          </label>
          <Button type="submit" className="w-full" disabled={!calculateSavings(inputs) || inputs.km <= 0 || !date}>
            Record drive
          </Button>
        </form>
        <label className="mt-6 block text-xs">
          View month
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="mt-2 h-11 w-full rounded-xl border border-line bg-surface-2 px-3"
          />
        </label>
        <div aria-live="polite" className="mt-4 rounded-2xl bg-surface-2 p-4">
          <p className="text-xs text-muted">
            {selected.reduce((sum, entry) => sum + entry.inputs.km, 0).toLocaleString('en-IN')} km recorded · {selected.length} drives
          </p>
          <p className="mt-2 text-2xl font-medium text-volt">{money(total)}</p>
          <p className="text-xs text-muted">Estimated energy savings for this month</p>
        </div>
        <div className="mt-3 divide-y divide-line">
          {selected.map((entry) => (
            <div key={entry.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <div>
                <p className="text-sm font-medium">
                  {entry.inputs.km} km · {money(calculateSavings(entry.inputs)?.saved ?? 0)} saved
                </p>
                <p className="text-xs text-muted">{entry.date}</p>
              </div>
              <button
                onClick={() => setEntries(entries.filter((row) => row.id !== entry.id))}
                className="min-h-10 px-2 text-xs font-semibold text-volt"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </Card>
    </section>
  )
}

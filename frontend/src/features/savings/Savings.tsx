import { ArrowDownRight, Fuel, Zap } from 'lucide-react'
import { SavingsLog } from './SavingsLog'
import { useSession } from '../../app/hooks'
import { Page, PageHeader } from '../../components/Shell'
import { Card } from '../../components/ui'
import { calculateSavings, type SavingsInputs } from './calculator'
import { useDemoState } from '../shared/useDemoState'

const fields: { key: keyof SavingsInputs; label: string; unit: string; min: number }[] = [
  { key: 'km', label: 'Distance driven', unit: 'km', min: 0 },
  { key: 'petrolPerLitre', label: 'Petrol price', unit: '₹ / litre', min: 0 },
  { key: 'petrolKmPerLitre', label: 'Petrol efficiency', unit: 'km / litre', min: 0.1 },
  { key: 'electricityPerKwh', label: 'Charging price', unit: '₹ / kWh', min: 0 },
  { key: 'kwhPer100Km', label: 'EV consumption', unit: 'kWh / 100 km', min: 0.1 },
]
const money = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)
export default function Savings() {
  const user = useSession()!
  const [inputs, setInputs] = useDemoState<SavingsInputs>(user.id, 'savings', {
    km: 500,
    petrolPerLitre: 105,
    petrolKmPerLitre: 15,
    electricityPerKwh: 14,
    kwhPer100Km: 16,
  })
  const result = calculateSavings(inputs)
  return (
    <>
      <PageHeader back title="Fuel savings" subtitle="Explore your driving costs." />
      <Page className="mx-auto max-w-2xl">
        <p className="mb-5 text-xs text-muted">
          Illustrative calculator · prices and distance below are editable assumptions, not current market rates or recorded trips.
        </p>
        <Card className="border border-line !rounded-[2rem] !p-6">
          <span className="inline-flex items-center gap-2 text-sm text-volt">
            <ArrowDownRight className="size-5" />
            {result && result.saved < 0 ? 'Additional EV energy cost' : 'Estimated energy savings'}
          </span>
          <h2 className="mt-4 break-words text-5xl font-medium tracking-tight text-volt">{result ? money(Math.abs(result.saved)) : '—'}</h2>
          <p className="mt-3 text-sm text-ink-2">
            Across {Number.isFinite(inputs.km) ? inputs.km.toLocaleString('en-IN') : '—'} km in your scenario.
          </p>
          {result ? (
            <div className="mt-7 space-y-5">
              {[
                { label: 'Petrol', value: result.petrol, icon: Fuel, color: 'bg-ink/15' },
                { label: 'Electric', value: result.electricity, icon: Zap, color: 'bg-volt' },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label}>
                  <div className="mb-2 flex justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <Icon className="size-4" />
                      {label}
                    </span>
                    <strong>{money(value)}</strong>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-surface-2">
                    <div
                      className={`h-full rounded-full ${color}`}
                      style={{
                        width: `${Math.max(result.petrol, result.electricity) ? (value / Math.max(result.petrol, result.electricity)) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p role="alert" className="mt-5 text-sm text-danger">
              Enter non-negative prices and distance, with efficiency and consumption greater than zero.
            </p>
          )}
        </Card>
        <h2 className="mb-3 mt-7 text-xl font-semibold">Make it your own</h2>
        <Card className="space-y-4 border border-line !p-5">
          {fields.map(({ key, label, unit, min }) => (
            <label key={key} className="block">
              <span className="flex justify-between gap-2 text-sm">
                <span>{label}</span>
                <span className="text-xs text-muted">{unit}</span>
              </span>
              <input
                type="number"
                min={min}
                max={key === 'km' ? 1000000 : 10000}
                step="any"
                value={Number.isNaN(inputs[key]) ? '' : inputs[key]}
                onChange={(e) => setInputs({ ...inputs, [key]: Number(e.target.value) })}
                className="mt-2 h-12 w-full rounded-2xl border border-line bg-surface-2 px-4"
              />
            </label>
          ))}
        </Card>
        <SavingsLog userId={user.id} inputs={inputs} />
        <p className="mt-4 text-xs leading-relaxed text-muted">
          Petrol cost = distance ÷ mileage × price/litre. EV cost = distance × consumption ÷ 100 × price/kWh. Excludes charging losses,
          platform fees, maintenance, insurance and purchase price. Inputs are saved in this browser; no bank or odometer connection is
          used.
        </p>
      </Page>
    </>
  )
}

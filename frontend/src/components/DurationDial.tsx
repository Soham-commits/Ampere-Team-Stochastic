import { Clock3, Minus, Plus } from 'lucide-react'
import { POLICY } from '../domain/policy'
import { Range } from './ui'

export function DurationDial({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const circumference = 2 * Math.PI * 91
  const arc = circumference * 0.75
  const fraction = value / POLICY.max_booking_min
  const adjust = (amount: number) => onChange(Math.max(POLICY.min_booking_min, Math.min(POLICY.max_booking_min, value + amount)))
  return (
    <div className="rounded-[2rem] bg-surface-2 px-4 pb-4 pt-3">
      <div className="relative mx-auto aspect-square w-full max-w-[265px]">
        <svg viewBox="0 0 240 240" className="h-full w-full -rotate-0" aria-hidden="true">
          <circle cx="120" cy="118" r="91" fill="none" stroke="#e0e6f1" strokeWidth="22" strokeLinecap="round" strokeDasharray={`${arc} ${circumference}`} transform="rotate(135 120 118)" />
          <circle cx="120" cy="118" r="91" fill="none" stroke="var(--color-volt)" strokeWidth="22" strokeLinecap="round" strokeDasharray={`${arc * fraction} ${circumference}`} transform="rotate(135 120 118)" className="transition-[stroke-dasharray] duration-500 ease-out" />
          {Array.from({ length: 37 }, (_, i) => {
            const angle = ((135 + i * 7.5) * Math.PI) / 180
            return <circle key={i} cx={120 + 69 * Math.cos(angle)} cy={118 + 69 * Math.sin(angle)} r="1.2" fill={i / 36 <= fraction ? 'var(--color-volt)' : '#cbd5e1'} />
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pb-1">
          <span className="mb-3 grid size-12 place-items-center rounded-full bg-surface text-volt shadow-soft"><Clock3 className="size-5" /></span>
          <span className="text-[2.2rem] font-medium leading-none tracking-tight tabular-nums">{String(Math.floor(value / 60)).padStart(2, '0')}<span className="mx-1 text-muted">:</span>{String(value % 60).padStart(2, '0')}</span>
          <span className="mt-2 text-[11px] text-muted">hours : minutes</span>
        </div>
      </div>
      <div className="-mt-3 flex items-center gap-4">
        <button type="button" aria-label="Shorter charging duration" disabled={value <= POLICY.min_booking_min} onClick={() => adjust(-POLICY.increment_min)} className="grid size-10 shrink-0 place-items-center rounded-full bg-surface disabled:opacity-35"><Minus className="size-4" /></button>
        <Range label="Charging duration in minutes" value={value} min={POLICY.min_booking_min} max={POLICY.max_booking_min} step={POLICY.increment_min} onChange={onChange} />
        <button type="button" aria-label="Longer charging duration" disabled={value >= POLICY.max_booking_min} onClick={() => adjust(POLICY.increment_min)} className="grid size-10 shrink-0 place-items-center rounded-full bg-surface disabled:opacity-35"><Plus className="size-4" /></button>
      </div>
      <p className="mt-3 text-center text-[10px] text-muted">Choose {POLICY.min_booking_min}–{POLICY.max_booking_min} minutes · slots update automatically</p>
    </div>
  )
}

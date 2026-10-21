import { Zap } from 'lucide-react'
import { cn } from '../lib/cn'

export interface ChargingBay {
  id: string
  label: string
  selectable: boolean
  note: string
}

/** Schematic resource selection, not a surveyed parking plan or occupancy sensor. */
export function ChargingBayPlan({ bays, selectedId, onSelect }: { bays: ChargingBay[]; selectedId?: string; onSelect?: (id: string) => void }) {
  return (
    <div className="overflow-hidden rounded-[1.75rem] bg-[#e9edf4] p-3 text-[#102455]">
      <div className="flex items-center justify-between px-1 pb-3 text-[10px] font-medium text-[#64748b]"><span>CHARGING BAYS</span><span>Schematic layout</span></div>
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(Math.max(bays.length, 1), 3)}, minmax(0, 1fr))` }}>
        {bays.map((bay, i) => {
          const selected = selectedId === bay.id
          const content = <>
            <span className={cn('absolute left-2 top-2 grid size-6 place-items-center rounded-full text-[10px] font-semibold', selected ? 'bg-white text-volt' : 'bg-white/80 text-[#64748b]')}>{String(i + 1).padStart(2, '0')}</span>
            <svg viewBox="0 0 80 145" className="mx-auto h-28 w-16 drop-shadow-lg" aria-hidden="true">
              <ellipse cx="40" cy="76" rx="29" ry="62" fill="#102455" opacity="0.12" />
              <rect x="13" y="29" width="8" height="23" rx="3" fill="#101827" /><rect x="59" y="29" width="8" height="23" rx="3" fill="#101827" /><rect x="13" y="100" width="8" height="23" rx="3" fill="#101827" /><rect x="59" y="100" width="8" height="23" rx="3" fill="#101827" />
              <path d="M40 8C57 8 64 18 64 37V112Q64 135 40 138Q16 135 16 112V37Q16 8 40 8Z" fill="#ffffff" stroke="#c5ccd8" />
              <path d="M24 46Q40 39 56 46L54 98Q40 107 26 98Z" fill="#101827" /><path d="M24 43Q40 35 56 43L53 30Q40 25 27 30Z" fill="#344254" /><path d="M26 106Q40 113 54 106L52 122Q40 126 28 122Z" fill="#344254" />
              <path d="M24 20L34 17M46 17L56 20" stroke="#d9e5fa" strokeWidth="4" strokeLinecap="round" /><path d="M27 131H53" stroke="#e78181" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <span className="mt-2 block text-xs font-semibold">{onSelect ? selected ? 'Selected bay' : bay.selectable ? 'Choose bay' : 'Unavailable' : bay.label}</span>
            <span className={cn('mt-1 block text-[9px] leading-relaxed', selected ? 'text-white/80' : 'text-[#64748b]')}>{bay.note}</span>
            <span className={cn('mx-auto mt-3 grid size-6 place-items-center rounded-lg', selected ? 'bg-white/15' : 'bg-white')}><Zap className="size-3" /></span>
          </>
          const classes = cn('relative min-w-0 rounded-t-2xl rounded-b-lg border-x-2 border-t-2 px-2 pb-3 pt-8 text-center', selected ? 'border-volt bg-volt text-white' : 'border-white bg-white/35', !bay.selectable && onSelect && 'opacity-45')
          return onSelect ? <button key={bay.id} type="button" aria-label={`${bay.label}: ${bay.note}`} aria-pressed={selected} disabled={!bay.selectable} onClick={() => onSelect(bay.id)} className={cn(classes, 'transition hover:-translate-y-0.5')}>{content}</button> : <div key={bay.id} className={classes}>{content}</div>
        })}
      </div>
      <div className="mt-3 border-t-2 border-dashed border-white pt-2 text-center text-[9px] tracking-[0.22em] text-[#78869c]">VISITOR ACCESS</div>
    </div>
  )
}

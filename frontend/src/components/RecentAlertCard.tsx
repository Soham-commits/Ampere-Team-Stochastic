import { ArrowRight, type LucideIcon } from 'lucide-react'
import { AlertArtwork } from './AlertArtwork'
import { WidgetCard } from './WidgetCard'
import { cn } from '../lib/cn'

/** Keep event status separate from the site, payment/slot context and booking identity. */
export function RecentAlertCard({ to, title, detail, timestamp, bookingRef, context, artwork, icon: Icon, index, count }: {
  to: string
  title: string
  detail: string
  timestamp: string
  bookingRef: string
  context?: string
  artwork: 'payment' | 'confirmation' | 'charge' | 'update'
  icon: LucideIcon
  index: number
  count: number
}) {
  const featured = index === 0
  const wide = featured || (count % 2 === 0 && index === count - 1)
  return <WidgetCard to={to} tone={featured ? 'featured' : index % 2 ? 'soft' : 'white'} wide={wide} className={wide ? 'min-h-[190px]' : 'flex min-h-[285px] flex-col'}>
    <div className={cn('relative z-10', wide && 'max-w-[64%]')}>
      <div className="flex flex-wrap items-center gap-2">
        <span className={cn('grid size-8 shrink-0 place-items-center rounded-xl', featured ? 'bg-white/10 text-[#bfdbfe]' : 'bg-white text-[#3560cf]')}><Icon className="size-4" /></span>
        <span className={cn('text-[10px] leading-tight', featured ? 'text-[#c7d8ff]' : 'text-muted')}>{timestamp}</span>
      </div>
      <h3 className="mt-4 text-[17px] font-semibold leading-tight tracking-tight">{title}</h3>
      <p className={cn('mt-2 break-words text-xs font-medium leading-relaxed', featured ? 'text-[#c7d8ff]' : 'text-ink-2')}>{detail}</p>
      {context ? <p className={cn('mt-1 text-[11px] leading-relaxed', featured ? 'text-[#c7d8ff]' : 'text-ink-2')}>{context}</p> : null}
      <p className={cn('mt-1.5 break-all font-mono text-[9px] tracking-wide', featured ? 'text-[#afc5f2]' : 'text-muted')}>{bookingRef}</p>
    </div>
    <div className={cn('pointer-events-none', wide ? 'absolute right-0 top-1/2 w-[36%] -translate-y-1/2' : 'relative mt-auto w-full')}><AlertArtwork kind={artwork} /></div>
    <span className={cn('relative z-10 mt-4 inline-flex items-center gap-1.5 text-[10px] font-medium', featured ? 'text-[#bfdbfe]' : 'text-volt-strong')}>View booking <ArrowRight className="size-3.5 transition group-hover:translate-x-0.5" /></span>
  </WidgetCard>
}

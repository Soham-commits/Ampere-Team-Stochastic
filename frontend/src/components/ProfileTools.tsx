import { ArrowUpRight, CarFront, PlugZap, Route, Users, Wallet } from 'lucide-react'
import { WidgetCard } from './WidgetCard'
import { cn } from '../lib/cn'

type ToolArtwork = 'route' | 'savings' | 'society' | 'connections'

const PROFILE_TOOLS: { to: string; title: string; text: string; artwork: ToolArtwork; icon: typeof Route; wide?: boolean }[] = [
  { to: '/trip-planner', title: 'Plan a trip', text: 'A little planning. A longer drive.', artwork: 'route', icon: Route, wide: true },
  { to: '/savings', title: 'Your savings', text: 'See what each drive saves.', artwork: 'savings', icon: Wallet },
  { to: '/society', title: 'Society hub', text: 'Better charging, together.', artwork: 'society', icon: Users },
  { to: '/connections', title: 'Connections', text: 'Your car. Your fleet. In one place.', artwork: 'connections', icon: PlugZap, wide: true },
]

function ToolIllustration({ kind }: { kind: ToolArtwork }) {
  if (kind === 'route') return (
    <svg viewBox="0 0 160 125" className="h-full w-full" fill="none" aria-hidden="true">
      <path d="M-10 30h80l20 20h80M20 0v50l28 28v50M112 0v30l-25 25v70M-10 98h90l28-28h65" stroke="#fff" strokeOpacity=".1" strokeWidth="12" />
      <path d="M30 98h37c18 0 18-43 36-43h20" stroke="#93c5fd" strokeWidth="4" strokeLinecap="round" strokeDasharray="5 7" />
      <circle cx="30" cy="98" r="10" fill="#fff" fillOpacity=".15" /><circle cx="30" cy="98" r="4" fill="#fff" />
      <circle cx="124" cy="51" r="20" fill="#fff" fillOpacity=".12" />
      <path d="M124 34c-8 0-14 6-14 14 0 11 14 23 14 23s14-12 14-23c0-8-6-14-14-14Z" fill="#fff" />
      <path d="m126 40-7 10h6l-3 9 9-12h-6l1-7Z" fill="#3560cf" />
    </svg>
  )
  if (kind === 'savings') return (
    <div className="relative flex h-full items-end justify-center gap-2 px-3 pb-2" aria-hidden="true">
      {[32, 48, 42, 66, 85].map((height, i) => <span key={i} className="w-[13%] rounded-t-lg bg-[#3560cf]" style={{ height: `${height}%`, opacity: 0.2 + i * 0.18 }} />)}
      <span className="absolute left-1 top-0 grid size-10 place-items-center rounded-full border-[3px] border-white bg-[#dce8ff] text-lg font-semibold text-[#2345a1] shadow-sm">₹</span>
    </div>
  )
  if (kind === 'society') return (
    <div className="relative flex h-full items-center justify-center" aria-hidden="true">
      <span className="absolute size-[88px] rounded-full border border-dashed border-[#b8cdf6]" />
      <span className="absolute size-[62px] rounded-full bg-[#edf3ff]" />
      <span className="absolute left-[12%] top-2 grid size-10 place-items-center rounded-full border-[3px] border-white bg-[#bfd3ff] text-xs font-semibold text-[#2345a1]">A</span>
      <span className="absolute right-[10%] top-7 grid size-12 place-items-center rounded-full border-[3px] border-white bg-[#2345a1] text-sm font-semibold text-white">M</span>
      <span className="absolute bottom-0 left-[25%] grid size-11 place-items-center rounded-full border-[3px] border-white bg-[#e0eaff] text-xs font-semibold text-[#2345a1]">R</span>
    </div>
  )
  return (
    <div className="relative flex h-full items-center justify-center" aria-hidden="true">
      <span className="absolute h-px w-full bg-[#bfd3ff]" />
      <span className="absolute size-[88px] rounded-full border border-[#d8e5ff]" />
      <span className="relative mr-8 grid size-14 place-items-center rounded-[20px] border border-white bg-white text-[#2345a1] shadow-sm"><CarFront className="size-7" /></span>
      <span className="absolute right-0 top-1 grid size-10 place-items-center rounded-full border-[3px] border-[#f1f5ff] bg-[#3560cf] text-white"><PlugZap className="size-4" /></span>
    </div>
  )
}

export function ProfileTools() {
  return (
    <section aria-label="More with Ampere" className="mt-9">
      <div className="mb-4">
        <h2 className="text-xl font-semibold tracking-tight">More with Ampere</h2>
        <p className="mt-1 text-xs text-ink-2">A little more for every electric mile.</p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {PROFILE_TOOLS.map(({ to, title, text, artwork, icon: Icon, wide }) => {
          const featured = artwork === 'route'
          return (
            <WidgetCard key={to} to={to} wide={!!wide} tone={featured ? 'featured' : artwork === 'society' ? 'white' : 'soft'} className={wide ? 'flex min-h-[160px] items-center gap-3' : 'flex min-h-[226px] flex-col'}>
              <div className={cn('relative z-10 min-w-0', wide ? 'w-[62%]' : 'flex flex-1 flex-col')}>
                <span className={cn('mb-4 grid size-8 place-items-center rounded-xl', featured ? 'bg-white/10 text-[#bfdbfe]' : 'bg-white text-[#3560cf]')}><Icon className="size-4" /></span>
                <h3 className="text-[17px] font-semibold leading-tight tracking-tight sm:text-lg">{title}</h3>
                <p className={cn('mt-2 max-w-[22ch] text-[11px] leading-relaxed sm:text-xs', featured ? 'text-[#c7d8ff]' : 'text-ink-2')}>{text}</p>
              </div>
              <div className={cn('pointer-events-none', wide ? 'absolute bottom-0 right-2 top-3 w-[42%]' : 'relative mt-5 h-[92px] w-full')}><ToolIllustration kind={artwork} /></div>
              <span className={cn('absolute right-3 top-3 grid size-7 place-items-center rounded-full transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5', featured ? 'bg-white/10 text-white' : 'text-[#3560cf]')}><ArrowUpRight className="size-3.5" /></span>
            </WidgetCard>
          )
        })}
      </div>
    </section>
  )
}

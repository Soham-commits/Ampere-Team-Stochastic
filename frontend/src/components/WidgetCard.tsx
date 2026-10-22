import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '../lib/cn'

/** Shared visual frame for profile tools and recent booking alerts. */
export function WidgetCard({ to, tone, wide, className, children }: {
  to: string
  tone: 'featured' | 'soft' | 'white'
  wide: boolean
  className?: string
  children: ReactNode
}) {
  return <Link to={to} className={cn(
    'group relative isolate min-w-0 overflow-hidden rounded-[1.75rem] border p-4 transition duration-200 hover:-translate-y-0.5 hover:shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-volt focus-visible:ring-offset-4 active:scale-[0.98] motion-reduce:transform-none sm:p-5',
    wide && 'col-span-2',
    tone === 'featured' ? 'border-[#2345a1] bg-[#102455] text-white' : tone === 'white' ? 'border-line bg-white text-ink' : 'border-[#e0e9fa] bg-[#f1f5ff] text-ink',
    className,
  )}>{children}</Link>
}

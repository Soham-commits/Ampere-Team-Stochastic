import { ArrowUpRight, Cable, Route, Users, Wallet } from 'lucide-react'
import { Link } from 'react-router-dom'

const PROFILE_TOOLS = [
  { to: '/trip-planner', title: 'Plan a trip', text: 'Find your charging stops', icon: Route },
  { to: '/savings', title: 'Your savings', text: 'Compare the cost of driving', icon: Wallet },
  { to: '/society', title: 'Society hub', text: 'Learn from fellow drivers', icon: Users },
  { to: '/connections', title: 'Connections', text: 'Explore car & fleet sync', icon: Cable },
]
export function ProfileTools() {
  return (
    <section aria-label="More with Ampere" className="mt-7">
      <h2 className="mb-3 text-lg font-semibold">More with Ampere</h2>
      <div className="grid grid-cols-2 gap-3">
        {PROFILE_TOOLS.map(({ to, title, text, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="flex min-w-0 flex-col rounded-[1.75rem] border border-line bg-surface-2 p-4 transition hover:shadow-soft"
          >
            <span className="flex items-center justify-between text-volt">
              <Icon className="size-5" />
              <ArrowUpRight className="size-4" />
            </span>
            <h3 className="mt-5 text-sm font-semibold">{title}</h3>
            <p className="mt-1 text-xs leading-relaxed text-ink-2">{text}</p>
          </Link>
        ))}
      </div>
    </section>
  )
}

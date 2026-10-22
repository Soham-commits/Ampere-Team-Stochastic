import { Bell, CalendarDays, ChevronLeft, House, Inbox, LayoutGrid, ListChecks, Map as MapIcon, Search, Settings, Store, Terminal, UserRound, Wallet } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import type { User } from '../domain/types'
import { cn } from '../lib/cn'
import { useNotifications } from '../app/notifications'
import { IconButton } from './ui'

export function Logo({ className, dark }: { className?: string; dark?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2 font-semibold tracking-tight', className)}>
      <svg viewBox="0 0 512 512" className="size-8" aria-hidden>
        <rect width="512" height="512" rx="120" fill={dark ? '#fff' : '#0e0f0e'} />
        <g fill="none" stroke={dark ? '#d8dad4' : '#3a3d39'} strokeWidth="10">
          <rect x="176" y="96" width="160" height="320" rx="72" />
        </g>
        <path d="M276 104 172 284h78l-22 124 112-188h-80z" fill="#3560cf" />
      </svg>
      <span className="text-xl">Ampere</span>
    </span>
  )
}

export type Role = 'driver' | 'host' | 'admin' | 'jury'

export function primaryRole(u: User): Role {
  if (u.capabilities.includes('JURY')) return 'jury'
  if (u.capabilities.includes('ADMIN')) return 'admin'
  if (u.capabilities.includes('HOST')) return 'host'
  return 'driver'
}

export function homePath(u: User) {
  return { driver: '/home', host: '/host', admin: '/admin', jury: '/jury' }[primaryRole(u)]
}

interface NavItem {
  to: string
  label: string
  icon: ReactNode
  end?: boolean
}

function navFor(u: User): { items: NavItem[]; fab: NavItem } {
  const role = primaryRole(u)
  if (role === 'host')
    return {
      items: [
        { to: '/host', label: 'Requests', icon: <LayoutGrid className="size-5" />, end: true },
        { to: '/host/listings', label: 'Listings', icon: <Store className="size-5" /> },
        { to: '/host/earnings', label: 'Earnings', icon: <Wallet className="size-5" /> },
      ],
      fab: { to: '/discover', label: 'Find a charger', icon: <Search className="size-5" /> },
    }
  if (role === 'admin')
    return {
      items: [
        { to: '/admin', label: 'Queue', icon: <ListChecks className="size-5" />, end: true },
        { to: '/bookings', label: 'Bookings', icon: <CalendarDays className="size-5" /> },
      ],
      fab: { to: '/inbox', label: 'Inbox', icon: <Inbox className="size-5" /> },
    }
  if (role === 'jury')
    return {
      items: [
        { to: '/jury', label: 'Console', icon: <Terminal className="size-5" /> },
        { to: '/discover', label: 'Stations', icon: <MapIcon className="size-5" /> },
        { to: '/bookings', label: 'Bookings', icon: <CalendarDays className="size-5" /> },
      ],
      fab: { to: '/discover?view=list', label: 'Find a charger', icon: <Search className="size-5" /> },
    }
  return {
    items: [
      { to: '/home', label: 'Home', icon: <House className="size-5" /> },
      { to: '/discover', label: 'Stations', icon: <MapIcon className="size-5" /> },
      { to: '/bookings', label: 'Bookings', icon: <CalendarDays className="size-5" /> },
    ],
    fab: { to: '/discover?view=list', label: 'Find a charger', icon: <Search className="size-5" /> },
  }
}

export function Shell({ user, children }: { user: User; children: ReactNode }) {
  const { pathname } = useLocation()
  const { items } = navFor(user)
  const dark = pathname.startsWith('/discover') || pathname.startsWith('/jury')
  const { unread } = useNotifications(user)
  return (
    <div className="min-h-dvh lg:pl-[272px]">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[272px] flex-col overflow-y-auto border-r border-line bg-surface px-5 py-6 lg:flex">
        <Link to={homePath(user)} className="px-2">
          <Logo />
        </Link>
        <nav className="mt-8 flex flex-col gap-1" aria-label="Main">
          {items.map((it) => (
            <NavLink key={it.to} to={it.to} end={it.end} className={({ isActive }) => cn('flex h-12 items-center gap-3 rounded-2xl px-4 text-[15px] font-semibold transition', isActive ? 'bg-volt text-white' : 'text-ink-2 hover:bg-surface-2')}>
              {it.icon}
              {it.label}
            </NavLink>
          ))}
          {primaryRole(user) !== 'driver' && user.capabilities.includes('DRIVER') && primaryRole(user) !== 'jury' ? (
            <NavLink to="/bookings" className={({ isActive }) => cn('flex h-12 items-center gap-3 rounded-2xl px-4 text-[15px] font-semibold transition', isActive ? 'bg-volt text-white' : 'text-ink-2 hover:bg-surface-2')}>
              <CalendarDays className="size-5" />
              My bookings
            </NavLink>
          ) : null}
        </nav>
        <div className="my-5 h-px bg-line" />
        <nav className="flex flex-col gap-1" aria-label="Secondary">
          <NavLink to="/inbox" className={({ isActive }) => cn('flex h-11 items-center gap-3 rounded-2xl px-4 text-sm font-semibold', isActive ? 'bg-surface-2 text-ink' : 'text-ink-2 hover:bg-surface-2')}>
            <Bell className="size-4.5" /> Inbox {unread ? <span className="ml-auto rounded-full bg-amber px-2 text-xs text-white">{unread}</span> : null}
          </NavLink>
          <NavLink to="/settings" className={({ isActive }) => cn('flex h-11 items-center gap-3 rounded-2xl px-4 text-sm font-semibold', isActive ? 'bg-surface-2 text-ink' : 'text-ink-2 hover:bg-surface-2')}>
            <Settings className="size-4.5" /> Profile & settings
          </NavLink>
          {primaryRole(user) === 'admin' ? (
            <NavLink to="/jury" className={({ isActive }) => cn('flex h-11 items-center gap-3 rounded-2xl px-4 text-sm font-semibold', isActive ? 'bg-surface-2 text-ink' : 'text-ink-2 hover:bg-surface-2')}>
              <Terminal className="size-4.5" /> Diagnostics console
            </NavLink>
          ) : null}
        </nav>
        <div className="mt-auto rounded-3xl bg-surface-2 p-3">
          <div className="flex items-center gap-3">
            <Avatar user={user} />
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{user.display_name}</div>
              <div className="truncate text-xs text-muted">{user.blurb}</div>
            </div>
          </div>
          <Link to="/signin" className="mt-3 flex h-9 items-center justify-center rounded-full bg-surface text-xs font-semibold text-ink-2 shadow-soft hover:text-ink">
            Switch account
          </Link>
        </div>
      </aside>

      <main className={cn('mx-auto w-full', !dark && 'max-w-6xl')}>{children}</main>

      {/* Mobile floating nav */}
      <div className="bottom-safe pointer-events-none fixed inset-x-0 z-[900] flex items-center justify-center gap-3 bg-transparent px-4 lg:hidden">
        <nav aria-label="Main" className={cn('pointer-events-auto isolate flex flex-1 items-center gap-1 overflow-hidden rounded-full p-1.5 shadow-float backdrop-blur-xl sm:max-w-md', dark ? 'bg-night-2/90' : 'bg-surface/90')}>
          {items.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              end={it.end}
              aria-label={it.label}
              className={({ isActive }) =>
                cn(
                  'flex h-12 items-center justify-center gap-2 rounded-full text-sm font-semibold transition-all duration-300',
                  isActive ? (dark ? 'flex-[1.8] bg-surface text-ink' : 'flex-[1.8] bg-volt text-white') : dark ? 'flex-1 text-white/70 hover:text-white' : 'flex-1 text-ink-2 hover:text-ink',
                )
              }
            >
              {({ isActive }) => (
                <>
                  {it.icon}
                  {isActive ? <span>{it.label}</span> : null}
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <Link to="/settings" aria-label="Profile and settings" className={cn('pointer-events-auto grid size-[60px] shrink-0 place-items-center rounded-full shadow-float transition active:scale-95', dark ? 'bg-surface text-ink' : 'bg-volt text-white')}>
          <UserRound className="size-5" />
        </Link>
      </div>
    </div>
  )
}

export function Avatar({ user, className }: { user: User; className?: string }) {
  return (
    <span className={cn('grid size-11 shrink-0 place-items-center rounded-full text-sm font-bold text-white', className)} style={{ background: 'linear-gradient(135deg, #4b73db, #2345a1)' }} aria-hidden>
      {user.initials}
    </span>
  )
}

/** Page header with optional back button and the bell/settings pair from the references. */
export function PageHeader({ title, subtitle, back, actions, user, className }: { title?: ReactNode; subtitle?: ReactNode; back?: boolean | string; actions?: ReactNode; user?: User; className?: string }) {
  const nav = useNavigate()
  const { unread } = useNotifications(user ?? null)
  return (
    <header className={cn('pt-safe flex items-center gap-3 px-4 pb-2 pt-4 sm:px-6 lg:pt-8', className)}>
      {back ? (
        <IconButton label="Back" onClick={() => (typeof back === 'string' ? nav(back) : window.history.length > 1 ? nav(-1) : nav('/'))}>
          <ChevronLeft className="size-5" />
        </IconButton>
      ) : user ? (
        <Link to="/settings" className="lg:hidden" aria-label="Account and settings">
          <Avatar user={user} />
        </Link>
      ) : null}
      <div className="min-w-0 flex-1">
        {title ? <h1 className={cn('truncate text-xl font-semibold tracking-tight', back && 'text-center lg:text-left')}>{title}</h1> : null}
        {subtitle ? <div className={cn('truncate text-sm text-muted', back && 'text-center lg:text-left')}>{subtitle}</div> : null}
      </div>
      {actions}
      {user ? (
        <div className="flex gap-2 lg:hidden">
          <Link to="/inbox" aria-label="Notifications">
            <IconButton label="Notifications" dot={unread > 0} tabIndex={-1}>
              <Bell className="size-[18px]" />
            </IconButton>
          </Link>
          <Link to="/settings" aria-label="Settings">
            <IconButton label="Settings" tabIndex={-1}>
              <Settings className="size-[18px]" />
            </IconButton>
          </Link>
        </div>
      ) : back ? (
        <span className="size-11 lg:hidden" />
      ) : null}
    </header>
  )
}

export function Page({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('px-4 pb-44 sm:px-6 lg:pb-12', className)}>{children}</div>
}

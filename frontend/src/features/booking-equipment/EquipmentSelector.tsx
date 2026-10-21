import { Cable, Plug } from 'lucide-react'
import type { EquipmentChoice } from '../../domain/equipment'
import { cn } from '../../lib/cn'

export function EquipmentSelector({
  value,
  onChange,
  available,
  disabled,
}: {
  value: EquipmentChoice | null
  onChange: (choice: EquipmentChoice) => void
  available: EquipmentChoice[]
  disabled?: boolean
}) {
  const options = [
    { value: 'HOST_CABLE' as const, label: 'Host cable', icon: Cable },
    { value: 'SOCKET_ONLY' as const, label: 'Socket only', icon: Plug },
  ]
  return (
    <div
      role="radiogroup"
      aria-label="Charging equipment arrangement"
      className="relative isolate grid grid-cols-2 rounded-full bg-surface-2 p-1.5"
    >
      {value ? (
        <span
          aria-hidden
          className={cn(
            'pointer-events-none absolute bottom-1.5 left-1.5 top-1.5 -z-10 w-[calc(50%-6px)] rounded-full bg-volt-strong transition-transform duration-300 ease-out motion-reduce:transition-none',
            value === 'SOCKET_ONLY' && 'translate-x-full',
          )}
        />
      ) : null}
      {options.map(({ value: choice, label, icon: Icon }) => (
        <button
          key={choice}
          type="button"
          role="radio"
          aria-checked={value === choice}
          disabled={disabled || !available.includes(choice)}
          tabIndex={(value ?? available[0]) === choice ? 0 : -1}
          onClick={() => onChange(choice)}
          onKeyDown={(event) => {
            if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
              event.preventDefault()
              const next = event.key === 'ArrowRight' || event.key === 'End' ? 'SOCKET_ONLY' : 'HOST_CABLE'
              if (available.includes(next)) {
                onChange(next)
                event.currentTarget.parentElement
                  ?.querySelectorAll<HTMLButtonElement>('[role="radio"]')
                  [next === 'HOST_CABLE' ? 0 : 1]?.focus()
              }
            }
          }}
          className={cn(
            'flex min-h-12 min-w-0 items-center justify-center gap-2 rounded-full px-2 text-sm font-semibold transition-colors disabled:opacity-40',
            value === choice ? 'text-white' : 'text-ink-2',
          )}
        >
          <Icon className="size-4 shrink-0" />
          {label}
        </button>
      ))}
    </div>
  )
}

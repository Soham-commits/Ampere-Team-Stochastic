import { Sun } from 'lucide-react'
import { SOLAR_SITE_IDS } from './fixtures'

export function SolarBadge({ siteId }: { siteId: string }) {
  if (!SOLAR_SITE_IDS.has(siteId)) return null
  return (
    <span
      title="Sample solar-assisted charger; generation and energy mix are simulated."
      className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-800"
    >
      <Sun className="size-3.5" />
      Solar assisted · demo
    </span>
  )
}

import { useQuery } from '../../app/hooks'
import { MIT_WPU_ORIGIN } from '../../domain/mockLocation'
import type { ConnectorStandard, SiteType } from '../../domain/types'
import { api } from '../../server/api'

interface BookableChargerInputs {
  modelId?: string
  soc?: number | null
  connector?: ConnectorStandard
  siteType?: SiteType
}

/** Expand nearby search by 1 km per battery point; vehicle range remains a separate hard limit. */
export function useBookableChargers({ modelId, soc, connector, siteType }: BookableChargerInputs) {
  return useQuery(
    () => modelId && soc != null
      ? api.searchChargers({ origin: MIT_WPU_ORIGIN, model_id: modelId, soc, connector, site_type: siteType, radius_km: soc, bookable_only: true })
      : Promise.resolve({ ok: false as const, error: { code: 'INPUT_REQUIRED', message: 'Choose a car and battery level first.' }, request_id: '' }),
    [modelId, soc, connector, siteType],
  )
}

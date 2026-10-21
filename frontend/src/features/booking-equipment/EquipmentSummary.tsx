import { Cable } from 'lucide-react'
import { Card } from '../../components/ui'
import type { BookingState } from '../../domain/booking'
import { EQUIPMENT_LABELS } from '../../domain/equipment'

export function EquipmentSummary({ state }: { state: BookingState }) {
  return (
    <Card className="border border-line">
      <h2 className="flex items-center gap-2 text-base font-semibold">
        <Cable className="size-5 text-volt" />
        Charging equipment
      </h2>
      <dl className="mt-4 space-y-3 text-sm">
        <div>
          <dt className="text-xs text-muted">Driver requested</dt>
          <dd className="mt-1">
            {state.request.equipment_choice ? EQUIPMENT_LABELS[state.request.equipment_choice] : 'Not recorded for this earlier booking'}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Host confirmation{state.equipment_confirmation_simulated ? ' · jury simulation' : ''}</dt>
          <dd className="mt-1">
            {state.equipment_confirmed
              ? EQUIPMENT_LABELS[state.equipment_confirmed]
              : state.lifecycle === 'requested'
                ? 'Waiting for host confirmation'
                : 'No equipment confirmation recorded'}
          </dd>
        </div>
      </dl>
    </Card>
  )
}

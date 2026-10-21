import { useEffect, useState } from 'react'
import { Cable, Plug } from 'lucide-react'
import { Button, Sheet } from '../../components/ui'
import { EQUIPMENT_LABELS, type EquipmentChoice } from '../../domain/equipment'
import type { ChargingMode } from '../../domain/types'
import { EquipmentSelector } from './EquipmentSelector'

export function EquipmentConfirmationSheet({
  open,
  onClose,
  role,
  requested,
  mode,
  equipmentOptions,
  busy,
  canConfirm = true,
  onConfirm,
}: {
  open: boolean
  onClose: () => void
  role: 'driver' | 'host'
  requested?: EquipmentChoice
  mode: ChargingMode
  equipmentOptions?: EquipmentChoice[]
  busy: boolean
  canConfirm?: boolean
  onConfirm: (choice: EquipmentChoice) => void | Promise<void>
}) {
  const [choice, setChoice] = useState<EquipmentChoice | null>(null)
  const [acknowledged, setAcknowledged] = useState(false)
  useEffect(() => {
    if (open) {
      setChoice(null)
      setAcknowledged(false)
    }
  }, [open, requested, mode])
  const available = equipmentOptions ?? ['HOST_CABLE']
  const mismatch = role === 'host' && !!requested && !!choice && requested !== choice
  return (
    <Sheet
      open={open}
      onClose={() => {
        if (!busy) onClose()
      }}
      title={role === 'driver' ? 'Who brings the cable?' : 'Confirm charging equipment'}
    >
      <p className="mb-5 text-sm leading-relaxed text-ink-2">
        {role === 'driver'
          ? 'Choose what you need for this slot. Your host must confirm the same arrangement before the booking is accepted.'
          : requested
            ? `Driver requested: ${EQUIPMENT_LABELS[requested]}. Choose what you can provide for this slot.`
            : 'This earlier booking has no cable preference recorded. Confirm what you will provide for the driver.'}
      </p>
      <EquipmentSelector
        value={choice}
        onChange={(next) => {
          setChoice(next)
          setAcknowledged(false)
        }}
        available={available}
        disabled={busy}
      />
      <div aria-live="polite" className="mt-5 min-h-24 rounded-3xl border border-line p-4 text-sm leading-relaxed text-ink-2">
        {choice === 'HOST_CABLE' ? (
          <>
            <Cable className="mb-2 size-5 text-volt" />
            {role === 'driver'
              ? 'The host supplies a charging cable compatible with the booked connector and your car.'
              : 'You will supply the charging cable compatible with this booking’s connector and the driver’s car.'}
          </>
        ) : choice === 'SOCKET_ONLY' ? (
          <>
            <Plug className="mb-2 size-5 text-volt" />
            {role === 'driver'
              ? 'You bring your compatible cable or portable EV charging equipment. The host supplies the booked charging socket.'
              : 'You provide the booked charging socket. The driver brings compatible charging equipment.'}
          </>
        ) : (
          'Select an option above to review who supplies the equipment.'
        )}
      </div>
      {mode === 'DC' ? (
        <p className="mt-3 text-xs text-muted">DC charging uses the station’s cable. Socket-only is unavailable.</p>
      ) : available.length === 1 ? (
        <p className="mt-3 text-xs text-muted">
          This bay has a tethered host cable. Choose a socket-equipped bay if you want to bring your own equipment.
        </p>
      ) : (
        <p className="mt-3 text-xs leading-relaxed text-muted">
          This choice does not change the booked connector or power rating. An ordinary household socket is not a substitute for the listed
          charging point.
        </p>
      )}
      {mismatch ? (
        <p role="alert" className="mt-4 text-sm text-danger">
          This differs from the driver’s request. Confirm their chosen arrangement or decline the booking so they can choose another
          charger.
        </p>
      ) : null}
      <label className="mt-5 flex items-start gap-3 text-sm leading-relaxed">
        <input
          type="checkbox"
          checked={acknowledged}
          disabled={!choice || busy || mismatch}
          onChange={(event) => setAcknowledged(event.target.checked)}
          className="mt-1 size-5 shrink-0 accent-[#2345a1]"
        />
        <span>
          {role === 'driver'
            ? 'I understand which equipment I need to bring and will use equipment compatible with this charger and my car.'
            : 'I confirm I can provide the selected equipment at the booked charging point.'}
        </span>
      </label>
      {!canConfirm ? (
        <p role="alert" className="mt-4 text-sm text-amber">
          This quote or request is no longer available. Close this panel and refresh the booking details.
        </p>
      ) : null}
      <Button
        className="mt-6 w-full"
        loading={busy}
        disabled={!choice || !available.includes(choice) || !acknowledged || mismatch || !canConfirm || busy}
        onClick={() => {
          if (choice) void onConfirm(choice)
        }}
      >
        {role === 'driver' ? 'Confirm & request slot' : 'Confirm & accept booking'}
      </Button>
    </Sheet>
  )
}

import type { Connector } from './types'
/** Cable ownership does not change the quoted connector, charging mode or power. */
export type EquipmentChoice = 'HOST_CABLE' | 'SOCKET_ONLY'
export const EQUIPMENT_LABELS: Record<EquipmentChoice, string> = {
  HOST_CABLE: 'Host provides the cable',
  SOCKET_ONLY: 'Socket only · driver brings compatible equipment',
}
export function isEquipmentChoice(value: unknown): value is EquipmentChoice {
  return value === 'HOST_CABLE' || value === 'SOCKET_ONLY'
}

export function equipmentOptions(connector: Pick<Connector, 'mode' | 'cable'>): EquipmentChoice[] {
  if (connector.mode === 'DC' || connector.cable === 'HOST_TETHERED') return ['HOST_CABLE']
  return connector.cable === 'DRIVER_REQUIRED' ? ['SOCKET_ONLY'] : ['HOST_CABLE', 'SOCKET_ONLY']
}

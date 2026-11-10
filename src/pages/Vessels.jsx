import { useNavigate } from 'react-router-dom'
import ResourcePage from '../components/ResourcePage'
import { Badge, Progress } from '../components/ui'
import { useData } from '../api/hooks'
import { useLookups } from '../context/LookupContext'
import { VESSEL_STATUS, VESSEL_TYPES, TRADING_AREAS, RANKS } from '../config/constants'

export const VESSEL_FIELDS = [
  { name: 'name', label: 'Vessel name', required: true },
  { name: 'imo', label: 'IMO number', required: true, hint: '7 digits' },
  { name: 'type', label: 'Vessel type', type: 'select', options: VESSEL_TYPES, required: true },
  { name: 'flag', label: 'Flag', required: true },
  { name: 'owner', label: 'Owner' },
  { name: 'clientId', label: 'Ship manager / client', type: 'client', effect: (v, refs) => ({ manager: refs.clients.find((c) => c.id === v.clientId)?.name || '' }) },
  { name: 'grt', label: 'Gross tonnage (GT)', type: 'number' },
  { name: 'dwt', label: 'Deadweight (DWT)', type: 'number' },
  { name: 'built', label: 'Year built' },
  { name: 'tradingArea', label: 'Trading area', type: 'select', options: TRADING_AREAS },
  { name: 'status', label: 'Operational status', type: 'select', options: VESSEL_STATUS, default: 'In Service' },
]

export const DEFAULT_MANNING = RANKS.flatMap((d) => d.ranks).filter((r) => !r.includes('Cadet') && r !== 'Second Cook' && r !== 'Messman').map((rank) => ({ rank, required: ['Able Seaman'].includes(rank) ? 3 : rank === 'Oiler' ? 2 : 1 }))

export default function Vessels() {
  const nav = useNavigate()
  const { assignments } = useData('assignments')
  const { clientName } = useLookups()
  const onboard = (id) => assignments.filter((a) => a.vesselId === id && a.status === 'Onboard').length
  const req = (v) => (v.manning || []).reduce((s, r) => s + Number(r.required || 0), 0)
  return (
    <ResourcePage resource="vessels" module="vessels" title="Vessel Management" subtitle="Vessel master, manning requirements, documents and crew history."
      createLabel="Add Vessel" formTitle="New vessel" exportTitle="Vessel Master" fields={VESSEL_FIELDS} onRowClick={(r) => nav(`/vessels/${r.id}`)}
      beforeSave={(v, isEdit) => (isEdit ? v : { ...v, manning: DEFAULT_MANNING, documents: [] })}
      validate={(v) => (!/^\d{7}$/.test(String(v.imo)) ? 'IMO number must be 7 digits' : null)}
      filters={[{ key: 'type', label: 'Type', options: VESSEL_TYPES }, { key: 'status', label: 'Status', options: VESSEL_STATUS }, { key: 'flag', label: 'Flag', options: ['Panama', 'Liberia', 'Marshall Islands', 'Singapore', 'India', 'Malta', 'Bahamas', 'Hong Kong'] }]}
      columns={[
        { key: 'name', label: 'Vessel', render: (r) => <><strong>{r.name}</strong><br /><small className="muted">IMO {r.imo}</small></> },
        { key: 'type', label: 'Type' },
        { key: 'flag', label: 'Flag' },
        { key: 'clientId', label: 'Manager / client', exportValue: (r) => clientName(r.clientId), render: (r) => clientName(r.clientId) },
        { key: 'grt', label: 'GT', align: 'right', render: (r) => Number(r.grt || 0).toLocaleString() },
        { key: 'dwt', label: 'DWT', align: 'right', render: (r) => Number(r.dwt || 0).toLocaleString() },
        { key: 'tradingArea', label: 'Trading' },
        { key: 'manning', label: 'Manning', exportValue: (r) => `${onboard(r.id)}/${req(r)}`, sortValue: (r) => onboard(r.id) / (req(r) || 1), render: (r) => <div style={{ minWidth: 120 }}><small>{onboard(r.id)} / {req(r)}</small><Progress value={onboard(r.id)} max={req(r)} /></div> },
        { key: 'status', label: 'Status', render: (r) => <Badge>{r.status}</Badge> },
      ]} />
  )
}

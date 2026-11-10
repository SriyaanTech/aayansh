import ResourcePage from '../components/ResourcePage'
import { Badge, Stat } from '../components/ui'
import { CrewCell, useLookups } from '../context/LookupContext'
import { MEDICAL_STATUS } from '../config/constants'
import { expiryStatus, fmtDate, daysUntil } from '../utils/format'
import { useData } from '../api/hooks'
import { HeartPulse, AlertTriangle, CheckCircle2 } from 'lucide-react'

export const MED_FIELDS = [
  { name: 'crewId', label: 'Seafarer', type: 'crew', required: true, span: 2 },
  { name: 'status', label: 'Fitness status', type: 'select', options: MEDICAL_STATUS, required: true, default: 'Fit' },
  { name: 'examDate', label: 'Examination date', type: 'date', required: true },
  { name: 'expiryDate', label: 'Expiry date', type: 'date', required: true },
  { name: 'centre', label: 'Medical centre', required: true },
  { name: 'doctor', label: 'Examining doctor' },
  { name: 'fileName', label: 'Medical certificate', type: 'file', urlField: 'fileUrl', span: 2 },
  { name: 'restrictions', label: 'Medical restrictions', type: 'textarea', span: 3 },
  { name: 'remarks', label: 'Medical history / remarks', type: 'textarea', span: 3 },
]

export function useMedColumns({ showCrew = true } = {}) {
  const { crewName } = useLookups()
  return [
    ...(showCrew ? [{ key: 'crewId', label: 'Seafarer', render: (r) => <CrewCell id={r.crewId} />, exportValue: (r) => `${r.crewId} ${crewName(r.crewId)}` }] : []),
    { key: 'examDate', label: 'Exam date', render: (r) => fmtDate(r.examDate) },
    { key: 'expiryDate', label: 'Expiry', render: (r) => fmtDate(r.expiryDate) },
    { key: 'alert', label: 'Renewal alert', sortValue: (r) => daysUntil(r.expiryDate), exportValue: (r) => expiryStatus(r.expiryDate).label, render: (r) => { const e = expiryStatus(r.expiryDate); return <Badge tone={e.tone}>{e.label}</Badge> } },
    { key: 'centre', label: 'Medical centre' },
    { key: 'doctor', label: 'Doctor' },
    { key: 'status', label: 'Fitness', render: (r) => <Badge>{r.status}</Badge> },
    { key: 'restrictions', label: 'Restrictions' },
  ]
}

export default function Medical() {
  const columns = useMedColumns()
  const { medicals } = useData('medicals')
  return (
    <ResourcePage resource="medicals" module="medical" title="Medical & Fitness" subtitle="Medical examinations, fitness status, restrictions and renewal alerts."
      createLabel="Add Medical Record" formTitle="New medical record" exportTitle="Medical Expiry" columns={columns} fields={MED_FIELDS}
      filters={[
        { key: 'status', label: 'Fitness', options: MEDICAL_STATUS },
        { key: 'exp', label: 'Expiry', options: [{ value: 'expired', label: 'Expired' }, { value: '30', label: '≤ 30 days' }, { value: '60', label: '≤ 60 days' }, { value: '90', label: '≤ 90 days' }], test: (r, v) => { const d = daysUntil(r.expiryDate); return v === 'expired' ? d < 0 : d >= 0 && d <= Number(v) } },
      ]}>
      <div className="stats">
        <Stat label="Fit" value={medicals.filter((m) => m.status === 'Fit').length} icon={CheckCircle2} tone="green" />
        <Stat label="Temporarily unfit" value={medicals.filter((m) => m.status === 'Temporarily Unfit').length} icon={HeartPulse} tone="amber" />
        <Stat label="Unfit" value={medicals.filter((m) => m.status === 'Unfit').length} icon={AlertTriangle} tone="red" />
        <Stat label="Expiring ≤ 60 days" value={medicals.filter((m) => { const d = daysUntil(m.expiryDate); return d >= 0 && d <= 60 }).length} icon={HeartPulse} tone="amber" />
        <Stat label="Expired" value={medicals.filter((m) => daysUntil(m.expiryDate) < 0).length} icon={AlertTriangle} tone="red" />
      </div>
    </ResourcePage>
  )
}

import { FileDown, Check, RefreshCw, PenLine, FileSignature, AlertTriangle, Clock } from 'lucide-react'
import ResourcePage from '../components/ResourcePage'
import { Badge, Stat, useToast } from '../components/ui'
import { CrewCell, VesselCell, useLookups } from '../context/LookupContext'
import { ALL_RANKS, APPROVAL, CONTRACT_STATUS, CURRENCIES } from '../config/constants'
import { fmtDate, money, daysUntil, expiryStatus, addDays } from '../utils/format'
import { useData } from '../api/hooks'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { contractPDF } from '../utils/documents'

const monthsBetween = (a, b) => (a && b ? Math.max(0, Math.round((new Date(b) - new Date(a)) / (30.44 * 86400000))) : '')

export const CONTRACT_FIELDS = [
  { type: 'section', label: 'Crew & vessel' },
  { name: 'crewId', label: 'Seafarer', type: 'crew', required: true, span: 2, effect: (v, refs) => ({ rank: refs.crew.find((c) => c.id === v.crewId)?.rank || v.rank }) },
  { name: 'vesselId', label: 'Vessel', type: 'vessel', required: true },
  { name: 'rank', label: 'Rank', type: 'select', options: ALL_RANKS, required: true },
  { name: 'startDate', label: 'Start date', type: 'date', required: true, effect: (v) => ({ durationMonths: monthsBetween(v.startDate, v.endDate) }) },
  { name: 'endDate', label: 'End date', type: 'date', required: true, effect: (v) => ({ durationMonths: monthsBetween(v.startDate, v.endDate) }) },
  { name: 'durationMonths', label: 'Duration (months)', type: 'number', disabled: true },
  { name: 'cba', label: 'CBA', type: 'select', options: ['ITF', 'IBF', 'Company CBA', 'None'] },
  { name: 'currency', label: 'Currency', type: 'select', options: CURRENCIES, default: 'USD' },
  { type: 'section', label: 'Salary structure (monthly)' },
  { name: 'basicWage', label: 'Basic wage', type: 'number', required: true },
  { name: 'fixedOT', label: 'Fixed overtime', type: 'number' },
  { name: 'leavePay', label: 'Leave pay', type: 'number' },
  { name: 'otherAllowance', label: 'Other allowance', type: 'number' },
  { type: 'section', label: 'Terms & approval' },
  { name: 'terms', label: 'Employment terms & conditions', type: 'textarea', span: 3, rows: 4, default: 'As per MLC 2006 and applicable CBA. Repatriation at company cost on completion of contract.' },
  { name: 'status', label: 'Contract status', type: 'select', options: CONTRACT_STATUS, default: 'Draft' },
  { name: 'approval', label: 'Approval', type: 'select', options: APPROVAL, default: 'Pending' },
  { name: 'signed', label: 'Digital signature', type: 'checkbox', checkLabel: 'Signed by seafarer' },
  { name: 'amendmentNote', label: 'Amendment note', type: 'textarea', span: 3, hint: 'Required when changing an active contract – recorded in contract history.', showIf: (v) => !!v.id },
]

export function useContractColumns({ showCrew = true } = {}) {
  const { crewName, vesselName } = useLookups()
  return [
    { key: 'id', label: 'Contract' },
    ...(showCrew ? [{ key: 'crewId', label: 'Seafarer', render: (r) => <CrewCell id={r.crewId} />, exportValue: (r) => `${r.crewId} ${crewName(r.crewId)}` }] : []),
    { key: 'vesselId', label: 'Vessel', render: (r) => <VesselCell id={r.vesselId} />, exportValue: (r) => vesselName(r.vesselId) },
    { key: 'rank', label: 'Rank' },
    { key: 'startDate', label: 'Start', render: (r) => fmtDate(r.startDate) },
    { key: 'endDate', label: 'End', render: (r) => { const e = expiryStatus(r.endDate); return <>{fmtDate(r.endDate)} {r.status === 'Active' && e.days !== null && e.days <= 30 && <Badge tone={e.tone}>{e.days < 0 ? 'Overdue' : `${e.days}d`}</Badge>}</> } },
    { key: 'durationMonths', label: 'Months' },
    { key: 'total', label: 'Monthly total', align: 'right', exportValue: (r) => (r.basicWage || 0) + (r.fixedOT || 0) + (r.leavePay || 0) + (r.otherAllowance || 0), render: (r) => money((r.basicWage || 0) + (r.fixedOT || 0) + (r.leavePay || 0) + (r.otherAllowance || 0), r.currency) },
    { key: 'approval', label: 'Approval', render: (r) => <Badge>{r.approval}</Badge> },
    { key: 'signed', label: 'Signed', exportValue: (r) => (r.signed ? 'Yes' : 'No'), render: (r) => <Badge tone={r.signed ? 'ok' : 'warn'}>{r.signed ? 'Signed' : 'Unsigned'}</Badge> },
    { key: 'status', label: 'Status', render: (r) => <Badge>{r.status}</Badge> },
  ]
}

export function ContractActions({ row }) {
  const { can } = useAuth()
  const { crewById, vesselById } = useLookups()
  const toast = useToast()
  return (
    <>
      <button className="icon-btn" title="Download PDF" onClick={() => contractPDF({ contract: row, crew: crewById[row.crewId], vessel: vesselById[row.vesselId] })}><FileDown size={15} /></button>
      {can('contracts', 'approve') && row.approval !== 'Approved' && (
        <button className="icon-btn" title="Approve" onClick={async () => { await api.update('contracts', row.id, { approval: 'Approved', status: row.status === 'Draft' || row.status === 'Pending Approval' ? 'Active' : row.status }); toast('Contract approved') }}><Check size={15} color="var(--ok)" /></button>
      )}
      {!row.signed && can('contracts', 'edit') && (
        <button className="icon-btn" title="Send for digital signature" onClick={async () => { await api.update('contracts', row.id, { signed: true, signedAt: new Date().toISOString() }); toast('Signature captured (demo – integrate e-sign provider)') }}><PenLine size={15} /></button>
      )}
      {row.status === 'Active' && can('contracts', 'create') && (
        <button className="icon-btn" title="Renew" onClick={async () => {
          const start = addDays(1, row.endDate); const end = addDays(row.durationMonths * 30 || 180, start)
          const { id, history, signedAt, ...rest } = row
          const c = await api.create('contracts', { ...rest, startDate: start, endDate: end, status: 'Draft', approval: 'Pending', signed: false, version: 1, renewedFrom: row.id })
          toast(`Renewal draft ${c.id} created`)
        }}><RefreshCw size={15} /></button>
      )}
    </>
  )
}

export default function Contracts() {
  const columns = useContractColumns()
  const { contracts, salaryStructures } = useData('contracts', 'salaryStructures')
  const ending = contracts.filter((c) => c.status === 'Active' && daysUntil(c.endDate) <= 30)
  return (
    <ResourcePage resource="contracts" module="contracts" title="Contract Management" subtitle="Employment contracts, amendments, approval workflow, digital signature and renewals."
      createLabel="New Contract" formTitle="New employment contract" exportTitle="Contract Expiry" columns={columns} fields={CONTRACT_FIELDS}
      formOnChange={(v, name) => {
        if (name === 'rank' || (name === 'crewId' && !v.basicWage)) {
          const s = salaryStructures.find((x) => x.rank === v.rank)
          if (s) return { basicWage: s.basic, fixedOT: s.fixedOT, leavePay: s.leavePay, otherAllowance: s.otherAllowance, currency: s.currency }
        }
      }}
      validate={(v) => {
        if (v.endDate <= v.startDate) return 'End date must be after start date'
        if (v.id && v.status === 'Active' && !v.amendmentNote) return 'Add an amendment note when changing an active contract'
      }}
      beforeSave={(v, isEdit, prev) => {
        if (!isEdit) return { ...v, version: 1, history: [] }
        const { amendmentNote, ...rest } = v
        return { ...rest, version: (prev.version || 1) + 1, history: [...(prev.history || []), { version: prev.version || 1, at: new Date().toISOString(), note: amendmentNote || 'Updated' }] }
      }}
      filters={[
        { key: 'status', label: 'Status', options: CONTRACT_STATUS },
        { key: 'approval', label: 'Approval', options: APPROVAL },
        { key: 'ending', label: 'Ending', options: [{ value: '30', label: '≤ 30 days' }, { value: '60', label: '≤ 60 days' }], test: (r, v) => r.status === 'Active' && daysUntil(r.endDate) <= Number(v) },
      ]}
      rowActions={(r) => <ContractActions row={r} />}>
      <div className="stats">
        <Stat label="Active contracts" value={contracts.filter((c) => c.status === 'Active').length} icon={FileSignature} tone="green" />
        <Stat label="Pending approval" value={contracts.filter((c) => c.approval === 'Pending').length} icon={Clock} tone="amber" />
        <Stat label="Unsigned" value={contracts.filter((c) => !c.signed).length} icon={PenLine} tone="amber" />
        <Stat label="Renewal due ≤ 30 days" value={ending.length} icon={AlertTriangle} tone="red" />
      </div>
    </ResourcePage>
  )
}

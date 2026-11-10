import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { FileBarChart } from 'lucide-react'
import DataTable from '../components/DataTable'
import { Badge, Card } from '../components/ui'
import { useData } from '../api/hooks'
import { useLookups } from '../context/LookupContext'
import { fullName, fmtDate, months, money, expiryStatus, daysUntil, fmtDateTime } from '../utils/format'
import { ALL_RANKS, DEPARTMENTS, PIPELINE_STAGES, DOCUMENT_TYPES } from '../config/constants'

export const REPORTS = [
  { key: 'master', name: 'Crew Master', purpose: 'Complete crew information' },
  { key: 'rank', name: 'Rank-wise Crew', purpose: 'Crew availability by rank' },
  { key: 'manning', name: 'Vessel-wise Manning', purpose: 'Required versus allocated crew' },
  { key: 'onboard', name: 'Onboard Crew', purpose: 'Currently deployed seafarers' },
  { key: 'available', name: 'Available Crew', purpose: 'Crew ready for deployment' },
  { key: 'movement', name: 'Crew Movement', purpose: 'Joining and sign-off history' },
  { key: 'cert', name: 'Certificate Expiry', purpose: 'Upcoming and expired documents' },
  { key: 'medical', name: 'Medical Expiry', purpose: 'Medical compliance tracking' },
  { key: 'contract', name: 'Contract Expiry', purpose: 'Contract renewal monitoring' },
  { key: 'recruitment', name: 'Recruitment MIS', purpose: 'Candidate pipeline and selection' },
  { key: 'payroll', name: 'Payroll Report', purpose: 'Salary and payment details' },
  { key: 'performance', name: 'Performance Report', purpose: 'Crew appraisal history' },
  { key: 'travel', name: 'Travel Report', purpose: 'Crew travel and joining details' },
]

const B = (v) => <Badge>{v}</Badge>
const E = (d) => { const e = expiryStatus(d); return <Badge tone={e.tone}>{e.days !== null ? (e.days < 0 ? `Expired ${-e.days}d` : `${e.days}d`) : '—'}</Badge> }

export default function Reports() {
  const [params, setParams] = useSearchParams()
  const key = params.get('r') || 'master'
  const L = useLookups()
  const d = useData('assignments', 'documents', 'medicals', 'contracts', 'applications', 'payroll', 'appraisals', 'travel', 'signOffs', 'signOns')
  const cn = (id) => fullName(L.crewById[id])
  const crewCols = [{ key: 'crewId', label: 'Crew ID' }, { key: 'crewName', label: 'Name' }]
  const withCrew = (rows) => rows.map((r) => ({ ...r, crewName: cn(r.crewId), rankNow: L.crewById[r.crewId]?.rank }))

  const report = useMemo(() => {
    switch (key) {
      case 'master': return {
        rows: L.crew,
        columns: [{ key: 'id', label: 'Crew ID' }, { key: 'employeeId', label: 'Emp ID' }, { key: 'name', label: 'Name', exportValue: fullName, render: fullName }, { key: 'rank', label: 'Rank' }, { key: 'department', label: 'Dept' }, { key: 'nationality', label: 'Nationality' }, { key: 'dob', label: 'DOB', render: (r) => fmtDate(r.dob) }, { key: 'phone', label: 'Phone' }, { key: 'email', label: 'Email' }, { key: 'passportNo', label: 'Passport' }, { key: 'cdcNo', label: 'CDC' }, { key: 'indosNo', label: 'INDOS' }, { key: 'totalExperienceMonths', label: 'Exp (m)' }, { key: 'status', label: 'Status', render: (r) => B(r.status) }],
        filters: [{ key: 'department', label: 'Dept', options: DEPARTMENTS }, { key: 'status', label: 'Status', options: [...new Set(L.crew.map((c) => c.status))] }],
      }
      case 'rank': {
        const rows = ALL_RANKS.map((rank) => {
          const list = L.crew.filter((c) => c.rank === rank)
          return { id: rank, rank, total: list.length, onboard: list.filter((c) => c.status === 'Onboard').length, available: list.filter((c) => c.status === 'Available').length, planned: list.filter((c) => c.status === 'Planned').length, leave: list.filter((c) => c.status === 'On Leave').length, candidate: list.filter((c) => c.status === 'Candidate').length }
        })
        return { rows, columns: [{ key: 'rank', label: 'Rank' }, { key: 'total', label: 'Total' }, { key: 'onboard', label: 'Onboard' }, { key: 'available', label: 'Available' }, { key: 'planned', label: 'Planned' }, { key: 'leave', label: 'On leave' }, { key: 'candidate', label: 'Candidates' }] }
      }
      case 'manning': {
        const rows = L.vessels.flatMap((v) => (v.manning || []).map((m) => {
          const alloc = d.assignments.filter((a) => a.vesselId === v.id && a.rank === m.rank && a.status === 'Onboard').length
          return { id: `${v.id}-${m.rank}`, vessel: v.name, rank: m.rank, required: m.required, allocated: alloc, variance: alloc - m.required }
        }))
        return { rows, columns: [{ key: 'vessel', label: 'Vessel' }, { key: 'rank', label: 'Rank' }, { key: 'required', label: 'Required' }, { key: 'allocated', label: 'Allocated' }, { key: 'variance', label: 'Variance', render: (r) => <Badge tone={r.variance < 0 ? 'danger' : r.variance > 0 ? 'info' : 'ok'}>{r.variance > 0 ? `+${r.variance}` : r.variance}</Badge> }], filters: [{ key: 'vessel', label: 'Vessel', options: L.vessels.map((v) => v.name) }, { key: 'short', label: 'Gap', options: [{ value: 'y', label: 'Shortfall only' }], test: (r) => r.variance < 0 }] }
      }
      case 'onboard': return {
        rows: withCrew(d.assignments.filter((a) => a.status === 'Onboard')),
        columns: [...crewCols, { key: 'rank', label: 'Rank' }, { key: 'vessel', label: 'Vessel', exportValue: (r) => L.vesselName(r.vesselId), render: (r) => L.vesselName(r.vesselId) }, { key: 'signOnDate', label: 'Signed on', render: (r) => fmtDate(r.signOnDate) }, { key: 'plannedSignOff', label: 'Planned sign-off', render: (r) => fmtDate(r.plannedSignOff) }, { key: 'due', label: 'Days left', exportValue: (r) => daysUntil(r.plannedSignOff), render: (r) => E(r.plannedSignOff) }, { key: 'joiningPort', label: 'Port' }],
        filters: [{ key: 'vesselId', label: 'Vessel', options: L.vessels.map((v) => ({ value: v.id, label: v.name })) }],
      }
      case 'available': return {
        rows: L.crew.filter((c) => c.status === 'Available' || c.status === 'On Leave'),
        columns: [{ key: 'id', label: 'Crew ID' }, { key: 'name', label: 'Name', exportValue: fullName, render: fullName }, { key: 'rank', label: 'Rank' }, { key: 'nationality', label: 'Nationality' }, { key: 'totalExperienceMonths', label: 'Experience', render: (r) => months(r.totalExperienceMonths) }, { key: 'lastSignOff', label: 'Last sign-off', render: (r) => fmtDate(r.lastSignOff) }, { key: 'availableFrom', label: 'Available from', render: (r) => fmtDate(r.availableFrom) }, { key: 'preferredVesselType', label: 'Preferred vessel' }, { key: 'status', label: 'Status', render: (r) => B(r.status) }],
        filters: [{ key: 'rank', label: 'Rank', options: ALL_RANKS }, { key: 'department', label: 'Dept', options: DEPARTMENTS }],
      }
      case 'movement': {
        const rows = [
          ...d.signOns.map((s) => ({ id: s.id, crewId: s.crewId, crewName: cn(s.crewId), movement: 'Sign-On', date: s.joiningDate, vessel: L.vesselName(s.vesselId), rank: s.rank, port: s.port, reason: '' })),
          ...d.signOffs.map((s) => ({ id: s.id, crewId: s.crewId, crewName: cn(s.crewId), movement: 'Sign-Off', date: s.signOffDate, vessel: L.vesselName(s.vesselId), rank: s.rank, port: s.port, reason: s.reason })),
        ].sort((a, b) => (b.date || '').localeCompare(a.date || ''))
        return { rows, columns: [{ key: 'date', label: 'Date', render: (r) => fmtDate(r.date) }, { key: 'movement', label: 'Movement', render: (r) => <Badge tone={r.movement === 'Sign-On' ? 'ok' : 'info'}>{r.movement}</Badge> }, ...crewCols, { key: 'rank', label: 'Rank' }, { key: 'vessel', label: 'Vessel' }, { key: 'port', label: 'Port' }, { key: 'reason', label: 'Reason' }], filters: [{ key: 'movement', label: 'Movement', options: ['Sign-On', 'Sign-Off'] }] }
      }
      case 'cert': return {
        rows: withCrew(d.documents.filter((x) => x.expiryDate && daysUntil(x.expiryDate) <= 90)).sort((a, b) => a.expiryDate.localeCompare(b.expiryDate)),
        columns: [...crewCols, { key: 'rankNow', label: 'Rank' }, { key: 'type', label: 'Document' }, { key: 'number', label: 'Number' }, { key: 'expiryDate', label: 'Expiry', render: (r) => fmtDate(r.expiryDate) }, { key: 'days', label: 'Days', exportValue: (r) => daysUntil(r.expiryDate), render: (r) => E(r.expiryDate) }, { key: 'status', label: 'Verification', render: (r) => B(r.status) }],
        filters: [{ key: 'type', label: 'Type', options: DOCUMENT_TYPES }, { key: 'b', label: 'Window', options: [{ value: 'x', label: 'Expired' }, { value: '30', label: '≤ 30d' }, { value: '60', label: '≤ 60d' }], test: (r, v) => (v === 'x' ? daysUntil(r.expiryDate) < 0 : daysUntil(r.expiryDate) >= 0 && daysUntil(r.expiryDate) <= Number(v)) }],
      }
      case 'medical': return {
        rows: withCrew(d.medicals).sort((a, b) => a.expiryDate.localeCompare(b.expiryDate)),
        columns: [...crewCols, { key: 'rankNow', label: 'Rank' }, { key: 'examDate', label: 'Exam', render: (r) => fmtDate(r.examDate) }, { key: 'expiryDate', label: 'Expiry', render: (r) => fmtDate(r.expiryDate) }, { key: 'days', label: 'Days', exportValue: (r) => daysUntil(r.expiryDate), render: (r) => E(r.expiryDate) }, { key: 'status', label: 'Fitness', render: (r) => B(r.status) }, { key: 'centre', label: 'Centre' }, { key: 'restrictions', label: 'Restrictions' }],
        filters: [{ key: 'status', label: 'Fitness', options: ['Fit', 'Temporarily Unfit', 'Unfit'] }],
      }
      case 'contract': return {
        rows: withCrew(d.contracts).sort((a, b) => a.endDate.localeCompare(b.endDate)),
        columns: [{ key: 'id', label: 'Contract' }, ...crewCols, { key: 'rank', label: 'Rank' }, { key: 'vessel', label: 'Vessel', exportValue: (r) => L.vesselName(r.vesselId), render: (r) => L.vesselName(r.vesselId) }, { key: 'startDate', label: 'Start', render: (r) => fmtDate(r.startDate) }, { key: 'endDate', label: 'End', render: (r) => fmtDate(r.endDate) }, { key: 'days', label: 'Days left', exportValue: (r) => daysUntil(r.endDate), render: (r) => (r.status === 'Active' ? E(r.endDate) : '—') }, { key: 'status', label: 'Status', render: (r) => B(r.status) }],
        filters: [{ key: 'status', label: 'Status', options: ['Draft', 'Pending Approval', 'Active', 'Completed'] }],
      }
      case 'recruitment': return {
        rows: withCrew(d.applications).map((a) => ({ ...a, vacancy: L.vacancyById[a.vacancyId]?.title })),
        columns: [{ key: 'id', label: 'App' }, { key: 'vacancy', label: 'Vacancy' }, ...crewCols, { key: 'appliedOn', label: 'Applied', render: (r) => fmtDate(r.appliedOn) }, { key: 'source', label: 'Source' }, { key: 'stage', label: 'Stage', render: (r) => B(r.stage) }, { key: 'assessmentScore', label: 'Score' }, { key: 'internalApproval', label: 'Internal' }, { key: 'clientApproval', label: 'Client' }, { key: 'status', label: 'Status', render: (r) => B(r.status) }],
        filters: [{ key: 'stage', label: 'Stage', options: PIPELINE_STAGES }, { key: 'source', label: 'Source', options: ['Portal', 'Referral', 'Database', 'Walk-in', 'Job Board'] }],
      }
      case 'payroll': return {
        rows: withCrew(d.payroll),
        columns: [{ key: 'period', label: 'Period' }, ...crewCols, { key: 'vessel', label: 'Vessel', exportValue: (r) => L.vesselName(r.vesselId), render: (r) => L.vesselName(r.vesselId) }, { key: 'gross', label: 'Gross', align: 'right', render: (r) => money(r.gross, r.currency) }, { key: 'advance', label: 'Advance', align: 'right' }, { key: 'deductions', label: 'Deductions', align: 'right' }, { key: 'net', label: 'Net', align: 'right', render: (r) => money(r.net, r.currency) }, { key: 'allotment', label: 'Allotment', align: 'right' }, { key: 'currency', label: 'Cur' }, { key: 'status', label: 'Status', render: (r) => B(r.status) }],
        filters: [{ key: 'period', label: 'Period', options: [...new Set(d.payroll.map((p) => p.period))] }, { key: 'status', label: 'Status', options: ['Draft', 'Processing', 'Paid', 'On Hold'] }],
      }
      case 'performance': return {
        rows: withCrew(d.appraisals),
        columns: [...crewCols, { key: 'rank', label: 'Rank' }, { key: 'vessel', label: 'Vessel', exportValue: (r) => L.vesselName(r.vesselId), render: (r) => L.vesselName(r.vesselId) }, { key: 'periodTo', label: 'Period end', render: (r) => fmtDate(r.periodTo) }, { key: 'evaluator', label: 'Evaluator' }, { key: 'technical', label: 'Tech' }, { key: 'safety', label: 'Safety' }, { key: 'behaviour', label: 'Behav.' }, { key: 'teamwork', label: 'Team' }, { key: 'overall', label: 'Overall' }, { key: 'rehire', label: 'Rehire', render: (r) => B(r.rehire) }],
        filters: [{ key: 'rehire', label: 'Rehire', options: ['Yes', 'No', 'With Reservations'] }],
      }
      case 'travel': return {
        rows: withCrew(d.travel),
        columns: [{ key: 'id', label: 'Ref' }, ...crewCols, { key: 'vessel', label: 'Vessel', exportValue: (r) => L.vesselName(r.vesselId), render: (r) => L.vesselName(r.vesselId) }, { key: 'purpose', label: 'Purpose' }, { key: 'route', label: 'Route', exportValue: (r) => `${r.fromCity} - ${r.toCity}`, render: (r) => `${r.fromCity} → ${r.toCity}` }, { key: 'flight', label: 'Flight', exportValue: (r) => `${r.airline} ${r.flightNo}`, render: (r) => `${r.airline} ${r.flightNo}` }, { key: 'departure', label: 'Departure', render: (r) => fmtDateTime(r.departure) }, { key: 'visaStatus', label: 'Visa' }, { key: 'expenses', label: 'Expenses', align: 'right', render: (r) => money(r.expenses, r.currency) }, { key: 'status', label: 'Status', render: (r) => B(r.status) }],
        filters: [{ key: 'status', label: 'Status', options: ['Requested', 'Pending Approval', 'Booked', 'Completed', 'Cancelled'] }],
      }
      default: return { rows: [], columns: [] }
    }
  }, [key, L, d]) // eslint-disable-line react-hooks/exhaustive-deps

  const meta = REPORTS.find((r) => r.key === key)
  return (
    <>
      <div className="page-head"><div><h1>Reports & MIS</h1><p className="muted">Operational and management reports. Every report exports to Excel, PDF and CSV.</p></div></div>
      <div className="grid" style={{ gridTemplateColumns: '250px minmax(0,1fr)', alignItems: 'start' }}>
        <Card pad={false}>
          <div style={{ padding: 6 }}>
            {REPORTS.map((r) => (
              <button key={r.key} onClick={() => setParams({ r: r.key })} className="ss-item" style={{ background: r.key === key ? 'var(--accent-50)' : undefined, borderRadius: 8, padding: '9px 10px' }}>
                <span style={{ display: 'flex', gap: 8, alignItems: 'center', fontWeight: 600, color: r.key === key ? 'var(--accent-600)' : undefined }}><FileBarChart size={15} /> {r.name}</span>
                <small className="muted" style={{ paddingLeft: 23 }}>{r.purpose}</small>
              </button>
            ))}
          </div>
        </Card>
        <div className="card">
          <div className="card-head"><div><h3>{meta?.name}</h3><small className="muted">{meta?.purpose} · generated {fmtDateTime(new Date())}</small></div></div>
          <DataTable key={key} rows={report.rows} columns={report.columns} filters={report.filters || []} exportTitle={meta?.name} module="reports" pageSize={20} />
        </div>
      </div>
    </>
  )
}

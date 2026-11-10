import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Check, UserPlus, AlertTriangle } from 'lucide-react'
import ResourcePage from '../components/ResourcePage'
import FormModal from '../components/FormModal'
import DataTable from '../components/DataTable'
import { Badge, Card, Tabs, useToast } from '../components/ui'
import { CrewCell, VesselCell, useLookups } from '../context/LookupContext'
import { useData } from '../api/hooks'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { ALL_RANKS, APPROVAL, PORTS, VESSEL_TYPES } from '../config/constants'
import { fmtDate, daysUntil, fullName, addDays, today, months } from '../utils/format'

const ACTIVE = ['Planned', 'Onboard']

export function findConflicts(assignments, a) {
  const end = a.actualSignOff || a.plannedSignOff
  return assignments.filter((x) => x.id !== a.id && x.crewId === a.crewId && ACTIVE.includes(x.status) &&
    !(end < x.signOnDate || a.signOnDate > (x.actualSignOff || x.plannedSignOff)))
}

export const ASSIGNMENT_FIELDS = [
  { name: 'crewId', label: 'Seafarer', type: 'crew', required: true, span: 2, effect: (v, refs) => ({ rank: refs.crew.find((c) => c.id === v.crewId)?.rank || v.rank }) },
  { name: 'rank', label: 'Rank', type: 'select', options: ALL_RANKS, required: true },
  { name: 'vesselId', label: 'Vessel', type: 'vessel', required: true },
  { name: 'signOnDate', label: 'Sign-on / joining date', type: 'date', required: true },
  { name: 'plannedSignOff', label: 'Planned sign-off', type: 'date', required: true },
  { name: 'joiningPort', label: 'Joining port', type: 'select', options: PORTS, required: true },
  { name: 'relievingId', label: 'Relieving (assignment)', hint: 'Optional – assignment ID of the crew being relieved' },
  { name: 'status', label: 'Status', type: 'select', options: ['Planned', 'Onboard', 'Completed', 'Cancelled'], default: 'Planned' },
  { name: 'approval', label: 'Deployment approval', type: 'select', options: APPROVAL, default: 'Pending' },
  { name: 'remarks', label: 'Remarks', type: 'textarea', span: 3 },
]

function useAssignmentGuards() {
  const { assignments, documents, medicals } = useData('assignments', 'documents', 'medicals')
  const validate = (v) => {
    if (v.plannedSignOff <= v.signOnDate) return 'Planned sign-off must be after sign-on date'
    const c = findConflicts(assignments, v)
    if (c.length) return `Overlapping assignment: ${c.map((x) => `${x.id} (${x.status}, ${fmtDate(x.signOnDate)} – ${fmtDate(x.plannedSignOff)})`).join(', ')}`
    const med = medicals.filter((m) => m.crewId === v.crewId).sort((a, b) => b.examDate.localeCompare(a.examDate))[0]
    if (med && med.status === 'Unfit') return 'Seafarer is medically UNFIT – cannot deploy'
    if (!v._ackDocs) {
      const exp = documents.filter((d) => d.crewId === v.crewId && d.expiryDate && d.expiryDate < v.plannedSignOff && ['Passport', 'CDC / Seaman Book', 'Certificate of Competency (COC)', 'Medical Fitness Certificate', 'STCW Basic Safety'].includes(d.type))
      if (exp.length) return `Documents expire before planned sign-off: ${exp.map((d) => `${d.type} (${fmtDate(d.expiryDate)})`).join(', ')}. Tick the acknowledgement to proceed.`
    }
  }
  const field = { name: '_ackDocs', label: 'Compliance', type: 'checkbox', checkLabel: 'I acknowledge expiring documents will be renewed onboard', span: 3 }
  return { validate, field }
}

async function syncCrewStatus(a) {
  const map = { Planned: 'Planned', Onboard: 'Onboard', Completed: 'Available', Cancelled: 'Available' }
  const patch = { status: map[a.status] }
  if (a.status === 'Onboard') patch.lastSignOn = a.signOnDate
  if (a.status === 'Completed') { patch.lastSignOff = a.actualSignOff || a.plannedSignOff; patch.availableFrom = addDays(30, patch.lastSignOff) }
  if (patch.status) await api.update('crew', a.crewId, patch)
}

function Assignments() {
  const { crewName, vesselName } = useLookups()
  const { assignments } = useData('assignments')
  const { can } = useAuth()
  const toast = useToast()
  const guards = useAssignmentGuards()
  return (
    <ResourcePage resource="assignments" module="planning" title="Assignments" hideHeader exportTitle="Crew Assignments" createLabel="New Assignment" formTitle="Assign crew to vessel"
      fields={[...ASSIGNMENT_FIELDS, guards.field]} validate={guards.validate}
      beforeSave={({ _ackDocs, ...v }) => v}
      afterSave={(a) => syncCrewStatus(a)}
      filters={[{ key: 'status', label: 'Status', options: ['Planned', 'Onboard', 'Completed', 'Cancelled'] }, { key: 'approval', label: 'Approval', options: APPROVAL }]}
      initialFilters={{ status: 'Onboard' }}
      rowClass={(r) => (findConflicts(assignments, r).length ? 'row-danger' : '')}
      columns={[
        { key: 'id', label: 'Ref' },
        { key: 'crewId', label: 'Seafarer', render: (r) => <CrewCell id={r.crewId} />, exportValue: (r) => `${r.crewId} ${crewName(r.crewId)}` },
        { key: 'vesselId', label: 'Vessel', render: (r) => <VesselCell id={r.vesselId} />, exportValue: (r) => vesselName(r.vesselId) },
        { key: 'rank', label: 'Rank' },
        { key: 'signOnDate', label: 'Sign-on', render: (r) => fmtDate(r.signOnDate) },
        { key: 'plannedSignOff', label: 'Planned sign-off', render: (r) => { const d = daysUntil(r.plannedSignOff); return <>{fmtDate(r.plannedSignOff)} {r.status === 'Onboard' && d <= 30 && <Badge tone={d < 0 ? 'danger' : 'warn'}>{d < 0 ? 'Overdue' : `${d}d`}</Badge>}</> } },
        { key: 'tenure', label: 'Contract', exportValue: (r) => Math.round((new Date(r.plannedSignOff) - new Date(r.signOnDate)) / 2.63e9), render: (r) => months(Math.round((new Date(r.plannedSignOff) - new Date(r.signOnDate)) / 2.63e9)) },
        { key: 'joiningPort', label: 'Port' },
        { key: 'approval', label: 'Approval', render: (r) => <Badge>{r.approval}</Badge> },
        { key: 'status', label: 'Status', render: (r) => <>{findConflicts(assignments, r).length > 0 && <AlertTriangle size={14} color="var(--danger)" title="Overlap" />} <Badge>{r.status}</Badge></> },
      ]}
      rowActions={(r) => can('planning', 'approve') && r.approval !== 'Approved' && (
        <button className="icon-btn" title="Approve deployment" onClick={async () => { await api.update('assignments', r.id, { approval: 'Approved' }); toast('Deployment approved') }}><Check size={15} color="var(--ok)" /></button>
      )} />
  )
}

function Timeline() {
  const { assignments } = useData('assignments')
  const { vessels, crewById, vesselById } = useLookups()
  const [group, setGroup] = useState('vessel')
  const [vesselId, setVesselId] = useState('')
  const start = new Date(); start.setMonth(start.getMonth() - 6); start.setDate(1)
  const end = new Date(); end.setMonth(end.getMonth() + 7); end.setDate(1)
  const span = end - start
  const pct = (d) => Math.max(0, Math.min(100, ((new Date(d) - start) / span) * 100))
  const monthsList = []
  for (let d = new Date(start); d < end; d.setMonth(d.getMonth() + 1)) monthsList.push(new Date(d))

  const list = assignments.filter((a) => a.status !== 'Cancelled' && (!vesselId || a.vesselId === vesselId) && new Date(a.actualSignOff || a.plannedSignOff) >= start && new Date(a.signOnDate) <= end)
  const rows = group === 'vessel'
    ? vessels.filter((v) => !vesselId || v.id === vesselId).flatMap((v) => {
      const byRank = {}
      list.filter((a) => a.vesselId === v.id).forEach((a) => { (byRank[a.rank] = byRank[a.rank] || []).push(a) })
      return Object.entries(byRank).sort((a, b) => ALL_RANKS.indexOf(a[0]) - ALL_RANKS.indexOf(b[0])).map(([rank, items]) => ({ key: `${v.id}-${rank}`, label: <><strong>{rank}</strong><br /><small className="muted">{v.name}</small></>, items }))
    })
    : Object.values(list.reduce((acc, a) => { (acc[a.crewId] = acc[a.crewId] || []).push(a); return acc }, {})).map((items) => ({ key: items[0].crewId, label: <><strong>{fullName(crewById[items[0].crewId])}</strong><br /><small className="muted">{crewById[items[0].crewId]?.rank}</small></>, items }))

  return (
    <Card title="Crew rotation schedule" actions={<div className="row">
      <select className="input input-sm" value={group} onChange={(e) => setGroup(e.target.value)}><option value="vessel">By vessel / rank</option><option value="crew">By seafarer</option></select>
      <select className="input input-sm" value={vesselId} onChange={(e) => setVesselId(e.target.value)}><option value="">All vessels</option>{vessels.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}</select>
    </div>} pad={false}>
      <div className="row" style={{ padding: '10px 16px', fontSize: 12 }}>
        <span className="chip"><span className="gantt-bar gb-Onboard" style={{ position: 'static', width: 14, height: 10, padding: 0 }} /> Onboard</span>
        <span className="chip"><span className="gantt-bar gb-Planned" style={{ position: 'static', width: 14, height: 10, padding: 0 }} /> Planned</span>
        <span className="chip"><span className="gantt-bar gb-Completed" style={{ position: 'static', width: 14, height: 10, padding: 0 }} /> Completed</span>
        <span className="chip"><span className="gantt-bar gb-conflict" style={{ position: 'static', width: 14, height: 10, padding: 0 }} /> Overlap conflict</span>
      </div>
      <div className="gantt" style={{ maxHeight: 620, overflowY: 'auto' }}>
        <div className="gantt-grid">
          <div className="gantt-head"><div className="gantt-label">{group === 'vessel' ? 'Vessel / rank' : 'Seafarer'}</div>
            <div className="gantt-months">{monthsList.map((m) => <span key={m.toISOString()} style={{ left: `${pct(m)}%` }}>{m.toLocaleString('en-GB', { month: 'short', year: '2-digit' })}</span>)}</div>
          </div>
          {rows.map((r) => (
            <div className="gantt-row" key={r.key}>
              <div className="gantt-label">{r.label}</div>
              <div className="gantt-track">
                <span className="gantt-today" style={{ left: `${pct(today())}%` }} />
                {r.items.map((a) => {
                  const l = pct(a.signOnDate); const w = Math.max(1.2, pct(a.actualSignOff || a.plannedSignOff) - l)
                  const conflict = findConflicts(assignments, a).length > 0
                  return <span key={a.id} className={`gantt-bar gb-${a.status} ${conflict ? 'gb-conflict' : ''}`} style={{ left: `${l}%`, width: `${w}%` }} title={`${fullName(crewById[a.crewId])} · ${a.rank} · ${vesselById[a.vesselId]?.name}\n${fmtDate(a.signOnDate)} → ${fmtDate(a.actualSignOff || a.plannedSignOff)} (${a.status})`}>{group === 'vessel' ? fullName(crewById[a.crewId]) : vesselById[a.vesselId]?.name}</span>
                })}
              </div>
            </div>
          ))}
          {!rows.length && <p className="muted" style={{ padding: 20 }}>No assignments in this window.</p>}
        </div>
      </div>
    </Card>
  )
}

function Availability({ onAssign }) {
  const { crew } = useLookups()
  const { documents, medicals, assignments } = useData('documents', 'medicals', 'assignments')
  const [from, setFrom] = useState(today())
  const rows = useMemo(() => crew.filter((c) => ['Available', 'On Leave', 'Candidate'].includes(c.status)).map((c) => {
    const docs = documents.filter((d) => d.crewId === c.id)
    const expired = docs.filter((d) => d.expiryDate && d.expiryDate < addDays(180, from)).length
    const med = medicals.filter((m) => m.crewId === c.id).sort((a, b) => b.examDate.localeCompare(a.examDate))[0]
    const busy = assignments.some((a) => a.crewId === c.id && ACTIVE.includes(a.status))
    return { ...c, docIssues: expired, medical: med?.status || 'No record', busy, readyOn: c.availableFrom || from }
  }).filter((c) => !c.busy && (!c.availableFrom || c.availableFrom <= addDays(60, from))), [crew, documents, medicals, assignments, from])

  return (
    <div className="card">
      <DataTable rows={rows} exportTitle="Available Crew" module="planning"
        toolbar={<label className="row" style={{ gap: 6 }}><small className="muted">Required from</small><input type="date" className="input input-sm" value={from} onChange={(e) => setFrom(e.target.value)} /></label>}
        filters={[
          { key: 'rank', label: 'Rank', options: ALL_RANKS },
          { key: 'vt', label: 'Vessel exp.', options: VESSEL_TYPES, test: (r, v) => (r.vesselTypeExperience || '').includes(v) || r.preferredVesselType === v },
          { key: 'compliance', label: 'Compliance', options: [{ value: 'ok', label: 'Docs & medical OK' }], test: (r) => r.docIssues === 0 && r.medical === 'Fit' },
        ]}
        columns={[
          { key: 'name', label: 'Seafarer', render: (r) => <CrewCell id={r.id} />, exportValue: (r) => `${r.id} ${fullName(r)}` },
          { key: 'rank', label: 'Rank' }, { key: 'nationality', label: 'Nationality' },
          { key: 'totalExperienceMonths', label: 'Sea exp.', render: (r) => months(r.totalExperienceMonths) },
          { key: 'vesselTypeExperience', label: 'Vessel types' },
          { key: 'readyOn', label: 'Available from', render: (r) => fmtDate(r.readyOn) },
          { key: 'docIssues', label: 'Documents', exportValue: (r) => (r.docIssues ? `${r.docIssues} expiring` : 'OK'), render: (r) => <Badge tone={r.docIssues ? 'warn' : 'ok'}>{r.docIssues ? `${r.docIssues} expiring ≤ 6m` : 'OK'}</Badge> },
          { key: 'medical', label: 'Medical', render: (r) => <Badge>{r.medical}</Badge> },
          { key: 'status', label: 'Status', render: (r) => <Badge>{r.status}</Badge> },
          { key: '_actions', label: '', render: (r) => <button className="btn btn-sm" onClick={() => onAssign({ crewId: r.id, rank: r.rank, signOnDate: r.readyOn > from ? r.readyOn : from, plannedSignOff: addDays(180, r.readyOn > from ? r.readyOn : from), status: 'Planned', approval: 'Pending' })}><UserPlus size={14} /> Assign</button> },
        ]} />
    </div>
  )
}

function Relief({ onAssign }) {
  const { crew } = useLookups()
  const { assignments } = useData('assignments')
  const [horizon, setHorizon] = useState(60)
  const due = assignments.filter((a) => a.status === 'Onboard' && daysUntil(a.plannedSignOff) <= horizon).sort((a, b) => a.plannedSignOff.localeCompare(b.plannedSignOff))
  const busy = new Set(assignments.filter((a) => ACTIVE.includes(a.status)).map((a) => a.crewId))
  return (
    <Card title="Relief & replacement planning" pad={false} actions={<select className="input input-sm" value={horizon} onChange={(e) => setHorizon(Number(e.target.value))}><option value={30}>Next 30 days</option><option value={60}>Next 60 days</option><option value={90}>Next 90 days</option></select>}>
      <table className="simple-table">
        <thead><tr><th>Onboard crew</th><th>Vessel</th><th>Sign-off due</th><th>Relief status</th><th>Suggested relievers (same rank, available)</th></tr></thead>
        <tbody>
          {due.map((a) => {
            const relief = assignments.find((x) => x.relievingId === a.id && x.status === 'Planned') || assignments.find((x) => x.vesselId === a.vesselId && x.rank === a.rank && x.status === 'Planned')
            const d = daysUntil(a.plannedSignOff)
            const suggestions = crew.filter((c) => c.rank === a.rank && !busy.has(c.id) && ['Available', 'On Leave'].includes(c.status)).sort((x, y) => (x.availableFrom || '').localeCompare(y.availableFrom || '')).slice(0, 3)
            return (
              <tr key={a.id}>
                <td><CrewCell id={a.crewId} /></td><td><VesselCell id={a.vesselId} /></td>
                <td>{fmtDate(a.plannedSignOff)} <Badge tone={d < 0 ? 'danger' : d <= 30 ? 'warn' : 'info'}>{d < 0 ? `${-d}d overdue` : `${d}d`}</Badge></td>
                <td>{relief ? <><Badge tone="ok">Relief planned</Badge><br /><small>{fullName(crew.find((c) => c.id === relief.crewId))}</small></> : <Badge tone="danger">No relief</Badge>}</td>
                <td>{!relief && (suggestions.length ? <div className="row">{suggestions.map((c) => (
                  <button key={c.id} className="btn btn-sm" title={`Available ${fmtDate(c.availableFrom)}`} onClick={() => onAssign({ crewId: c.id, rank: a.rank, vesselId: a.vesselId, signOnDate: addDays(-2, a.plannedSignOff), plannedSignOff: addDays(178, a.plannedSignOff), joiningPort: a.joiningPort, relievingId: a.id, status: 'Planned', approval: 'Pending' })}><UserPlus size={13} /> {fullName(c)}</button>
                ))}</div> : <span className="muted">No available {a.rank} – raise a vacancy</span>)}</td>
              </tr>
            )
          })}
          {!due.length && <tr><td colSpan={5} className="muted">No sign-offs due in this period.</td></tr>}
        </tbody>
      </table>
    </Card>
  )
}

export default function Planning() {
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') || 'assignments'
  const [draft, setDraft] = useState(null)
  const toast = useToast()
  const guards = useAssignmentGuards()
  return (
    <>
      <div className="page-head"><div><h1>Crew Planning & Deployment</h1><p className="muted">Vessel-wise manpower planning, availability search, rotation scheduling, relief planning and conflict checks.</p></div></div>
      <Tabs value={tab} onChange={(t) => setParams({ tab: t })} tabs={[{ key: 'assignments', label: 'Assignments' }, { key: 'timeline', label: 'Rotation Calendar' }, { key: 'availability', label: 'Availability Search' }, { key: 'relief', label: 'Relief Planning' }]} />
      {tab === 'assignments' && <Assignments />}
      {tab === 'timeline' && <Timeline />}
      {tab === 'availability' && <Availability onAssign={setDraft} />}
      {tab === 'relief' && <Relief onAssign={setDraft} />}
      <FormModal open={!!draft} title="Assign crew to vessel" fields={[...ASSIGNMENT_FIELDS, guards.field]} initial={draft} onClose={() => setDraft(null)} validate={guards.validate}
        onSubmit={async ({ _ackDocs, ...v }) => { const a = await api.create('assignments', v); await syncCrewStatus(a); toast(`Assignment ${a.id} created`) }} />
    </>
  )
}

import { useMemo, useState } from 'react'
import { Send } from 'lucide-react'
import ResourcePage from '../components/ResourcePage'
import DataTable from '../components/DataTable'
import { Badge, Card, Tabs, useToast } from '../components/ui'
import { CrewCell, useLookups } from '../context/LookupContext'
import { useData } from '../api/hooks'
import { api } from '../api/client'
import { expiryStatus, fmtDate, fullName, daysUntil } from '../utils/format'
import { isMandatory } from '../config/training'
import { DEPARTMENTS, ALL_RANKS } from '../config/constants'

export const TRAINING_FIELDS = [
  { name: 'crewId', label: 'Seafarer', type: 'crew', required: true, span: 2 },
  { name: 'courseId', label: 'Course', type: 'course', required: true, effect: (v, refs) => {
    const c = refs.courses.find((x) => x.id === v.courseId)
    return c ? { institute: v.institute || c.institute } : {}
  } },
  { name: 'institute', label: 'Training institute', required: true },
  { name: 'completedOn', label: 'Completed on', type: 'date', required: true },
  { name: 'expiryDate', label: 'Valid until', type: 'date', hint: 'Leave empty if no expiry' },
  { name: 'certificateNo', label: 'Certificate no.' },
  { name: 'fileName', label: 'Certificate upload', type: 'file', urlField: 'fileUrl', span: 2 },
  { name: 'status', label: 'Status', type: 'select', options: ['Scheduled', 'In Progress', 'Completed', 'Failed'], default: 'Completed' },
]

export function useTrainingColumns({ showCrew = true } = {}) {
  const { crewName, courseById } = useLookups()
  return [
    ...(showCrew ? [{ key: 'crewId', label: 'Seafarer', render: (r) => <CrewCell id={r.crewId} />, exportValue: (r) => `${r.crewId} ${crewName(r.crewId)}` }] : []),
    { key: 'courseId', label: 'Course', exportValue: (r) => courseById[r.courseId]?.name, render: (r) => <>{courseById[r.courseId]?.name || r.courseId}<br /><small className="muted">{courseById[r.courseId]?.code}</small></> },
    { key: 'institute', label: 'Institute' },
    { key: 'completedOn', label: 'Completed', render: (r) => fmtDate(r.completedOn) },
    { key: 'expiryDate', label: 'Valid until', render: (r) => fmtDate(r.expiryDate) },
    { key: 'refresher', label: 'Refresher', exportValue: (r) => expiryStatus(r.expiryDate).label, sortValue: (r) => daysUntil(r.expiryDate) ?? 99999, render: (r) => { const e = expiryStatus(r.expiryDate); return <Badge tone={e.tone}>{e.label}</Badge> } },
    { key: 'certificateNo', label: 'Certificate' },
    { key: 'status', label: 'Status', render: (r) => <Badge>{r.status}</Badge> },
  ]
}

function Records() {
  const columns = useTrainingColumns()
  const { courses } = useLookups()
  return (
    <ResourcePage resource="trainingRecords" module="training" title="Training Records" hideHeader exportTitle="Training Records" columns={columns} fields={TRAINING_FIELDS} createLabel="Add Training" formTitle="New training record"
      filters={[
        { key: 'courseId', label: 'Course', options: courses.map((c) => ({ value: c.id, label: c.name })) },
        { key: 'ref', label: 'Refresher', options: [{ value: 'expired', label: 'Expired' }, { value: '90', label: 'Due ≤ 90 days' }], test: (r, v) => { const d = daysUntil(r.expiryDate); if (d === null) return false; return v === 'expired' ? d < 0 : d >= 0 && d <= 90 } },
      ]} />
  )
}

function Courses() {
  return (
    <ResourcePage resource="courses" module="training" title="Course Master" hideHeader exportTitle="Training Course Master" createLabel="Add Course" formTitle="New course"
      columns={[
        { key: 'code', label: 'Code' }, { key: 'name', label: 'Course' }, { key: 'mandatoryFor', label: 'Mandatory for', render: (r) => <Badge tone="info">{r.mandatoryFor}</Badge> },
        { key: 'validityMonths', label: 'Validity', render: (r) => (r.validityMonths ? `${r.validityMonths} months` : 'No expiry') },
        { key: 'durationDays', label: 'Duration', render: (r) => `${r.durationDays} days` }, { key: 'institute', label: 'Preferred institute' },
      ]}
      fields={[
        { name: 'code', label: 'Code', required: true }, { name: 'name', label: 'Course name', required: true, span: 2 },
        { name: 'mandatoryFor', label: 'Mandatory for', type: 'select', options: ['All', 'Officers', 'Deck Officers', 'Engine Officers', 'Catering', 'Tanker Crew', 'Optional'], required: true },
        { name: 'validityMonths', label: 'Validity (months, 0 = none)', type: 'number' }, { name: 'durationDays', label: 'Duration (days)', type: 'number' },
        { name: 'institute', label: 'Training institute', span: 3 },
      ]} />
  )
}

function useCompliance() {
  const { crew, courses } = useLookups()
  const { trainingRecords } = useData('trainingRecords')
  return useMemo(() => {
    const byKey = {}
    trainingRecords.forEach((t) => {
      const k = `${t.crewId}|${t.courseId}`
      if (!byKey[k] || t.completedOn > byKey[k].completedOn) byKey[k] = t
    })
    const status = (c, course) => {
      if (!isMandatory(course, c)) return 'na'
      const r = byKey[`${c.id}|${course.id}`]
      if (!r) return 'missing'
      const d = daysUntil(r.expiryDate)
      if (d !== null && d < 0) return 'expired'
      if (d !== null && d <= 90) return 'due'
      return 'ok'
    }
    return { status, byKey, crew: crew.filter((c) => !['Inactive', 'Blacklisted'].includes(c.status)), courses }
  }, [crew, courses, trainingRecords])
}

function Matrix() {
  const { status, crew, courses } = useCompliance()
  const [dept, setDept] = useState('Deck')
  const [rank, setRank] = useState('')
  const list = crew.filter((c) => c.department === dept && (!rank || c.rank === rank))
  const sym = { ok: ['✓', 'cell-ok'], due: ['!', 'cell-warn'], expired: ['✕', 'cell-bad'], missing: ['✕', 'cell-bad'], na: ['·', 'cell-na'] }
  return (
    <Card title="Competency matrix" actions={<div className="row">
      <select className="input input-sm" value={dept} onChange={(e) => { setDept(e.target.value); setRank('') }}>{DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}</select>
      <select className="input input-sm" value={rank} onChange={(e) => setRank(e.target.value)}><option value="">All ranks</option>{ALL_RANKS.filter((r) => crew.some((c) => c.rank === r && c.department === dept)).map((r) => <option key={r}>{r}</option>)}</select>
    </div>}>
      <div className="row" style={{ marginBottom: 12, fontSize: 12 }}>
        <span className="chip"><span className="cell-ok" style={{ padding: '0 5px' }}>✓</span> Valid</span>
        <span className="chip"><span className="cell-warn" style={{ padding: '0 5px' }}>!</span> Refresher due ≤ 90d</span>
        <span className="chip"><span className="cell-bad" style={{ padding: '0 5px' }}>✕</span> Missing / expired</span>
        <span className="chip">· Not required</span>
      </div>
      <div style={{ overflowX: 'auto', maxHeight: 560 }}>
        <table className="matrix">
          <thead><tr><th>Seafarer</th>{courses.map((c) => <th key={c.id} title={c.name}>{c.code}</th>)}</tr></thead>
          <tbody>
            {list.map((c) => (
              <tr key={c.id}>
                <td><strong>{fullName(c)}</strong> <small className="muted">{c.rank}</small></td>
                {courses.map((course) => { const s = status(c, course); return <td key={course.id} className={sym[s][1]} title={`${course.name}: ${s}`}>{sym[s][0]}</td> })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

function Gaps() {
  const { status, crew, courses, byKey } = useCompliance()
  const toast = useToast()
  const rows = []
  crew.forEach((c) => courses.forEach((course) => {
    const s = status(c, course)
    if (s === 'missing' || s === 'expired' || s === 'due') rows.push({ id: `${c.id}-${course.id}`, crewId: c.id, rank: c.rank, course: course.name, mandatoryFor: course.mandatoryFor, gap: s === 'missing' ? 'Not completed' : s === 'expired' ? 'Expired' : 'Refresher due', expiry: byKey[`${c.id}|${course.id}`]?.expiryDate || '' })
  }))
  const { crewName } = useLookups()
  return (
    <div className="card">
      <DataTable rows={rows} exportTitle="Training Gap Report" module="training"
        filters={[{ key: 'gap', label: 'Gap', options: ['Not completed', 'Expired', 'Refresher due'] }, { key: 'course', label: 'Course', options: courses.map((c) => c.name) }]}
        columns={[
          { key: 'crewId', label: 'Seafarer', render: (r) => <CrewCell id={r.crewId} />, exportValue: (r) => `${r.crewId} ${crewName(r.crewId)}` },
          { key: 'rank', label: 'Rank' }, { key: 'course', label: 'Course' }, { key: 'mandatoryFor', label: 'Required for' },
          { key: 'gap', label: 'Gap', render: (r) => <Badge tone={r.gap === 'Refresher due' ? 'warn' : 'danger'}>{r.gap}</Badge> },
          { key: 'expiry', label: 'Expired / expiring', render: (r) => fmtDate(r.expiry) },
          { key: '_actions', label: '', render: (r) => <button className="icon-btn" title="Send reminder" onClick={async () => {
            await api.create('notifications', { type: 'Training', title: `Training required: ${r.course}`, body: `Please complete ${r.course} (${r.gap.toLowerCase()}).`, channel: 'Email', audience: 'Crew', crewId: r.crewId, date: new Date().toISOString().slice(0, 10), read: false, status: 'Sent' })
            toast('Reminder sent')
          }}><Send size={15} /></button> },
        ]} />
    </div>
  )
}

export default function Training() {
  const [tab, setTab] = useState('records')
  return (
    <>
      <div className="page-head"><div><h1>Training & Competency</h1><p className="muted">Training history, course master, mandatory requirements, competency matrix and gap reports.</p></div></div>
      <Tabs value={tab} onChange={setTab} tabs={[{ key: 'records', label: 'Training Records' }, { key: 'matrix', label: 'Competency Matrix' }, { key: 'gaps', label: 'Gap Report' }, { key: 'courses', label: 'Course Master' }]} />
      {tab === 'records' && <Records />}
      {tab === 'courses' && <Courses />}
      {tab === 'matrix' && <Matrix />}
      {tab === 'gaps' && <Gaps />}
    </>
  )
}

import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Pencil, Mail, Phone, MapPin, Globe, Anchor, MessageSquare, AlertTriangle } from 'lucide-react'
import { PageHeader, Card, KV, Badge, Tabs, Avatar, useToast } from '../components/ui'
import FormModal from '../components/FormModal'
import ResourcePage from '../components/ResourcePage'
import { useData } from '../api/hooks'
import { api } from '../api/client'
import { useLookups, VesselCell } from '../context/LookupContext'
import { useAuth } from '../context/AuthContext'
import { CREW_FIELDS, findDuplicates } from '../config/crewFields'
import { CREW_STATUS } from '../config/constants'
import { fmtDate, fmtDateTime, fullName, months, money, expiryStatus, daysUntil } from '../utils/format'
import { DOC_FIELDS, useDocColumns, DocActions, DocPreview } from './Documents'
import { MED_FIELDS, useMedColumns } from './Medical'
import { CONTRACT_FIELDS, useContractColumns, ContractActions } from './Contracts'
import { TRAINING_FIELDS, useTrainingColumns } from './Training'
import { APPRAISAL_FIELDS, useAppraisalColumns } from './Appraisals'
import { usePayColumns } from './Payroll'
import { useTravelColumns } from './Travel'

export default function CrewProfile() {
  const { id } = useParams()
  const { crewById, crew: allCrew } = useLookups()
  const c = crewById[id]
  const { can, user } = useAuth()
  const toast = useToast()
  const [tab, setTab] = useState('overview')
  const [editing, setEditing] = useState(false)
  const [preview, setPreview] = useState(null)
  const [comment, setComment] = useState('')
  const data = useData('documents', 'assignments', 'contracts', 'medicals', 'seaService', 'trainingRecords', 'appraisals', 'payroll', 'travel', 'comments', 'audit', 'applications')
  const docCols = useDocColumns({ showCrew: false })
  const medCols = useMedColumns({ showCrew: false })
  const conCols = useContractColumns({ showCrew: false })
  const trnCols = useTrainingColumns({ showCrew: false })
  const aprCols = useAppraisalColumns({ showCrew: false })
  const payCols = usePayColumns({ showCrew: false })
  const trvCols = useTravelColumns({ showCrew: false })

  if (!c) return <p className="muted">{allCrew.length ? 'Seafarer not found.' : 'Loading…'}</p>

  const mine = (list) => (list || []).filter((x) => x.crewId === id)
  const docs = mine(data.documents)
  const docAlerts = docs.filter((d) => daysUntil(d.expiryDate) !== null && daysUntil(d.expiryDate) <= 90)
  const current = mine(data.assignments).find((a) => a.status === 'Onboard')
  const dups = findDuplicates(allCrew, c, c.id)
  const activity = (data.audit || []).filter((a) => a.recordId === id || (a.detail || '').includes(id)).slice(0, 30)
  const embed = { embedded: true, hideHeader: true, transform: (rows) => rows.filter((r) => r.crewId === id), defaults: { crewId: id } }

  return (
    <>
      <PageHeader back={<Link to="/crew" className="back"><ArrowLeft size={14} /> Crew Database</Link>} title="" />
      <div className="card">
        <div className="profile-hero">
          <Avatar name={fullName(c)} src={c.photo} size={76} />
          <div style={{ flex: 1, minWidth: 260 }}>
            <div className="row"><h2>{fullName(c)}</h2><Badge>{c.status}</Badge></div>
            <div className="profile-meta">
              <span><Anchor size={14} /> {c.rank} · {c.department}</span>
              <span><strong>{c.id}</strong> · {c.employeeId}</span>
              <span><Globe size={14} /> {c.nationality}</span>
              <span><Phone size={14} /> {c.phone}</span>
              <span><Mail size={14} /> {c.email}</span>
              <span><MapPin size={14} /> {c.address}</span>
            </div>
          </div>
          <div className="row">
            {can('crew', 'edit') && (
              <select className="input input-sm" value={c.status} onChange={async (e) => { await api.update('crew', c.id, { status: e.target.value }); toast(`Status changed to ${e.target.value}`) }}>
                {CREW_STATUS.map((s) => <option key={s}>{s}</option>)}
              </select>
            )}
            {can('crew', 'edit') && <button className="btn" onClick={() => setEditing(true)}><Pencil size={15} /> Edit profile</button>}
          </div>
        </div>
        {(dups.length > 0 || docAlerts.length > 0) && (
          <div className="card-body" style={{ paddingTop: 0 }}>
            <div className="stack" style={{ gap: 8 }}>
              {dups.length > 0 && <div className="alert alert-warn"><AlertTriangle size={16} /> Possible duplicate record: {dups.map((d) => <Link key={d.id} className="link" to={`/crew/${d.id}`}> {d.id} ({fullName(d)})</Link>)}</div>}
              {docAlerts.length > 0 && <div className="alert alert-danger"><AlertTriangle size={16} /> {docAlerts.length} document{docAlerts.length > 1 ? 's' : ''} expired or expiring within 90 days: {docAlerts.map((d) => d.type).join(', ')}</div>}
            </div>
          </div>
        )}
      </div>

      <div className="mt">
        <Tabs value={tab} onChange={setTab} tabs={[
          { key: 'overview', label: 'Overview' },
          { key: 'documents', label: 'Documents', count: docs.length },
          { key: 'sea', label: 'Sea Service', count: mine(data.seaService).length },
          { key: 'assignments', label: 'Deployments', count: mine(data.assignments).length },
          { key: 'contracts', label: 'Contracts', count: mine(data.contracts).length },
          { key: 'medical', label: 'Medical', count: mine(data.medicals).length },
          { key: 'training', label: 'Training', count: mine(data.trainingRecords).length },
          { key: 'appraisals', label: 'Appraisals', count: mine(data.appraisals).length },
          { key: 'payroll', label: 'Payroll', count: mine(data.payroll).length },
          { key: 'travel', label: 'Travel', count: mine(data.travel).length },
          { key: 'activity', label: 'Comments & Activity' },
        ]} />
      </div>

      {tab === 'overview' && (
        <div className="grid g2">
          <Card title="Personal details">
            <KV cols={2} items={[['Full name', fullName(c)], ['Date of birth', fmtDate(c.dob)], ['Gender', c.gender], ['Nationality', c.nationality], ['Contact number', c.phone], ['Email', c.email], ['Address', c.address]]} />
          </Card>
          <Card title="Identity documents">
            <KV cols={2} items={[
              ['Passport no.', c.passportNo], ['Passport expiry', <span key="p">{fmtDate(c.passportExpiry)} <Badge tone={expiryStatus(c.passportExpiry).tone}>{expiryStatus(c.passportExpiry).label}</Badge></span>],
              ['CDC / Seaman book', c.cdcNo], ['CDC expiry', fmtDate(c.cdcExpiry)], ['INDOS no.', c.indosNo],
            ]} />
          </Card>
          <Card title="Professional details">
            <KV cols={2} items={[
              ['Department', c.department], ['Rank', c.rank], ['Total sea experience', months(c.totalExperienceMonths)], ['Experience in rank', months(c.rankExperienceMonths)],
              ['Previous employer', c.previousEmployer], ['Vessel type experience', c.vesselTypeExperience], ['Last sign-on', fmtDate(c.lastSignOn)], ['Last sign-off', fmtDate(c.lastSignOff)],
              ['Current availability', c.status === 'Onboard' ? 'Onboard' : c.availableFrom ? `From ${fmtDate(c.availableFrom)}` : c.status], ['Expected salary', money(c.expectedSalary)],
              ['Preferred vessel type', c.preferredVesselType], ['Preferred trading area', c.preferredTradingArea],
            ]} />
          </Card>
          <div className="stack">
            <Card title="Current deployment">
              {current ? <KV cols={2} items={[['Vessel', <VesselCell key="v" id={current.vesselId} />], ['Rank', current.rank], ['Signed on', fmtDate(current.signOnDate)], ['Planned sign-off', fmtDate(current.plannedSignOff)], ['Joining port', current.joiningPort], ['Approval', <Badge key="a">{current.approval}</Badge>]]} /> : <p className="muted">Not currently onboard.</p>}
            </Card>
            <Card title="Emergency contact / next of kin">
              <KV cols={3} items={[['Name', c.emergencyName], ['Relation', c.emergencyRelation], ['Phone', c.emergencyPhone]]} />
            </Card>
          </div>
        </div>
      )}

      {tab === 'documents' && <ResourcePage resource="documents" module="documents" title="Documents" {...embed} columns={docCols} fields={DOC_FIELDS} createLabel="Upload Document" formTitle="Upload document" exportTitle={`Documents ${c.id}`} rowActions={(r) => <DocActions row={r} onPreview={setPreview} />} />}
      {tab === 'sea' && (
        <ResourcePage resource="seaService" module="crew" title="Sea Service" {...embed} createLabel="Add Sea Service" formTitle="Add sea service record" exportTitle={`Sea Service ${c.id}`}
          columns={[{ key: 'vesselName', label: 'Vessel' }, { key: 'vesselType', label: 'Type' }, { key: 'rank', label: 'Rank' }, { key: 'company', label: 'Company' }, { key: 'grt', label: 'GT', align: 'right' },
            { key: 'signOn', label: 'Sign-on', render: (r) => fmtDate(r.signOn) }, { key: 'signOff', label: 'Sign-off', render: (r) => fmtDate(r.signOff) },
            { key: 'dur', label: 'Duration', exportValue: (r) => Math.round((new Date(r.signOff) - new Date(r.signOn)) / 2.63e9), render: (r) => months(Math.round((new Date(r.signOff) - new Date(r.signOn)) / 2.63e9)) }]}
          fields={[{ name: 'vesselName', label: 'Vessel name', required: true }, { name: 'vesselType', label: 'Vessel type' }, { name: 'rank', label: 'Rank', required: true }, { name: 'company', label: 'Company / employer' }, { name: 'grt', label: 'Gross tonnage', type: 'number' }, { name: 'signOn', label: 'Sign-on', type: 'date', required: true }, { name: 'signOff', label: 'Sign-off', type: 'date', required: true }]} />
      )}
      {tab === 'assignments' && (
        <Card pad={false}>
          <table className="simple-table">
            <thead><tr><th>Ref</th><th>Vessel</th><th>Rank</th><th>Sign-on</th><th>Sign-off</th><th>Port</th><th>Approval</th><th>Status</th></tr></thead>
            <tbody>{mine(data.assignments).sort((a, b) => b.signOnDate.localeCompare(a.signOnDate)).map((a) => <tr key={a.id}><td>{a.id}</td><td><VesselCell id={a.vesselId} /></td><td>{a.rank}</td><td>{fmtDate(a.signOnDate)}</td><td>{fmtDate(a.actualSignOff || a.plannedSignOff)}</td><td>{a.joiningPort}</td><td><Badge>{a.approval}</Badge></td><td><Badge>{a.status}</Badge></td></tr>)}</tbody>
          </table>
          {!mine(data.assignments).length && <p className="muted card-body">No deployments yet. <Link className="link" to="/planning?tab=availability">Assign from Crew Planning</Link></p>}
        </Card>
      )}
      {tab === 'contracts' && <ResourcePage resource="contracts" module="contracts" title="Contracts" {...embed} defaults={{ crewId: id, rank: c.rank }} columns={conCols} fields={CONTRACT_FIELDS} createLabel="New Contract" exportTitle={`Contracts ${c.id}`} rowActions={(r) => <ContractActions row={r} />} />}
      {tab === 'medical' && <ResourcePage resource="medicals" module="medical" title="Medical" {...embed} columns={medCols} fields={MED_FIELDS} createLabel="Add Medical" exportTitle={`Medical ${c.id}`} />}
      {tab === 'training' && <ResourcePage resource="trainingRecords" module="training" title="Training" {...embed} columns={trnCols} fields={TRAINING_FIELDS} createLabel="Add Training" exportTitle={`Training ${c.id}`} />}
      {tab === 'appraisals' && <ResourcePage resource="appraisals" module="appraisals" title="Appraisals" {...embed} defaults={{ crewId: id, rank: c.rank }} columns={aprCols} fields={APPRAISAL_FIELDS} createLabel="New Appraisal" exportTitle={`Appraisals ${c.id}`} />}
      {tab === 'payroll' && <ResourcePage resource="payroll" module="payroll" title="Payroll" {...embed} columns={payCols} exportTitle={`Payroll ${c.id}`} />}
      {tab === 'travel' && <ResourcePage resource="travel" module="travel" title="Travel" {...embed} columns={trvCols} exportTitle={`Travel ${c.id}`} />}
      {tab === 'activity' && (
        <div className="grid g2">
          <Card title="Internal comments">
            {can('crew', 'edit') && (
              <form className="row" style={{ marginBottom: 14, flexWrap: 'nowrap' }} onSubmit={async (e) => { e.preventDefault(); if (!comment.trim()) return; await api.create('comments', { crewId: id, author: `${user.name} (${user.role})`, date: new Date().toISOString(), text: comment.trim() }); setComment(''); toast('Comment added') }}>
                <input className="input" placeholder="Add an internal note (not visible to crew)…" value={comment} onChange={(e) => setComment(e.target.value)} />
                <button className="btn btn-primary"><MessageSquare size={15} /> Add</button>
              </form>
            )}
            <ul className="timeline">
              {mine(data.comments).sort((a, b) => (b.date || '').localeCompare(a.date || '')).map((m) => <li key={m.id}><strong>{m.author}</strong> <small className="muted">{fmtDateTime(m.date)}</small><p style={{ marginTop: 3 }}>{m.text}</p></li>)}
              {!mine(data.comments).length && <p className="muted">No comments yet.</p>}
            </ul>
          </Card>
          <Card title="Profile history & activity">
            <ul className="timeline">
              <li><strong>Registered</strong> <small className="muted">{fmtDate(c.createdAt)}</small></li>
              {mine(data.applications).map((a) => <li key={a.id}><strong>Applied</strong> to {a.vacancyId} <small className="muted">{fmtDate(a.appliedOn)} · {a.stage}</small></li>)}
              {activity.map((a) => <li key={a.id}><strong>{a.action}</strong> {a.resource} by {a.user} <small className="muted">{fmtDateTime(a.at)}{a.detail ? ` · ${a.detail}` : ''}</small></li>)}
            </ul>
          </Card>
        </div>
      )}

      <FormModal open={editing} title={`Edit ${fullName(c)}`} fields={CREW_FIELDS} initial={c} width={920} onClose={() => setEditing(false)} onSubmit={async (v) => { await api.update('crew', c.id, v); toast('Profile updated') }} />
      <DocPreview doc={preview} onClose={() => setPreview(null)} />
    </>
  )
}

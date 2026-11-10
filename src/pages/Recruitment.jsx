import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { FileDown, Check, X, UserPlus, Calendar, Briefcase, Users, ClipboardCheck, Send } from 'lucide-react'
import ResourcePage from '../components/ResourcePage'
import FormModal from '../components/FormModal'
import { Badge, Tabs, useToast, Stat, Avatar } from '../components/ui'
import { CrewCell, VesselCell, useLookups } from '../context/LookupContext'
import { useData } from '../api/hooks'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { ALL_RANKS, DEPARTMENTS, PIPELINE_STAGES, VACANCY_STATUS, CURRENCIES, PORTS, APPROVAL, rankDept } from '../config/constants'
import { CREW_FIELDS } from '../config/crewFields'
import { fmtDate, fmtDateTime, money, fullName, months, addDays } from '../utils/format'
import { offerLetterPDF } from '../utils/documents'

export const VACANCY_FIELDS = [
  { name: 'title', label: 'Vacancy title', required: true, span: 2 },
  { name: 'status', label: 'Status', type: 'select', options: VACANCY_STATUS, default: 'Open' },
  { name: 'clientId', label: 'Client', type: 'client', required: true },
  { name: 'vesselId', label: 'Vessel', type: 'vessel', required: true },
  { name: 'rank', label: 'Rank', type: 'select', options: ALL_RANKS, required: true, effect: (v) => ({ department: rankDept(v.rank) }) },
  { name: 'department', label: 'Department', type: 'select', options: DEPARTMENTS },
  { name: 'numberRequired', label: 'Number of crew required', type: 'number', min: 1, default: 1 },
  { name: 'minExperienceMonths', label: 'Min. experience (months)', type: 'number' },
  { name: 'mandatoryCertificates', label: 'Mandatory certificates', span: 3, placeholder: 'COC, STCW Basic, GMDSS…' },
  { name: 'salary', label: 'Salary / month', type: 'number' },
  { name: 'currency', label: 'Currency', type: 'select', options: CURRENCIES, default: 'USD' },
  { name: 'contractMonths', label: 'Contract duration (months)', type: 'number' },
  { name: 'joiningDate', label: 'Expected joining date', type: 'date' },
  { name: 'joiningPort', label: 'Joining port', type: 'select', options: PORTS },
  { name: 'deadline', label: 'Application deadline', type: 'date' },
  { name: 'description', label: 'Description', type: 'textarea', span: 3 },
]

const APP_FIELDS = [
  { name: 'vacancyId', label: 'Vacancy', type: 'vacancy', required: true, span: 2 },
  { name: 'stage', label: 'Stage', type: 'select', options: PIPELINE_STAGES, default: 'Sourcing' },
  { name: 'crewId', label: 'Candidate', type: 'crew', required: true, span: 2 },
  { name: 'source', label: 'Source', type: 'select', options: ['Portal', 'Referral', 'Database', 'Walk-in', 'Job Board'] },
  { type: 'section', label: 'Screening & interview' },
  { name: 'screeningResult', label: 'Screening', type: 'select', options: ['Pending', 'Shortlisted', 'Rejected'], default: 'Pending' },
  { name: 'interviewDate', label: 'Interview date & time', type: 'datetime-local' },
  { name: 'interviewer', label: 'Interviewer' },
  { name: 'assessmentScore', label: 'Technical assessment (%)', type: 'number', min: 0, max: 100 },
  { name: 'internalApproval', label: 'Internal approval', type: 'select', options: APPROVAL, default: 'Pending' },
  { name: 'clientApproval', label: 'Client approval', type: 'select', options: ['Not Sent', ...APPROVAL], default: 'Not Sent' },
  { name: 'remarks', label: 'Remarks', type: 'textarea', span: 3 },
]

function Vacancies() {
  const { clientName, vesselName } = useLookups()
  const { applications } = useData('applications')
  const toast = useToast()
  return (
    <ResourcePage resource="vacancies" module="recruitment" title="Vacancies" hideHeader createLabel="New Vacancy" formTitle="Create vacancy" exportTitle="Vacancies" fields={VACANCY_FIELDS}
      defaults={{ postedOn: new Date().toISOString().slice(0, 10) }}
      afterSave={async (v, isEdit) => {
        if (!isEdit && v.status === 'Open') {
          await api.create('notifications', { type: 'Vacancy', title: `New vacancy: ${v.title}`, body: `${v.rank} for ${vesselName(v.vesselId)} · joining ${fmtDate(v.joiningDate)} at ${v.joiningPort}`, channel: 'WhatsApp', audience: 'Crew', date: new Date().toISOString().slice(0, 10), read: false, status: 'Sent' })
          toast('Vacancy published to crew portal & notified', 'info')
        }
      }}
      filters={[{ key: 'status', label: 'Status', options: VACANCY_STATUS }, { key: 'department', label: 'Dept', options: DEPARTMENTS }, { key: 'rank', label: 'Rank', options: ALL_RANKS }]}
      initialFilters={{ status: 'Open' }}
      columns={[
        { key: 'id', label: 'Ref' },
        { key: 'title', label: 'Vacancy', render: (r) => <><strong>{r.title}</strong><br /><small className="muted">{clientName(r.clientId)}</small></> },
        { key: 'vesselId', label: 'Vessel', render: (r) => <VesselCell id={r.vesselId} />, exportValue: (r) => vesselName(r.vesselId) },
        { key: 'numberRequired', label: 'Req.' },
        { key: 'minExperienceMonths', label: 'Min. exp.', render: (r) => months(r.minExperienceMonths) },
        { key: 'salary', label: 'Salary', align: 'right', render: (r) => money(r.salary, r.currency) },
        { key: 'joiningDate', label: 'Joining', render: (r) => <>{fmtDate(r.joiningDate)}<br /><small className="muted">{r.joiningPort}</small></> },
        { key: 'deadline', label: 'Deadline', render: (r) => fmtDate(r.deadline) },
        { key: 'apps', label: 'Applicants', exportValue: (r) => applications.filter((a) => a.vacancyId === r.id).length, render: (r) => <span className="chip"><Users size={12} /> {applications.filter((a) => a.vacancyId === r.id).length}</span> },
        { key: 'status', label: 'Status', render: (r) => <Badge>{r.status}</Badge> },
      ]} />
  )
}

function useAppActions() {
  const { crewById, vacancyById, vesselById, clientById } = useLookups()
  const { contracts, salaryStructures } = useData('contracts', 'salaryStructures')
  const toast = useToast()
  const move = async (a, stage, extra = {}) => { await api.update('applications', a.id, { stage, ...extra }); toast(`Moved to ${stage}`) }
  const offer = async (a) => {
    const vac = vacancyById[a.vacancyId]
    await offerLetterPDF({ app: a, crew: crewById[a.crewId], vacancy: vac, vessel: vesselById[vac?.vesselId], client: clientById[vac?.clientId] })
    if (!a.offerSent) await api.update('applications', a.id, { offerSent: true, stage: a.stage === 'Selected' ? 'Offer & Contract' : a.stage })
  }
  const onboard = async (a) => {
    const vac = vacancyById[a.vacancyId]; const c = crewById[a.crewId]
    const start = vac.joiningDate || addDays(14); const end = addDays((vac.contractMonths || 6) * 30, start)
    await api.create('assignments', { crewId: c.id, vesselId: vac.vesselId, rank: vac.rank, signOnDate: start, plannedSignOff: end, joiningPort: vac.joiningPort, status: 'Planned', approval: 'Pending', fromApplication: a.id })
    if (!contracts.some((x) => x.crewId === c.id && ['Draft', 'Pending Approval'].includes(x.status))) {
      const s = salaryStructures.find((x) => x.rank === vac.rank) || {}
      await api.create('contracts', { crewId: c.id, vesselId: vac.vesselId, rank: vac.rank, startDate: start, endDate: end, durationMonths: vac.contractMonths || 6, basicWage: s.basic || vac.salary, fixedOT: s.fixedOT || 0, leavePay: s.leavePay || 0, otherAllowance: s.otherAllowance || 0, currency: vac.currency || 'USD', cba: 'Company CBA', terms: 'As per MLC 2006 and applicable CBA.', status: 'Pending Approval', approval: 'Pending', signed: false, version: 1 })
    }
    await api.update('crew', c.id, { status: 'Planned', rank: vac.rank, department: vac.department })
    await api.update('applications', a.id, { stage: 'Joining Preparation', status: 'Onboarded' })
    toast(`${fullName(c)} onboarded: assignment + draft contract created`)
  }
  return { move, offer, onboard }
}

function Pipeline() {
  const { applications } = useData('applications')
  const { vacancies, vacancyById, crewById } = useLookups()
  const { can } = useAuth()
  const { move, offer, onboard } = useAppActions()
  const [vac, setVac] = useState('')
  const [drag, setDrag] = useState(null)
  const [over, setOver] = useState(null)
  const [edit, setEdit] = useState(null)
  const toast = useToast()
  const list = applications.filter((a) => a.status !== 'Rejected' && (!vac || a.vacancyId === vac))

  return (
    <>
      <div className="row" style={{ marginBottom: 12 }}>
        <select className="input input-sm" value={vac} onChange={(e) => setVac(e.target.value)} style={{ minWidth: 280 }}>
          <option value="">All open vacancies</option>
          {vacancies.filter((v) => v.status !== 'Closed').map((v) => <option key={v.id} value={v.id}>{v.id} · {v.title}</option>)}
        </select>
        <span className="muted">Drag candidates between stages{can('recruitment', 'edit') ? '' : ' (read-only for your role)'}.</span>
      </div>
      <div className="kanban">
        {PIPELINE_STAGES.map((stage, i) => {
          const items = list.filter((a) => a.stage === stage)
          return (
            <div key={stage} className={`kcol ${over === stage ? 'drop' : ''}`}
              onDragOver={(e) => { if (can('recruitment', 'edit')) { e.preventDefault(); setOver(stage) } }}
              onDragLeave={() => setOver(null)}
              onDrop={() => { setOver(null); if (drag && drag.stage !== stage) move(drag, stage) }}>
              <div className="kcol-head"><span>{i + 1}. {stage}</span><span className="tab-count">{items.length}</span></div>
              {items.map((a) => {
                const c = crewById[a.crewId]; const v = vacancyById[a.vacancyId]
                return (
                  <div key={a.id} className="kcard" draggable={can('recruitment', 'edit')} onDragStart={() => setDrag(a)} onDragEnd={() => setDrag(null)} onDoubleClick={() => can('recruitment', 'edit') && setEdit(a)}>
                    <div className="row" style={{ flexWrap: 'nowrap' }}><Avatar name={fullName(c)} size={26} /><div style={{ minWidth: 0 }}><strong style={{ display: 'block' }}>{fullName(c)}</strong><small className="muted">{c?.rank} · {months(c?.totalExperienceMonths)}</small></div></div>
                    <small className="muted">{v?.title}</small>
                    <div className="row">
                      {a.assessmentScore !== '' && a.assessmentScore != null && <span className="chip">Score {a.assessmentScore}%</span>}
                      {a.interviewDate && <span className="chip"><Calendar size={11} /> {fmtDate(a.interviewDate)}</span>}
                    </div>
                    {stage === 'Client Approval' && (
                      <div className="row">
                        <Badge>{a.clientApproval}</Badge>
                        {can('recruitment', 'approve') && a.clientApproval !== 'Approved' && <>
                          <button className="btn btn-sm btn-ok" onClick={() => move(a, 'Selected', { clientApproval: 'Approved' })}><Check size={13} /> Approve</button>
                          <button className="btn btn-sm btn-warn" onClick={async () => { await api.update('applications', a.id, { clientApproval: 'Rejected', status: 'Rejected' }); toast('Candidate rejected by client', 'danger') }}><X size={13} /></button>
                        </>}
                      </div>
                    )}
                    {['Selected', 'Offer & Contract'].includes(stage) && can('recruitment', 'edit') && <button className="btn btn-sm" onClick={() => offer(a)}><FileDown size={13} /> Offer letter</button>}
                    {stage === 'Offer & Contract' && can('recruitment', 'edit') && <button className="btn btn-sm btn-primary" onClick={() => onboard(a)}><UserPlus size={13} /> Onboard candidate</button>}
                    {stage === 'Joining Preparation' && <Badge tone="ok">{a.status === 'Onboarded' ? 'Assignment created' : 'Preparing'}</Badge>}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
      <FormModal open={!!edit} title={`Application ${edit?.id}`} fields={APP_FIELDS} initial={edit} onClose={() => setEdit(null)} onSubmit={async (v) => { await api.update('applications', edit.id, v); toast('Application updated') }} />
    </>
  )
}

function Applications() {
  const { crewName, vacancyById, vacancies } = useLookups()
  const { can } = useAuth()
  const { move, offer, onboard } = useAppActions()
  const toast = useToast()
  return (
    <ResourcePage resource="applications" module="recruitment" title="Applications" hideHeader exportTitle="Recruitment MIS" fields={APP_FIELDS} createLabel="Add Candidate to Vacancy" formTitle="New application"
      defaults={{ appliedOn: new Date().toISOString().slice(0, 10), status: 'Active' }}
      validate={(v) => (v.assessmentScore !== undefined && v.assessmentScore !== '' && (v.assessmentScore < 0 || v.assessmentScore > 100) ? 'Score must be 0–100' : null)}
      filters={[{ key: 'stage', label: 'Stage', options: PIPELINE_STAGES }, { key: 'vacancyId', label: 'Vacancy', options: vacancies.map((v) => ({ value: v.id, label: `${v.id} ${v.rank}` })) }, { key: 'status', label: 'Status', options: ['Active', 'Onboarded', 'Rejected'] }, { key: 'source', label: 'Source', options: ['Portal', 'Referral', 'Database', 'Walk-in', 'Job Board'] }]}
      columns={[
        { key: 'id', label: 'Ref' },
        { key: 'crewId', label: 'Candidate', render: (r) => <CrewCell id={r.crewId} />, exportValue: (r) => `${r.crewId} ${crewName(r.crewId)}` },
        { key: 'vacancyId', label: 'Vacancy', exportValue: (r) => vacancyById[r.vacancyId]?.title, render: (r) => <>{vacancyById[r.vacancyId]?.title}<br /><small className="muted">{r.vacancyId}</small></> },
        { key: 'appliedOn', label: 'Applied', render: (r) => fmtDate(r.appliedOn) },
        { key: 'source', label: 'Source' },
        { key: 'screeningResult', label: 'Screening', render: (r) => <Badge>{r.screeningResult}</Badge> },
        { key: 'interviewDate', label: 'Interview', render: (r) => (r.interviewDate ? <>{fmtDateTime(r.interviewDate)}<br /><small className="muted">{r.interviewer}</small></> : '—') },
        { key: 'assessmentScore', label: 'Score', render: (r) => (r.assessmentScore === '' || r.assessmentScore == null ? '—' : `${r.assessmentScore}%`) },
        { key: 'internalApproval', label: 'Internal', render: (r) => <Badge>{r.internalApproval}</Badge> },
        { key: 'clientApproval', label: 'Client', render: (r) => <Badge>{r.clientApproval}</Badge> },
        { key: 'stage', label: 'Stage', render: (r) => <Badge tone="info">{r.stage}</Badge> },
      ]}
      rowActions={(r) => <>
        {can('recruitment', 'edit') && r.stage === 'Interview' && <button className="icon-btn" title="Send interview reminder" onClick={async () => { await api.create('notifications', { type: 'Interview', title: 'Interview reminder', body: `Interview for ${vacancyById[r.vacancyId]?.title} on ${fmtDateTime(r.interviewDate)}`, channel: 'SMS', audience: 'Crew', crewId: r.crewId, date: new Date().toISOString().slice(0, 10), read: false, status: 'Sent' }); toast('Interview reminder sent') }}><Send size={15} /></button>}
        {can('recruitment', 'approve') && r.internalApproval !== 'Approved' && ['Interview', 'Screening'].includes(r.stage) && <button className="icon-btn" title="Internal approval → send to client" onClick={() => move(r, 'Client Approval', { internalApproval: 'Approved', clientApproval: 'Pending' })}><ClipboardCheck size={15} color="var(--ok)" /></button>}
        {can('recruitment', 'edit') && ['Selected', 'Offer & Contract'].includes(r.stage) && <button className="icon-btn" title="Offer letter" onClick={() => offer(r)}><FileDown size={15} /></button>}
        {can('recruitment', 'edit') && r.stage === 'Offer & Contract' && r.status !== 'Onboarded' && <button className="icon-btn" title="Onboard" onClick={() => onboard(r)}><UserPlus size={15} /></button>}
      </>} />
  )
}

export default function Recruitment() {
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') || 'vacancies'
  const { vacancies } = useLookups()
  const { applications } = useData('applications')
  const { can } = useAuth()
  const toast = useToast()
  const [reg, setReg] = useState(false)
  const stats = useMemo(() => ({
    open: vacancies.filter((v) => v.status === 'Open').length,
    active: applications.filter((a) => a.status === 'Active').length,
    interviews: applications.filter((a) => a.stage === 'Interview').length,
    client: applications.filter((a) => a.stage === 'Client Approval').length,
    selected: applications.filter((a) => ['Selected', 'Offer & Contract', 'Joining Preparation'].includes(a.stage)).length,
  }), [vacancies, applications])

  return (
    <>
      <div className="page-head">
        <div><h1>Recruitment Management</h1><p className="muted">Vacancy → sourcing → screening → interview → client approval → selection → offer → joining.</p></div>
        {can('crew', 'create') && <div className="page-actions"><button className="btn" onClick={() => setReg(true)}><UserPlus size={16} /> Register Candidate</button></div>}
      </div>
      <div className="stats">
        <Stat label="Open vacancies" value={stats.open} icon={Briefcase} tone="blue" />
        <Stat label="Active applications" value={stats.active} icon={Users} tone="teal" />
        <Stat label="At interview" value={stats.interviews} icon={Calendar} tone="amber" />
        <Stat label="Awaiting client" value={stats.client} icon={ClipboardCheck} tone="amber" />
        <Stat label="Selected / offered" value={stats.selected} icon={Check} tone="green" />
      </div>
      <Tabs value={tab} onChange={(t) => setParams({ tab: t })} tabs={[{ key: 'vacancies', label: 'Vacancies' }, { key: 'pipeline', label: 'Pipeline Board' }, { key: 'applications', label: 'Applications' }]} />
      {tab === 'vacancies' && <Vacancies />}
      {tab === 'pipeline' && <Pipeline />}
      {tab === 'applications' && <Applications />}
      <FormModal open={reg} title="Register candidate" width={920}
        fields={[...CREW_FIELDS.map((f) => (f.name === 'status' ? { ...f, default: 'Candidate' } : f)), { type: 'section', label: 'CV' }, { name: 'cvFile', label: 'Upload CV', type: 'file', span: 2 }]}
        onClose={() => setReg(false)} onSubmit={async (v) => { const c = await api.create('crew', { ...v, createdAt: new Date().toISOString().slice(0, 10) }); toast(`Candidate ${c.id} registered`) }} />
    </>
  )
}

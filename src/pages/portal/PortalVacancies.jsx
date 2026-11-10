import { Briefcase, MapPin, Calendar, Check } from 'lucide-react'
import { Badge, Card, useToast, Progress } from '../../components/ui'
import { api } from '../../api/client'
import { useData } from '../../api/hooks'
import { PIPELINE_STAGES } from '../../config/constants'
import { fmtDate, money, months } from '../../utils/format'
import { usePortal } from './usePortal'

export default function PortalVacancies() {
  const { id, me, vacancies, vesselById, vacancyById, mine } = usePortal()
  const { applications } = useData('applications')
  const toast = useToast()
  const myApps = mine(applications)
  const open = vacancies.filter((v) => v.status === 'Open')
  if (!me) return null
  return (
    <>
      <div className="page-head"><div><h1>Vacancies</h1><p className="muted">Apply for open positions and track your application status.</p></div></div>
      <Card title="My applications" pad={false}>
        <table className="simple-table">
          <thead><tr><th>Vacancy</th><th>Applied</th><th>Stage</th><th style={{ width: 220 }}>Progress</th></tr></thead>
          <tbody>
            {myApps.map((a) => {
              const idx = PIPELINE_STAGES.indexOf(a.stage)
              return <tr key={a.id}><td><strong>{vacancyById[a.vacancyId]?.title}</strong><br /><small className="muted">{a.id}</small></td><td>{fmtDate(a.appliedOn)}</td><td>{a.status === 'Rejected' ? <Badge tone="danger">Not selected</Badge> : <Badge tone="info">{a.stage}</Badge>}</td><td><Progress value={idx + 1} max={PIPELINE_STAGES.length} tone={a.status === 'Rejected' ? 'danger' : 'info'} /></td></tr>
            })}
            {!myApps.length && <tr><td colSpan={4} className="muted">You haven't applied to any vacancy yet.</td></tr>}
          </tbody>
        </table>
      </Card>
      <h3 style={{ margin: '22px 0 12px' }}>Open positions ({open.length})</h3>
      <div className="grid g3">
        {open.map((v) => {
          const applied = myApps.some((a) => a.vacancyId === v.id)
          const eligible = me.totalExperienceMonths >= (v.minExperienceMonths || 0)
          return (
            <div key={v.id} className="vac-card">
              <div className="row" style={{ justifyContent: 'space-between' }}><Badge tone="info">{v.department}</Badge><small className="muted">{v.id}</small></div>
              <h3>{v.title}</h3>
              <small className="muted">{vesselById[v.vesselId]?.name} · {vesselById[v.vesselId]?.flag} flag</small>
              <div className="stack" style={{ gap: 4, fontSize: 13 }}>
                <span className="row"><Briefcase size={14} /> {money(v.salary, v.currency)}/month · {v.contractMonths} months</span>
                <span className="row"><Calendar size={14} /> Joining {fmtDate(v.joiningDate)} · apply by {fmtDate(v.deadline)}</span>
                <span className="row"><MapPin size={14} /> {v.joiningPort}</span>
              </div>
              <small><strong>Min. experience:</strong> {months(v.minExperienceMonths)} · <strong>Certificates:</strong> {v.mandatoryCertificates}</small>
              {applied ? <button className="btn" disabled><Check size={15} /> Applied</button>
                : <button className="btn btn-primary" onClick={async () => { await api.create('applications', { vacancyId: v.id, crewId: id, appliedOn: new Date().toISOString().slice(0, 10), stage: 'Sourcing', source: 'Portal', screeningResult: 'Pending', internalApproval: 'Pending', clientApproval: 'Not Sent', status: 'Active' }); toast('Application submitted') }}>Apply now</button>}
              {!eligible && !applied && <small style={{ color: 'var(--warn)' }}>Your sea experience is below the minimum – you may still apply.</small>}
            </div>
          )
        })}
      </div>
    </>
  )
}

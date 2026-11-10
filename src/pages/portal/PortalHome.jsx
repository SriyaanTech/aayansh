import { Link } from 'react-router-dom'
import { AlertTriangle, Ship, Bell, Briefcase, FileText, Plane } from 'lucide-react'
import { Avatar, Badge, Card, KV, Stat } from '../../components/ui'
import { useData } from '../../api/hooks'
import { fmtDate, fullName, daysUntil, expiryStatus } from '../../utils/format'
import { usePortal } from './usePortal'

export default function PortalHome() {
  const { me, mine, vesselName, vacancies } = usePortal()
  const d = useData('documents', 'assignments', 'notifications', 'applications', 'travel')
  if (!me) return <p className="muted">Loading…</p>
  const docs = mine(d.documents)
  const alerts = docs.filter((x) => daysUntil(x.expiryDate) !== null && daysUntil(x.expiryDate) <= 90)
  const rejected = docs.filter((x) => x.status === 'Rejected')
  const asg = mine(d.assignments).find((a) => a.status === 'Onboard') || mine(d.assignments).find((a) => a.status === 'Planned')
  const notes = (d.notifications || []).filter((n) => n.crewId === me.id || (n.audience === 'Crew' && !n.crewId)).sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 6)
  const apps = mine(d.applications).filter((a) => a.status === 'Active')
  const travel = mine(d.travel).find((t) => t.status === 'Booked' || t.status === 'Pending Approval')
  return (
    <>
      <div className="portal-hero">
        <Avatar name={fullName(me)} src={me.photo} size={64} />
        <div><h2>Welcome, {me.firstName}</h2><p>{me.rank} · {me.id} · <Badge>{me.status}</Badge></p></div>
      </div>
      {(alerts.length > 0 || rejected.length > 0) && (
        <div className="stack" style={{ gap: 8, marginBottom: 16 }}>
          {rejected.map((x) => <div key={x.id} className="alert alert-danger"><AlertTriangle size={16} /> {x.type} was rejected: {x.remarks || 'please re-upload'}. <Link className="link" to="/portal/documents">Upload again</Link></div>)}
          {alerts.length > 0 && <div className="alert alert-warn"><AlertTriangle size={16} /> {alerts.length} document(s) expired or expiring within 90 days: {alerts.map((x) => `${x.type} (${fmtDate(x.expiryDate)})`).join(', ')}</div>}
        </div>
      )}
      <div className="stats">
        <Stat label="Documents verified" value={`${docs.filter((x) => x.status === 'Verified').length}/${docs.length}`} icon={FileText} tone="green" />
        <Stat label="Open vacancies" value={vacancies.filter((v) => v.status === 'Open').length} icon={Briefcase} tone="blue" />
        <Stat label="My active applications" value={apps.length} icon={Briefcase} tone="teal" />
        <Stat label="Notifications" value={notes.filter((n) => !n.read).length} icon={Bell} tone="amber" />
      </div>
      <div className="grid g2">
        <Card title={asg?.status === 'Onboard' ? 'Current vessel' : 'Next assignment'} actions={<Ship size={16} />}>
          {asg ? <KV cols={2} items={[['Vessel', vesselName(asg.vesselId)], ['Rank', asg.rank], [asg.status === 'Onboard' ? 'Signed on' : 'Joining date', fmtDate(asg.signOnDate)], ['Planned sign-off', fmtDate(asg.plannedSignOff)], ['Port', asg.joiningPort], ['Status', <Badge key="s">{asg.status}</Badge>]]} /> : <p className="muted">No assignment yet. <Link to="/portal/vacancies" className="link">Browse vacancies</Link></p>}
          {travel && <div className="alert alert-info" style={{ marginTop: 14 }}><Plane size={16} /> Travel: {travel.airline} {travel.flightNo} on {fmtDate(travel.departure)} – <Link className="link" to="/portal/travel">details</Link></div>}
        </Card>
        <Card title="Notifications">
          <ul className="list">
            {notes.map((n) => <li key={n.id}><span><strong>{n.title}</strong><br /><small className="muted">{n.body}</small></span><small className="muted" style={{ whiteSpace: 'nowrap' }}>{fmtDate(n.date)}</small></li>)}
            {!notes.length && <li className="muted">No notifications.</li>}
          </ul>
        </Card>
      </div>
      <Card title="Certificate expiry dates" className="mt" pad={false}>
        <table className="simple-table"><thead><tr><th>Document</th><th>Number</th><th>Expiry</th><th>Alert</th><th>Verification</th></tr></thead>
          <tbody>{docs.map((x) => { const e = expiryStatus(x.expiryDate); return <tr key={x.id}><td>{x.type}</td><td>{x.number}</td><td>{fmtDate(x.expiryDate)}</td><td><Badge tone={e.tone}>{e.label}</Badge></td><td><Badge>{x.status}</Badge></td></tr> })}</tbody>
        </table>
      </Card>
    </>
  )
}

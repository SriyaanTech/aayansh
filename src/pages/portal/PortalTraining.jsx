import { Badge, Card } from '../../components/ui'
import { useData } from '../../api/hooks'
import { isMandatory } from '../../config/training'
import { fmtDate, expiryStatus, daysUntil } from '../../utils/format'
import { usePortal } from './usePortal'

export default function PortalTraining() {
  const { me, mine, courses } = usePortal()
  const { trainingRecords } = useData('trainingRecords')
  if (!me) return null
  const recs = mine(trainingRecords)
  const req = courses.filter((c) => isMandatory(c, me)).map((c) => {
    const r = recs.filter((x) => x.courseId === c.id).sort((a, b) => b.completedOn.localeCompare(a.completedOn))[0]
    const d = r ? daysUntil(r.expiryDate) : null
    const status = !r ? 'Required' : d !== null && d < 0 ? 'Expired' : d !== null && d <= 90 ? 'Refresher due' : 'Compliant'
    return { ...c, record: r, status }
  })
  return (
    <>
      <div className="page-head"><div><h1>Training Requirements</h1><p className="muted">Mandatory courses for your rank ({me.rank}) and your training history.</p></div></div>
      <Card title="Mandatory courses" pad={false}>
        <table className="simple-table">
          <thead><tr><th>Course</th><th>Completed</th><th>Valid until</th><th>Institute</th><th>Status</th></tr></thead>
          <tbody>{req.map((c) => (
            <tr key={c.id}><td><strong>{c.name}</strong><br /><small className="muted">{c.code}</small></td><td>{fmtDate(c.record?.completedOn)}</td><td>{fmtDate(c.record?.expiryDate)}</td><td>{c.record?.institute || c.institute}</td>
              <td><Badge tone={c.status === 'Compliant' ? 'ok' : c.status === 'Refresher due' ? 'warn' : 'danger'}>{c.status}</Badge></td></tr>
          ))}</tbody>
        </table>
      </Card>
      <Card title="Training history" pad={false}>
        <table className="simple-table">
          <thead><tr><th>Course</th><th>Certificate</th><th>Completed</th><th>Expiry</th></tr></thead>
          <tbody>{recs.map((r) => <tr key={r.id}><td>{courses.find((c) => c.id === r.courseId)?.name}</td><td>{r.certificateNo}</td><td>{fmtDate(r.completedOn)}</td><td>{fmtDate(r.expiryDate)} {r.expiryDate && <Badge tone={expiryStatus(r.expiryDate).tone}>{expiryStatus(r.expiryDate).label}</Badge>}</td></tr>)}</tbody>
        </table>
      </Card>
    </>
  )
}

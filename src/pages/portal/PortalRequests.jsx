import { useState } from 'react'
import { Send } from 'lucide-react'
import { Badge, Card, useToast } from '../../components/ui'
import FormModal from '../../components/FormModal'
import { api } from '../../api/client'
import { useData } from '../../api/hooks'
import { fmtDate } from '../../utils/format'
import { usePortal } from './usePortal'

export default function PortalRequests() {
  const { id, mine } = usePortal()
  const { requests, notifications } = useData('requests', 'notifications')
  const [open, setOpen] = useState(false)
  const toast = useToast()
  const notes = (notifications || []).filter((n) => n.crewId === id || (n.audience === 'Crew' && !n.crewId)).sort((a, b) => (b.date || '').localeCompare(a.date || ''))
  return (
    <>
      <div className="page-head"><div><h1>Requests & Messages</h1><p className="muted">Submit requests to the crewing team and see notifications sent to you.</p></div>
        <button className="btn btn-primary" onClick={() => setOpen(true)}><Send size={15} /> New request</button></div>
      <div className="grid g2">
        <Card title="My requests" pad={false}>
          <table className="simple-table">
            <thead><tr><th>Request</th><th>Date</th><th>Status</th></tr></thead>
            <tbody>{mine(requests).map((r) => <tr key={r.id}><td><strong>{r.subject}</strong><br /><small className="muted">{r.message}</small>{r.response && <div className="alert alert-ok" style={{ marginTop: 6, padding: '6px 10px' }}><small><strong>Response:</strong> {r.response}</small></div>}</td><td>{fmtDate(r.date)}</td><td><Badge>{r.status}</Badge></td></tr>)}
              {!mine(requests).length && <tr><td colSpan={3} className="muted">No requests yet.</td></tr>}</tbody>
          </table>
        </Card>
        <Card title="Notifications">
          <ul className="list">{notes.map((n) => <li key={n.id}><span><strong>{n.title}</strong><br /><small className="muted">{n.body}</small></span><small className="muted" style={{ whiteSpace: 'nowrap' }}>{fmtDate(n.date)} · {n.channel}</small></li>)}
            {!notes.length && <li className="muted">No notifications.</li>}</ul>
        </Card>
      </div>
      <FormModal open={open} title="New request to crewing team" width={600} onClose={() => setOpen(false)}
        fields={[{ name: 'subject', label: 'Subject', type: 'select', options: ['Leave extension', 'Allotment change', 'Salary query', 'Document query', 'Travel change', 'Certificate renewal support', 'Other'], required: true, span: 3 }, { name: 'message', label: 'Message', type: 'textarea', rows: 5, required: true, span: 3 }]}
        onSubmit={async (v) => { await api.create('requests', { ...v, crewId: id, date: new Date().toISOString().slice(0, 10), status: 'Open', response: '' }); toast('Request submitted') }} />
    </>
  )
}

import { useState } from 'react'
import { Send, Mail, MessageSquare, Smartphone, CheckCheck, Reply } from 'lucide-react'
import ResourcePage from '../components/ResourcePage'
import FormModal from '../components/FormModal'
import { Badge, Tabs, useToast, Card } from '../components/ui'
import { CrewCell, useLookups } from '../context/LookupContext'
import { useData, useConfig } from '../api/hooks'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { fmtDate } from '../utils/format'
import { CREW_STATUS } from '../config/constants'

const TEMPLATES = {
  'New vacancy': 'New vacancy: {rank} on {vessel}. Joining {date} at {port}. Apply via the crew portal.',
  'Interview reminder': 'Reminder: your interview is scheduled on {date}. Please be available 10 minutes early.',
  'Document expiry': 'Your {document} expires on {date}. Please upload the renewed certificate on the crew portal.',
  'Contract renewal': 'Your contract on {vessel} ends on {date}. Please contact the crewing team regarding renewal.',
  'Joining instructions': 'Joining instructions for {vessel} at {port} are available on the crew portal. Report to agent on arrival.',
  'Travel update': 'Travel update: your flight {flight} on {date} has been confirmed. Itinerary on the crew portal.',
}
const TYPES = ['General', 'Vacancy', 'Interview', 'Document Expiry', 'Contract', 'Joining', 'Travel', 'Training', 'Medical', 'Payroll']
const CH = { Email: Mail, SMS: Smartphone, WhatsApp: MessageSquare }

function Compose({ open, onClose }) {
  const { crew, vessels } = useLookups()
  const { assignments } = useData('assignments')
  const [settings] = useConfig('settings')
  const toast = useToast()
  const channels = ['Email', ...(settings?.smsEnabled ? ['SMS'] : []), ...(settings?.whatsappEnabled ? ['WhatsApp'] : [])]
  return (
    <FormModal open={open} title="Compose message" submitLabel="Send" width={760} onClose={onClose}
      fields={[
        { name: 'audienceType', label: 'Recipients', type: 'select', options: ['Individual seafarer', 'Crew by status', 'Crew onboard a vessel', 'Internal team'], required: true, default: 'Individual seafarer' },
        { name: 'crewId', label: 'Seafarer', type: 'crew', span: 2, showIf: (v) => v.audienceType === 'Individual seafarer', required: true },
        { name: 'status', label: 'Crew status', type: 'select', options: CREW_STATUS, span: 2, showIf: (v) => v.audienceType === 'Crew by status', required: true },
        { name: 'vesselId', label: 'Vessel', type: 'vessel', span: 2, showIf: (v) => v.audienceType === 'Crew onboard a vessel', required: true },
        { name: 'channel', label: 'Channel', type: 'select', options: channels, required: true, default: 'Email', hint: 'Enable SMS / WhatsApp in Settings' },
        { name: 'type', label: 'Category', type: 'select', options: TYPES, default: 'General' },
        { name: 'template', label: 'Template', type: 'select', options: Object.keys(TEMPLATES), effect: (v) => ({ body: TEMPLATES[v.template] || v.body, title: v.title || v.template }) },
        { name: 'title', label: 'Subject', required: true, span: 3 },
        { name: 'body', label: 'Message', type: 'textarea', rows: 5, required: true, span: 3 },
      ]}
      onSubmit={async (v) => {
        let targets = []
        if (v.audienceType === 'Individual seafarer') targets = [v.crewId]
        if (v.audienceType === 'Crew by status') targets = crew.filter((c) => c.status === v.status).map((c) => c.id)
        if (v.audienceType === 'Crew onboard a vessel') targets = assignments.filter((a) => a.vesselId === v.vesselId && a.status === 'Onboard').map((a) => a.crewId)
        const base = { type: v.type, title: v.title, body: v.body, channel: v.channel, date: new Date().toISOString().slice(0, 10), read: false, status: 'Sent' }
        if (v.audienceType === 'Internal team') await api.create('notifications', { ...base, audience: 'Internal' })
        else {
          // one history record per broadcast; backend will fan out to each recipient via SMTP / SMS / WhatsApp API
          for (const id of targets.slice(0, 200)) await api.create('notifications', { ...base, audience: 'Crew', crewId: id })
        }
        toast(`Sent via ${v.channel} to ${v.audienceType === 'Internal team' ? 'internal team' : `${targets.length} seafarer(s)`}${vessels.length ? '' : ''}`)
      }} />
  )
}

function History() {
  const { crewName } = useLookups()
  return (
    <ResourcePage resource="notifications" module="notifications" title="Communication history" hideHeader exportTitle="Communication History"
      filters={[{ key: 'channel', label: 'Channel', options: ['Email', 'SMS', 'WhatsApp'] }, { key: 'type', label: 'Category', options: TYPES.concat(['Document Expiry']) }, { key: 'audience', label: 'Audience', options: ['Crew', 'Internal'] }]}
      transform={(rows) => [...rows].sort((a, b) => (b.date || '').localeCompare(a.date || ''))}
      columns={[
        { key: 'date', label: 'Date', render: (r) => fmtDate(r.date) },
        { key: 'channel', label: 'Channel', render: (r) => { const I = CH[r.channel] || Mail; return <span className="chip"><I size={12} /> {r.channel}</span> } },
        { key: 'type', label: 'Category', render: (r) => <Badge tone="info">{r.type}</Badge> },
        { key: 'title', label: 'Subject', render: (r) => <><strong style={{ fontWeight: r.read ? 500 : 700 }}>{r.title}</strong><br /><small className="muted">{r.body}</small></> },
        { key: 'recipient', label: 'Recipient', exportValue: (r) => (r.crewId ? crewName(r.crewId) : r.audience), render: (r) => (r.crewId ? <CrewCell id={r.crewId} sub={false} /> : <span className="chip">{r.audience === 'Crew' ? 'All crew' : 'Internal team'}</span>) },
        { key: 'status', label: 'Status', render: (r) => <Badge>{r.status}</Badge> },
      ]}
      rowActions={(r) => !r.read && <button className="icon-btn" title="Mark read" onClick={() => api.update('notifications', r.id, { read: true })}><CheckCheck size={15} /></button>} />
  )
}

function Requests() {
  const { crewName } = useLookups()
  const { can } = useAuth()
  const toast = useToast()
  const [reply, setReply] = useState(null)
  return (
    <>
      <ResourcePage resource="requests" module="notifications" title="Crew requests" hideHeader exportTitle="Crew Requests"
        filters={[{ key: 'status', label: 'Status', options: ['Open', 'In Progress', 'Resolved'] }]}
        columns={[
          { key: 'id', label: 'Ref' }, { key: 'date', label: 'Date', render: (r) => fmtDate(r.date) },
          { key: 'crewId', label: 'Seafarer', render: (r) => <CrewCell id={r.crewId} />, exportValue: (r) => crewName(r.crewId) },
          { key: 'subject', label: 'Request', render: (r) => <><strong>{r.subject}</strong><br /><small className="muted">{r.message}</small></> },
          { key: 'response', label: 'Response' }, { key: 'status', label: 'Status', render: (r) => <Badge>{r.status}</Badge> },
        ]}
        rowActions={(r) => can('notifications', 'edit') && r.status !== 'Resolved' && <button className="icon-btn" title="Respond" onClick={() => setReply(r)}><Reply size={15} /></button>} />
      <FormModal open={!!reply} title={`Respond to ${reply?.id}`} width={560} initial={reply} onClose={() => setReply(null)}
        fields={[{ name: 'response', label: 'Response to seafarer', type: 'textarea', required: true, span: 3 }, { name: 'status', label: 'Status', type: 'select', options: ['Open', 'In Progress', 'Resolved'], required: true }]}
        onSubmit={async (v) => { await api.update('requests', reply.id, { response: v.response, status: v.status }); await api.create('notifications', { type: 'General', title: `Re: ${reply.subject}`, body: v.response, channel: 'Email', audience: 'Crew', crewId: reply.crewId, date: new Date().toISOString().slice(0, 10), read: false, status: 'Sent' }); toast('Response sent') }} />
    </>
  )
}

export default function Communication() {
  const [tab, setTab] = useState('history')
  const [compose, setCompose] = useState(false)
  const { can } = useAuth()
  const [settings] = useConfig('settings')
  return (
    <>
      <div className="page-head">
        <div><h1>Communication & Notifications</h1><p className="muted">Email, SMS and WhatsApp messaging, automated alerts, crew requests and full communication history.</p></div>
        {can('notifications', 'create') && <div className="page-actions"><button className="btn btn-primary" onClick={() => setCompose(true)}><Send size={16} /> Compose</button></div>}
      </div>
      <Tabs value={tab} onChange={setTab} tabs={[{ key: 'history', label: 'History' }, { key: 'requests', label: 'Crew Requests' }, { key: 'auto', label: 'Automated Alerts' }]} />
      {tab === 'history' && <History />}
      {tab === 'requests' && <Requests />}
      {tab === 'auto' && (
        <Card title="Automated notification rules">
          <table className="simple-table">
            <thead><tr><th>Trigger</th><th>Recipients</th><th>Channels</th><th>Status</th></tr></thead>
            <tbody>
              {[
                ['New vacancy published', 'Matching available crew', 'Email, WhatsApp'],
                ['Interview scheduled (24h before)', 'Candidate, interviewer', 'SMS, Email'],
                [`Document expiry (${(settings?.expiryAlertDays || [90, 60, 30]).join(' / ')} days)`, 'Seafarer, documentation team', 'Email, SMS'],
                ['Document expired', 'Seafarer, crewing manager', 'Email'],
                ['Contract ending (30 days)', 'Crewing manager, seafarer', 'Email'],
                ['Joining instructions issued', 'Seafarer', 'Email, WhatsApp'],
                ['Flight booked / changed', 'Seafarer, port agent', 'Email, SMS'],
                ['Medical expiry (60 days)', 'Seafarer, HR', 'Email'],
                ['Payslip published', 'Seafarer', 'Email'],
              ].map(([t, r, c]) => <tr key={t}><td>{t}</td><td>{r}</td><td>{c}</td><td><Badge tone="ok">Active</Badge></td></tr>)}
            </tbody>
          </table>
          <p className="muted" style={{ marginTop: 12 }}>Rules run on the backend scheduler. SMTP: {settings?.emailEnabled ? 'on' : 'off'} · SMS gateway: {settings?.smsEnabled ? 'on' : 'off'} · WhatsApp API: {settings?.whatsappEnabled ? 'on' : 'off'}.</p>
        </Card>
      )}
      <Compose open={compose} onClose={() => setCompose(false)} />
    </>
  )
}

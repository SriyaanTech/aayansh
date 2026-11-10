import ResourcePage from '../components/ResourcePage'
import { Badge } from '../components/ui'
import { fmtDateTime } from '../utils/format'

export default function Audit() {
  return (
    <ResourcePage resource="audit" module="audit" title="Audit Trail" subtitle="Every create, update, delete, login and configuration change, with user and timestamp."
      exportTitle="Audit Trail" readOnly
      filters={[{ key: 'action', label: 'Action', options: ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT'] }]}
      columns={[
        { key: 'at', label: 'Timestamp', render: (r) => fmtDateTime(r.at) },
        { key: 'user', label: 'User' },
        { key: 'action', label: 'Action', render: (r) => <Badge tone={{ CREATE: 'ok', UPDATE: 'info', DELETE: 'danger' }[r.action] || 'muted'}>{r.action}</Badge> },
        { key: 'resource', label: 'Module' },
        { key: 'recordId', label: 'Record' },
        { key: 'detail', label: 'Detail' },
      ]}>
      <div className="alert alert-info" style={{ marginBottom: 12 }}>Activity is recorded as you use the app. Try editing a record, then come back here.</div>
    </ResourcePage>
  )
}

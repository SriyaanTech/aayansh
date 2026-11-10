import { useEffect, useState } from 'react'
import { Save, RotateCcw, KeyRound } from 'lucide-react'
import ResourcePage from '../components/ResourcePage'
import { Badge, Tabs, Card, useToast } from '../components/ui'
import { useConfig } from '../api/hooks'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { ROLES } from '../config/constants'
import { MODULES, ACTIONS, DEFAULT_PERMISSIONS } from '../config/permissions'
import { fmtDate } from '../utils/format'

function Users() {
  const toast = useToast()
  return (
    <ResourcePage resource="users" module="users" title="Users" hideHeader exportTitle="System Users" createLabel="Invite User" formTitle="Invite user"
      filters={[{ key: 'role', label: 'Role', options: ROLES.filter((r) => r !== 'Crew Member') }, { key: 'status', label: 'Status', options: ['Active', 'Suspended'] }]}
      fields={[
        { name: 'name', label: 'Full name', required: true }, { name: 'email', label: 'Email', type: 'email', required: true },
        { name: 'role', label: 'Role', type: 'select', options: ROLES.filter((r) => r !== 'Crew Member'), required: true },
        { name: 'status', label: 'Status', type: 'select', options: ['Active', 'Suspended'], default: 'Active' },
        { name: 'mfa', label: 'Multi-factor authentication', type: 'checkbox', checkLabel: 'Require MFA' },
        { name: 'scope', label: 'Record access scope', type: 'select', options: ['All records', 'Assigned vessels only', 'Assigned client only'], default: 'All records', hint: 'Restricts client & vessel users to their own records' },
      ]}
      columns={[
        { key: 'name', label: 'Name', render: (r) => <><strong>{r.name}</strong><br /><small className="muted">{r.email}</small></> },
        { key: 'role', label: 'Role', render: (r) => <Badge tone="info">{r.role}</Badge> },
        { key: 'scope', label: 'Access scope', render: (r) => r.scope || 'All records' },
        { key: 'mfa', label: 'MFA', exportValue: (r) => (r.mfa ? 'On' : 'Off'), render: (r) => <Badge tone={r.mfa ? 'ok' : 'muted'}>{r.mfa ? 'Enabled' : 'Off'}</Badge> },
        { key: 'lastLogin', label: 'Last login', render: (r) => fmtDate(r.lastLogin) },
        { key: 'status', label: 'Status', render: (r) => <Badge>{r.status}</Badge> },
      ]}
      rowActions={(r) => <button className="icon-btn" title="Send password reset" onClick={() => toast(`Password reset link sent to ${r.email}`, 'info')}><KeyRound size={15} /></button>} />
  )
}

function Permissions() {
  const [stored, save] = useConfig('permissions')
  const { can } = useAuth()
  const toast = useToast()
  const [role, setRole] = useState('HR Manager')
  const [matrix, setMatrix] = useState(null)
  useEffect(() => { if (stored) setMatrix(JSON.parse(JSON.stringify(stored))) }, [stored])
  if (!matrix) return null
  const editable = can('users', 'edit') && role !== 'Super Admin'
  const toggle = (mod, act) => setMatrix((m) => {
    const cur = new Set(m[role][mod] || [])
    if (cur.has(act)) { cur.delete(act); if (act === 'view') cur.clear() } else { cur.add(act); cur.add('view') }
    return { ...m, [role]: { ...m[role], [mod]: [...cur] } }
  })
  return (
    <Card title="Role permissions" actions={<>
      <select className="input input-sm" value={role} onChange={(e) => setRole(e.target.value)}>{ROLES.filter((r) => r !== 'Crew Member').map((r) => <option key={r}>{r}</option>)}</select>
      {editable && <button className="btn btn-sm" onClick={() => setMatrix((m) => ({ ...m, [role]: DEFAULT_PERMISSIONS[role] }))}><RotateCcw size={14} /> Defaults</button>}
      {editable && <button className="btn btn-primary btn-sm" onClick={async () => { await save(matrix); toast(`Permissions saved for ${role}`) }}><Save size={14} /> Save</button>}
    </>}>
      {role === 'Super Admin' && <div className="alert alert-info" style={{ marginBottom: 12 }}>Super Admin always has complete application control.</div>}
      <div style={{ overflowX: 'auto' }}>
        <table className="matrix" style={{ width: '100%' }}>
          <thead><tr><th>Module</th>{ACTIONS.map((a) => <th key={a} style={{ textTransform: 'capitalize' }}>{a}</th>)}</tr></thead>
          <tbody>
            {MODULES.map((m) => (
              <tr key={m.key}>
                <td><strong>{m.label}</strong></td>
                {ACTIONS.map((a) => <td key={a}><input type="checkbox" style={{ width: 16, height: 16, accentColor: 'var(--accent)' }} disabled={!editable} checked={(matrix[role]?.[m.key] || []).includes(a)} onChange={() => toggle(m.key, a)} /></td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted" style={{ marginTop: 12 }}>Crew Members use the separate self-service portal and have no access to the admin panel.</p>
    </Card>
  )
}

export default function UsersRoles() {
  const [tab, setTab] = useState('users')
  return (
    <>
      <div className="page-head"><div><h1>Users & Roles</h1><p className="muted">Role-based access configurable by module and permitted action.</p></div></div>
      <Tabs value={tab} onChange={setTab} tabs={[{ key: 'users', label: 'Users' }, { key: 'perm', label: 'Roles & Permissions' }]} />
      {tab === 'users' ? <Users /> : <Permissions />}
    </>
  )
}

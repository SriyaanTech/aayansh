import { Shield } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function NoAccess() {
  return (
    <div className="card" style={{ maxWidth: 520, margin: '60px auto', textAlign: 'center' }}>
      <div className="card-body stack" style={{ alignItems: 'center' }}>
        <Shield size={36} color="var(--muted)" />
        <h2>No access</h2>
        <p className="muted">Your role doesn't have permission to view this module. Ask a Super Admin to update your access in Users &amp; Roles.</p>
        <Link to="/" className="btn">Back to dashboard</Link>
      </div>
    </div>
  )
}

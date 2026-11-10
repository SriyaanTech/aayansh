import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom'
import { Anchor, Home, UserCircle, FileText, Briefcase, FileSignature, Plane, Wallet, GraduationCap, MessageSquare, LogOut } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { Avatar } from '../../components/ui'

const LINKS = [
  ['/portal', 'Home', Home, true], ['/portal/profile', 'My Profile', UserCircle], ['/portal/documents', 'Documents', FileText],
  ['/portal/vacancies', 'Vacancies & Applications', Briefcase], ['/portal/contracts', 'Contracts', FileSignature], ['/portal/travel', 'Travel & Joining', Plane],
  ['/portal/payslips', 'Salary Slips', Wallet], ['/portal/training', 'Training', GraduationCap], ['/portal/requests', 'Requests & Messages', MessageSquare],
]

export default function PortalLayout() {
  const { user, logout } = useAuth()
  const nav = useNavigate()
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <div className="portal-top">
        <div className="portal-top-inner">
          <Link to="/portal" className="brand"><span className="brand-mark"><Anchor size={18} /></span><span><strong>CrewDesk</strong><small>Seafarer Portal</small></span></Link>
          <div className="spacer" />
          <Avatar name={user?.name} size={32} />
          <span className="user-meta" style={{ color: '#fff' }}><strong>{user?.name}</strong><small style={{ color: '#9fb4cf' }}>{user?.crewId}</small></span>
          <button className="icon-btn" style={{ color: '#cdd8e6' }} title="Sign out" onClick={() => { logout(); nav('/login?portal=crew') }}><LogOut size={18} /></button>
        </div>
      </div>
      <nav className="portal-nav">
        <div className="portal-nav-inner">
          {LINKS.map(([to, label, Icon, end]) => <NavLink key={to} to={to} end={end}><Icon size={15} /> {label}</NavLink>)}
        </div>
      </nav>
      <div className="portal-content"><Outlet /></div>
    </div>
  )
}

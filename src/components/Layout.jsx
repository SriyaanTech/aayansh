import { useState } from 'react'
import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom'
import {
  LayoutDashboard, Users, Briefcase, Ship, CalendarRange, FileText, FileSignature, HeartPulse, Plane, ArrowRightLeft,
  Star, Wallet, GraduationCap, Bell, BarChart3, Shield, History, Settings, LogOut, Menu, Search, Anchor,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useData } from '../api/hooks'
import { USING_MOCK } from '../api/client'
import { Avatar } from './ui'
import { fmtDate } from '../utils/format'

export const NAV = [
  { group: 'Overview', items: [{ to: '/', label: 'Dashboard', icon: LayoutDashboard, module: 'dashboard', end: true }] },
  { group: 'Crew', items: [
    { to: '/crew', label: 'Crew Database', icon: Users, module: 'crew' },
    { to: '/documents', label: 'Documents', icon: FileText, module: 'documents' },
    { to: '/medical', label: 'Medical & Fitness', icon: HeartPulse, module: 'medical' },
    { to: '/training', label: 'Training & Competency', icon: GraduationCap, module: 'training' },
  ] },
  { group: 'Recruitment', items: [{ to: '/recruitment', label: 'Recruitment', icon: Briefcase, module: 'recruitment' }] },
  { group: 'Operations', items: [
    { to: '/vessels', label: 'Vessels', icon: Ship, module: 'vessels' },
    { to: '/planning', label: 'Crew Planning', icon: CalendarRange, module: 'planning' },
    { to: '/sign-on-off', label: 'Sign-On / Sign-Off', icon: ArrowRightLeft, module: 'signonoff' },
    { to: '/travel', label: 'Travel & Joining', icon: Plane, module: 'travel' },
  ] },
  { group: 'HR & Finance', items: [
    { to: '/contracts', label: 'Contracts', icon: FileSignature, module: 'contracts' },
    { to: '/payroll', label: 'Payroll', icon: Wallet, module: 'payroll' },
    { to: '/appraisals', label: 'Appraisals', icon: Star, module: 'appraisals' },
  ] },
  { group: 'Insights', items: [
    { to: '/reports', label: 'Reports & MIS', icon: BarChart3, module: 'reports' },
    { to: '/communication', label: 'Communication', icon: Bell, module: 'notifications' },
  ] },
  { group: 'Administration', items: [
    { to: '/users', label: 'Users & Roles', icon: Shield, module: 'users' },
    { to: '/audit', label: 'Audit Trail', icon: History, module: 'audit' },
    { to: '/settings', label: 'Settings', icon: Settings, module: 'settings' },
  ] },
]

export default function Layout() {
  const { user, logout, can } = useAuth()
  const [open, setOpen] = useState(false)
  const [bell, setBell] = useState(false)
  const [q, setQ] = useState('')
  const nav = useNavigate()
  const { notifications } = useData('notifications')
  const unread = (notifications || []).filter((n) => !n.read && n.audience !== 'Crew').length

  return (
    <div className={`shell ${open ? 'nav-open' : ''}`}>
      <aside className="sidebar">
        <Link to="/" className="brand" onClick={() => setOpen(false)}>
          <span className="brand-mark"><Anchor size={18} /></span>
          <span>
            <strong>CrewDesk</strong>
            <small>Crew Management</small>
          </span>
        </Link>
        <nav>
          {NAV.map((g) => {
            const items = g.items.filter((i) => can(i.module, 'view'))
            if (!items.length) return null
            return (
              <div key={g.group} className="nav-group">
                <span className="nav-group-label">{g.group}</span>
                {items.map((i) => (
                  <NavLink key={i.to} to={i.to} end={i.end} className="nav-item" onClick={() => setOpen(false)}>
                    <i.icon size={17} /> <span>{i.label}</span>
                  </NavLink>
                ))}
              </div>
            )
          })}
        </nav>
        <div className="sidebar-foot">
          {USING_MOCK && <span className="demo-pill">Demo data mode</span>}
        </div>
      </aside>
      <div className="scrim" onClick={() => setOpen(false)} />

      <div className="main">
        <header className="topbar">
          <button className="icon-btn mobile-only" onClick={() => setOpen(true)} aria-label="Menu"><Menu size={20} /></button>
          <form className="search top-search" onSubmit={(e) => { e.preventDefault(); if (q.trim()) nav(`/crew?q=${encodeURIComponent(q.trim())}`) }}>
            <Search size={16} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search crew by name, ID, passport, CDC…" />
          </form>
          <div className="spacer" />
          <div className="dropdown">
            <button className="icon-btn bell" onClick={() => setBell((b) => !b)} onBlur={() => setTimeout(() => setBell(false), 200)} aria-label="Notifications">
              <Bell size={19} />
              {unread > 0 && <span className="dot">{unread}</span>}
            </button>
            {bell && (
              <div className="dropdown-menu notif-menu">
                <div className="notif-head"><strong>Notifications</strong>{can('notifications') && <Link to="/communication">View all</Link>}</div>
                {(notifications || []).filter((n) => n.audience !== 'Crew').slice(0, 6).map((n) => (
                  <div key={n.id} className={`notif ${n.read ? '' : 'unread'}`}>
                    <strong>{n.title}</strong>
                    <span>{n.body}</span>
                    <small className="muted">{fmtDate(n.date)} · {n.channel}</small>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="user-chip">
            <Avatar name={user?.name} size={32} />
            <span className="user-meta">
              <strong>{user?.name}</strong>
              <small>{user?.role}</small>
            </span>
            <button className="icon-btn" title="Sign out" onClick={() => { logout(); nav('/login') }}><LogOut size={17} /></button>
          </div>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Anchor, CheckCircle2, KeyRound } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { USING_MOCK } from '../api/client'
import { useData } from '../api/hooks'

export default function Login() {
  const [params] = useSearchParams()
  const [portal, setPortal] = useState(params.get('portal') === 'crew' ? 'crew' : 'staff')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mfa, setMfa] = useState(null)
  const [code, setCode] = useState('')
  const [error, setError] = useState(params.get('timeout') ? 'Your session timed out due to inactivity. Please sign in again.' : '')
  const [busy, setBusy] = useState(false)
  const { login, verifyMfa, user } = useAuth()
  const nav = useNavigate()
  const loc = useLocation()
  const { users, crew } = useData('users', 'crew')

  useEffect(() => {
    if (user) nav(user.role === 'Crew Member' ? '/portal' : loc.state?.from || '/', { replace: true })
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async (e) => {
    e.preventDefault(); setError(''); setBusy(true)
    try {
      const r = await login({ email, password, portal })
      if (r.mfaRequired) setMfa(r)
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  const submitMfa = async (e) => {
    e.preventDefault(); setError(''); setBusy(true)
    try { await verifyMfa({ email: mfa.email, code }) } catch (err) { setError(err.message) } finally { setBusy(false) }
  }

  return (
    <div className="auth">
      <div className="auth-art">
        <div className="brand" style={{ padding: 0 }}>
          <span className="brand-mark"><Anchor size={18} /></span>
          <span><strong>CrewDesk</strong><small>Integrated Crew Management System</small></span>
        </div>
        <div>
          <h2>Every seafarer, every vessel, one crew record.</h2>
          <p>Recruitment, certificates, deployment, contracts, travel, payroll and appraisals, all linked to the same Crew ID across the employment lifecycle.</p>
          <ul>
            {['Crew database & profiles', 'Recruitment pipeline', 'Certificate expiry alerts', 'Vessel manning & rotation', 'Contracts & payroll', 'Crew self-service portal'].map((t) => (
              <li key={t}><CheckCircle2 size={16} /> {t}</li>
            ))}
          </ul>
        </div>
        <small style={{ color: '#7f98b8' }}>© {new Date().getFullYear()} CrewDesk · Merchant Navy Crew Management</small>
        <svg className="waves" width="520" height="300" viewBox="0 0 520 300" fill="none">
          {[0, 1, 2, 3].map((i) => <path key={i} d={`M0 ${80 + i * 50} C 130 ${30 + i * 50}, 260 ${130 + i * 50}, 520 ${70 + i * 50}`} stroke="#fff" strokeWidth="2" />)}
        </svg>
      </div>

      <div className="auth-form">
        <div className="auth-box">
          {!mfa ? (
            <>
              <h1>Sign in</h1>
              <p className="muted" style={{ marginTop: 6 }}>{portal === 'staff' ? 'Admin, crewing, HR, operations & client users' : 'Seafarer self-service portal'}</p>
              <div className="seg">
                <button type="button" className={portal === 'staff' ? 'on' : ''} onClick={() => setPortal('staff')}>Staff Login</button>
                <button type="button" className={portal === 'crew' ? 'on' : ''} onClick={() => setPortal('crew')}>Crew Portal</button>
              </div>
              <form onSubmit={submit}>
                <label className="field"><span className="field-label">Email</span>
                  <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" autoComplete="username" />
                </label>
                <label className="field"><span className="field-label">Password</span>
                  <input className="input" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" />
                </label>
                {error && <div className="alert alert-danger">{error}</div>}
                <button className="btn btn-primary" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
              </form>
              {USING_MOCK && (
                <div className="demo-accounts">
                  <small className="muted">Demo mode: pick an account (any password of 4+ characters works).</small>
                  <div className="chips">
                    {portal === 'staff'
                      ? (users || []).map((u) => <button key={u.id} type="button" onClick={() => { setEmail(u.email); setPassword('demo1234') }}>{u.role}{u.mfa ? ' 🔐' : ''}</button>)
                      : (crew || []).filter((c) => c.status !== 'Candidate').slice(0, 4).map((c) => <button key={c.id} type="button" onClick={() => { setEmail(c.email); setPassword('demo1234') }}>{c.firstName} {c.lastName} · {c.rank}</button>)}
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <KeyRound size={30} color="var(--accent)" />
              <h1 style={{ marginTop: 10 }}>Two-factor verification</h1>
              <p className="muted" style={{ marginTop: 6 }}>Enter the 6-digit code from your authenticator app for {mfa.email}.</p>
              <form onSubmit={submitMfa}>
                <input className="input" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} placeholder="123456" autoFocus style={{ fontSize: 20, letterSpacing: 6, textAlign: 'center', height: 48 }} />
                {error && <div className="alert alert-danger">{error}</div>}
                <button className="btn btn-primary" disabled={busy}>{busy ? 'Verifying…' : 'Verify & continue'}</button>
                <button type="button" className="btn btn-ghost" onClick={() => { setMfa(null); setCode('') }}>Back</button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

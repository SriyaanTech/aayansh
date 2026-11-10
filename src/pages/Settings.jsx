import { useEffect, useState } from 'react'
import { Save, RotateCcw } from 'lucide-react'
import { PageHeader, Card, Field, useToast, useConfirm } from '../components/ui'
import { useConfig } from '../api/hooks'
import { api, USING_MOCK } from '../api/client'
import { CURRENCIES } from '../config/constants'

export default function Settings() {
  const [stored, save] = useConfig('settings')
  const [s, setS] = useState(null)
  const toast = useToast()
  const [confirm, node] = useConfirm()
  useEffect(() => { if (stored) setS(stored) }, [stored])
  if (!s) return null
  const set = (k) => (e) => setS({ ...s, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.type === 'number' ? Number(e.target.value) : e.target.value })
  const check = (k, label) => <span className="check"><input type="checkbox" checked={!!s[k]} onChange={set(k)} /> {label}</span>
  return (
    <>
      <PageHeader title="Settings" subtitle="Security, compliance and integration configuration."
        actions={<button className="btn btn-primary" onClick={async () => { await save(s); toast('Settings saved') }}><Save size={16} /> Save changes</button>} />
      <div className="grid g2">
        <Card title="Organisation">
          <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <Field label="Company name" span={2}><input className="input" value={s.companyName} onChange={set('companyName')} /></Field>
            <Field label="Default currency"><select className="input" value={s.defaultCurrency} onChange={set('defaultCurrency')}>{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</select></Field>
            <Field label="Document retention (years)"><input type="number" className="input" value={s.documentRetentionYears} onChange={set('documentRetentionYears')} /></Field>
          </div>
        </Card>
        <Card title="Security & authentication">
          <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <Field label="Session timeout (minutes)"><input type="number" min={5} className="input" value={s.sessionTimeoutMinutes} onChange={set('sessionTimeoutMinutes')} /></Field>
            <Field label="Password minimum length"><input type="number" min={8} className="input" value={s.passwordMinLength} onChange={set('passwordMinLength')} /></Field>
            <Field label="Password expiry (days)"><input type="number" className="input" value={s.passwordExpiryDays} onChange={set('passwordExpiryDays')} /></Field>
            <Field label="Password policy">{check('passwordRequireSymbols', 'Require symbols & numbers')}</Field>
            <Field label="Multi-factor authentication" span={2}>{check('enforceMfa', 'Enforce MFA for all staff users')}</Field>
          </div>
        </Card>
        <Card title="Expiry alerts">
          <Field label="Alert thresholds (days before expiry)">
            <input className="input" value={(s.expiryAlertDays || []).join(', ')} onChange={(e) => setS({ ...s, expiryAlertDays: e.target.value.split(',').map((x) => Number(x.trim())).filter(Boolean) })} />
          </Field>
          <p className="muted" style={{ marginTop: 8 }}>Applies to certificates, medicals, contracts and training refreshers.</p>
        </Card>
        <Card title="Notification channels">
          <div className="stack" style={{ gap: 4 }}>
            {check('emailEnabled', 'Email (SMTP)')}
            {check('smsEnabled', 'SMS gateway')}
            {check('whatsappEnabled', 'WhatsApp Business API')}
          </div>
        </Card>
        {USING_MOCK && (
          <Card title="Demo data">
            <p className="muted" style={{ marginBottom: 12 }}>The app is running on built-in sample data stored in this browser. Set <code>VITE_API_URL</code> to connect your backend.</p>
            <button className="btn" onClick={async () => { if (await confirm('Reset all demo data to the original sample set?', { danger: true, confirmLabel: 'Reset' })) { api.resetDemoData(); toast('Demo data reset') } }}><RotateCcw size={15} /> Reset demo data</button>
          </Card>
        )}
      </div>
      {node}
    </>
  )
}

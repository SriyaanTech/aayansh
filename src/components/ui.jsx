import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { X, CheckCircle2, AlertTriangle, Info } from 'lucide-react'
import { toneFor, initials } from '../utils/format'

/* ---------- Toasts ---------- */
const ToastCtx = createContext(() => {})
export function ToastProvider({ children }) {
  const [items, setItems] = useState([])
  const push = useCallback((msg, tone = 'ok') => {
    const id = Math.random()
    setItems((s) => [...s, { id, msg, tone }])
    setTimeout(() => setItems((s) => s.filter((x) => x.id !== id)), 3200)
  }, [])
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toasts">
        {items.map((t) => (
          <div key={t.id} className={`toast toast-${t.tone}`}>
            {t.tone === 'ok' ? <CheckCircle2 size={16} /> : t.tone === 'danger' ? <AlertTriangle size={16} /> : <Info size={16} />}
            <span>{t.msg}</span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}
export const useToast = () => useContext(ToastCtx)

/* ---------- Badge ---------- */
export function Badge({ children, tone }) {
  if (children === '' || children === undefined || children === null) return <span className="muted">—</span>
  return <span className={`badge badge-${tone || toneFor(children)}`}>{children}</span>
}

/* ---------- Avatar ---------- */
export function Avatar({ name, src, size = 34 }) {
  const hue = [...(name || 'x')].reduce((a, c) => a + c.charCodeAt(0), 0) % 360
  if (src) return <img className="avatar" src={src} alt="" style={{ width: size, height: size }} />
  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.38, background: `hsl(${hue} 45% 92%)`, color: `hsl(${hue} 45% 30%)` }}>
      {initials(name)}
    </span>
  )
}

/* ---------- Modal ---------- */
export function Modal({ open, title, onClose, children, footer, width = 720 }) {
  useEffect(() => {
    if (!open) return
    const k = (e) => e.key === 'Escape' && onClose?.()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className="modal" style={{ maxWidth: width }} role="dialog" aria-modal="true">
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  )
}

/* ---------- Confirm ---------- */
export function useConfirm() {
  const [state, setState] = useState(null)
  const confirm = (message, opts = {}) => new Promise((resolve) => setState({ message, ...opts, resolve }))
  const node = state && (
    <Modal open title={state.title || 'Please confirm'} onClose={() => { state.resolve(false); setState(null) }} width={440}
      footer={<>
        <button className="btn" onClick={() => { state.resolve(false); setState(null) }}>Cancel</button>
        <button className={`btn ${state.danger ? 'btn-danger' : 'btn-primary'}`} onClick={() => { state.resolve(true); setState(null) }}>{state.confirmLabel || 'Confirm'}</button>
      </>}>
      <p>{state.message}</p>
    </Modal>
  )
  return [confirm, node]
}

/* ---------- Tabs ---------- */
export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((t) => {
        const key = t.key || t
        return (
          <button key={key} role="tab" aria-selected={value === key} className={`tab ${value === key ? 'active' : ''}`} onClick={() => onChange(key)}>
            {t.label || t}
            {t.count !== undefined && <span className="tab-count">{t.count}</span>}
          </button>
        )
      })}
    </div>
  )
}

/* ---------- Layout helpers ---------- */
export function PageHeader({ title, subtitle, actions, back }) {
  return (
    <div className="page-head">
      <div>
        {back}
        <h1>{title}</h1>
        {subtitle && <p className="muted">{subtitle}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  )
}

export function Card({ title, actions, children, className = '', pad = true }) {
  return (
    <section className={`card ${className}`}>
      {(title || actions) && (
        <div className="card-head">
          {title && <h3>{title}</h3>}
          {actions && <div className="card-actions">{actions}</div>}
        </div>
      )}
      <div className={pad ? 'card-body' : ''}>{children}</div>
    </section>
  )
}

export function Stat({ label, value, hint, icon: Icon, tone = 'blue', onClick }) {
  return (
    <button type="button" className={`stat stat-${tone} ${onClick ? 'clickable' : ''}`} onClick={onClick} disabled={!onClick}>
      {Icon && <span className="stat-icon"><Icon size={18} /></span>}
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
      {hint && <span className="stat-hint">{hint}</span>}
    </button>
  )
}

export function Empty({ title = 'Nothing here yet', children }) {
  return (
    <div className="empty">
      <strong>{title}</strong>
      {children && <p className="muted">{children}</p>}
    </div>
  )
}

export function Field({ label, children, hint, span }) {
  return (
    <label className={`field ${span ? `span-${span}` : ''}`}>
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  )
}

export function KV({ items, cols = 3 }) {
  return (
    <dl className="kv" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
      {items.map(([k, v]) => (
        <div key={k}><dt>{k}</dt><dd>{v === '' || v === undefined || v === null ? '—' : v}</dd></div>
      ))}
    </dl>
  )
}

/* ---------- Searchable select ---------- */
export function SearchSelect({ value, onChange, options, placeholder = 'Search…', required }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const ref = useRef(null)
  const selected = options.find((o) => o.value === value)
  useEffect(() => {
    const h = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false)
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  const filtered = options.filter((o) => `${o.label} ${o.sub || ''} ${o.value}`.toLowerCase().includes(q.toLowerCase())).slice(0, 60)
  return (
    <div className="ss" ref={ref}>
      <input
        className="input"
        value={open ? q : selected ? selected.label : ''}
        placeholder={selected ? selected.label : placeholder}
        onFocus={() => { setOpen(true); setQ('') }}
        onChange={(e) => setQ(e.target.value)}
        required={required && !value}
      />
      {open && (
        <div className="ss-menu">
          {filtered.length === 0 && <div className="ss-empty">No matches</div>}
          {filtered.map((o) => (
            <button type="button" key={o.value} className={`ss-item ${o.value === value ? 'sel' : ''}`} onMouseDown={(e) => { e.preventDefault(); onChange(o.value); setOpen(false) }}>
              <span>{o.label}</span>
              {o.sub && <small className="muted">{o.sub}</small>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function Stars({ value = 0, max = 5 }) {
  return (
    <span className="stars" aria-label={`${value} of ${max}`}>
      {Array.from({ length: max }).map((_, i) => <span key={i} className={i < Math.round(value) ? 'on' : ''}>★</span>)}
      <small>{Number(value).toFixed(1)}</small>
    </span>
  )
}

export function Progress({ value, max = 100, tone }) {
  const pct = Math.max(0, Math.min(100, (value / (max || 1)) * 100))
  const t = tone || (pct >= 100 ? 'ok' : pct >= 75 ? 'info' : pct >= 50 ? 'warn' : 'danger')
  return <div className="progress"><span className={`progress-bar pb-${t}`} style={{ width: `${pct}%` }} /></div>
}

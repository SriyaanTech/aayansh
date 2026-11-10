export const fullName = (c) => (c ? `${c.firstName || ''} ${c.lastName || ''}`.trim() : '—')

export function fmtDate(v) {
  if (!v) return '—'
  const d = new Date(v)
  if (isNaN(d)) return v
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}
export function fmtDateTime(v) {
  if (!v) return '—'
  const d = new Date(v)
  if (isNaN(d)) return v
  return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function daysUntil(v) {
  if (!v) return null
  const d = new Date(v); const t = new Date()
  d.setHours(0, 0, 0, 0); t.setHours(0, 0, 0, 0)
  return Math.round((d - t) / 86400000)
}

// Expiry buckets per spec: 90 / 60 / 30 days + expired
export function expiryStatus(v) {
  const n = daysUntil(v)
  if (n === null) return { label: 'No Expiry', tone: 'muted', days: null }
  if (n < 0) return { label: 'Expired', tone: 'danger', days: n }
  if (n <= 30) return { label: '≤ 30 days', tone: 'danger', days: n }
  if (n <= 60) return { label: '≤ 60 days', tone: 'warn', days: n }
  if (n <= 90) return { label: '≤ 90 days', tone: 'caution', days: n }
  return { label: 'Valid', tone: 'ok', days: n }
}

export function money(v, cur = 'USD') {
  if (v === '' || v === null || v === undefined || isNaN(v)) return '—'
  try { return new Intl.NumberFormat('en-US', { style: 'currency', currency: cur, maximumFractionDigits: 0 }).format(v) } catch { return `${cur} ${Number(v).toLocaleString()}` }
}

export const months = (m) => {
  if (m === '' || m == null) return '—'
  const y = Math.floor(m / 12); const r = m % 12
  return [y ? `${y}y` : '', r ? `${r}m` : ''].filter(Boolean).join(' ') || '0m'
}

export const today = () => new Date().toISOString().slice(0, 10)
export const addDays = (n, base = new Date()) => { const d = new Date(base); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10) }

export const initials = (name = '') => name.split(' ').filter(Boolean).slice(0, 2).map((s) => s[0]).join('').toUpperCase()

const TONES = {
  ok: ['Active', 'Verified', 'Approved', 'Fit', 'Paid', 'Open', 'Onboard', 'In Service', 'Completed', 'Settled', 'Booked', 'Yes', 'Eligible', 'Resolved', 'Sent', 'Selected', 'Shortlisted', 'OK to Board'],
  info: ['Available', 'Planned', 'Processing', 'In Progress', 'Interview', 'Screening', 'Client Approval', 'Offer & Contract', 'Joining Preparation', 'Sourcing', 'Requested', 'Applied'],
  warn: ['Pending', 'Pending Approval', 'Hold', 'Temporarily Unfit', 'On Leave', 'Draft', 'Dry Dock', 'Review Required', 'Not Sent', 'On Hold', 'Candidate'],
  danger: ['Rejected', 'Unfit', 'Expired', 'Closed', 'Terminated', 'Inactive', 'Blacklisted', 'Cancelled', 'No', 'Laid Up', 'Sold'],
}
export function toneFor(status) {
  for (const [tone, list] of Object.entries(TONES)) if (list.includes(status)) return tone
  return 'muted'
}

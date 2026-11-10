// In-browser mock database (persisted to localStorage).
// Replaced transparently by the real REST backend when VITE_API_URL is set — see client.js.
import { buildSeed } from './mockData'
import { DEFAULT_PERMISSIONS } from '../config/permissions'

const KEY = 'crewdesk_db_v2'

const PREFIX = {
  crew: 'CRW', vessels: 'VSL', clients: 'CLI', documents: 'DOC', assignments: 'ASG', contracts: 'CON', medicals: 'MED',
  seaService: 'SS', comments: 'CMT', vacancies: 'VAC', applications: 'APP', travel: 'TRV', signOns: 'SON', signOffs: 'SOF',
  appraisals: 'APR', payroll: 'PAY', salaryStructures: 'SAL', courses: 'CRS', trainingRecords: 'TRN', notifications: 'NTF',
  requests: 'REQ', users: 'USR', audit: 'AUD',
}

let db = null
const listeners = new Set()

function load() {
  if (db) return db
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) db = JSON.parse(raw)
  } catch { /* ignore */ }
  if (!db) {
    db = { ...buildSeed(), permissions: DEFAULT_PERMISSIONS, settings: defaultSettings() }
    persist()
  }
  return db
}

export function defaultSettings() {
  return {
    companyName: 'CrewDesk Ship Management',
    sessionTimeoutMinutes: 30,
    enforceMfa: false,
    passwordMinLength: 10,
    passwordRequireSymbols: true,
    passwordExpiryDays: 90,
    expiryAlertDays: [90, 60, 30],
    documentRetentionYears: 7,
    defaultCurrency: 'USD',
    emailEnabled: true,
    smsEnabled: true,
    whatsappEnabled: false,
  }
}

function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(db)) } catch { /* quota */ }
}

function emit(resource) {
  listeners.forEach((fn) => fn(resource))
}

export function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

function nextId(resource) {
  const prefix = PREFIX[resource] || resource.slice(0, 3).toUpperCase()
  const items = load()[resource] || []
  const max = items.reduce((m, x) => {
    const n = parseInt(String(x.id).split('-').pop(), 10)
    return Number.isFinite(n) && n > m ? n : m
  }, 0)
  const width = String(items[0]?.id || '').split('-').pop()?.length || 4
  return `${prefix}-${String(max + 1).padStart(Math.max(4, width), '0')}`
}

function currentActor() {
  try { return JSON.parse(sessionStorage.getItem('crewdesk_session'))?.user?.name || 'System' } catch { return 'System' }
}

function log(action, resource, id, detail = '') {
  if (resource === 'audit') return
  const d = load()
  d.audit = d.audit || []
  d.audit.unshift({ id: `AUD-${String(d.audit.length + 1).padStart(6, '0')}`, at: new Date().toISOString(), user: currentActor(), action, resource, recordId: id, detail })
  if (d.audit.length > 2000) d.audit.length = 2000
}

export const mockStore = {
  list(resource) {
    return [...(load()[resource] || [])]
  },
  get(resource, id) {
    return (load()[resource] || []).find((x) => x.id === id) || null
  },
  create(resource, data) {
    const d = load()
    d[resource] = d[resource] || []
    const record = { ...data, id: data.id || nextId(resource) }
    d[resource].unshift(record)
    log('CREATE', resource, record.id)
    persist(); emit(resource)
    return record
  },
  update(resource, id, patch) {
    const d = load()
    const list = d[resource] || []
    const idx = list.findIndex((x) => x.id === id)
    if (idx < 0) throw new Error(`${resource} ${id} not found`)
    list[idx] = { ...list[idx], ...patch, id }
    log('UPDATE', resource, id, Object.keys(patch).join(', '))
    persist(); emit(resource)
    return list[idx]
  },
  remove(resource, id) {
    const d = load()
    d[resource] = (d[resource] || []).filter((x) => x.id !== id)
    log('DELETE', resource, id)
    persist(); emit(resource)
    return true
  },
  getObject(key) {
    return load()[key]
  },
  setObject(key, value) {
    load()[key] = value
    log('UPDATE', key, '-', 'configuration')
    persist(); emit(key)
    return value
  },
  logEvent(action, detail) {
    log(action, 'auth', '-', detail)
    persist(); emit('audit')
  },
  reset() {
    localStorage.removeItem(KEY)
    db = null
    load()
    emit('*')
  },
}

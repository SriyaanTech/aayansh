// Module keys used throughout the app for navigation and RBAC.
export const MODULES = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'crew', label: 'Crew Database' },
  { key: 'recruitment', label: 'Recruitment' },
  { key: 'vessels', label: 'Vessel Management' },
  { key: 'planning', label: 'Crew Planning' },
  { key: 'documents', label: 'Documents' },
  { key: 'contracts', label: 'Contracts' },
  { key: 'medical', label: 'Medical & Fitness' },
  { key: 'travel', label: 'Travel & Joining' },
  { key: 'signonoff', label: 'Sign-On / Sign-Off' },
  { key: 'appraisals', label: 'Performance & Appraisal' },
  { key: 'payroll', label: 'Payroll' },
  { key: 'training', label: 'Training & Competency' },
  { key: 'notifications', label: 'Communication' },
  { key: 'reports', label: 'Reports & MIS' },
  { key: 'users', label: 'Users & Roles' },
  { key: 'audit', label: 'Audit Trail' },
  { key: 'settings', label: 'Settings' },
]

export const ACTIONS = ['view', 'create', 'edit', 'delete', 'approve', 'export']

const all = ACTIONS
const ro = ['view']
const rw = ['view', 'create', 'edit']
const rwe = ['view', 'create', 'edit', 'export']
const full = ['view', 'create', 'edit', 'delete', 'approve', 'export']

const grant = (map) => {
  const out = {}
  MODULES.forEach((m) => { out[m.key] = map[m.key] || [] })
  return out
}

export const DEFAULT_PERMISSIONS = {
  'Super Admin': grant(Object.fromEntries(MODULES.map((m) => [m.key, all]))),
  'HR Manager': grant({ dashboard: ro, crew: full, recruitment: rwe, vessels: ro, planning: ro, documents: full, contracts: rwe, medical: full, travel: ro, signonoff: ro, appraisals: rwe, payroll: ro, training: full, notifications: rw, reports: ['view', 'export'], audit: ro }),
  'Crewing Manager': grant({ dashboard: ro, crew: rwe, recruitment: rwe, vessels: rwe, planning: full, documents: rw, contracts: full, medical: ro, travel: full, signonoff: full, appraisals: ro, payroll: ro, training: ro, notifications: rw, reports: ['view', 'export'] }),
  'Recruitment Manager': grant({ dashboard: ro, crew: rwe, recruitment: full, vessels: ro, documents: ro, contracts: ro, notifications: rw, reports: ['view', 'export'] }),
  'Recruitment Executive': grant({ dashboard: ro, crew: rw, recruitment: rw, vessels: ro, documents: ro, notifications: ro }),
  'Documentation Executive': grant({ dashboard: ro, crew: ro, documents: ['view', 'create', 'edit', 'approve', 'export'], medical: rw, training: rw, notifications: ro, reports: ['view', 'export'] }),
  'Operations Manager': grant({ dashboard: ro, crew: ro, vessels: full, planning: ['view', 'edit', 'approve'], travel: full, signonoff: full, documents: ro, notifications: rw, reports: ['view', 'export'] }),
  'Accounts Manager': grant({ dashboard: ro, crew: ro, contracts: ro, payroll: full, signonoff: ro, travel: ro, reports: ['view', 'export'] }),
  'Vessel Master': grant({ dashboard: ro, crew: ro, vessels: ro, signonoff: ['view', 'edit', 'approve'], appraisals: rw, documents: ro, training: ro }),
  'Client Representative': grant({ dashboard: ro, recruitment: ['view', 'approve'], vessels: ro, crew: ro }),
  'Crew Member': grant({}),
}

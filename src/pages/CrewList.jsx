import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Copy } from 'lucide-react'
import DataTable from '../components/DataTable'
import FormModal from '../components/FormModal'
import { PageHeader, Badge, Tabs, useToast, Avatar } from '../components/ui'
import { useLookups } from '../context/LookupContext'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { CREW_FIELDS, findDuplicates } from '../config/crewFields'
import { ALL_RANKS, CREW_STATUS, DEPARTMENTS, VESSEL_TYPES } from '../config/constants'
import { fullName, months, fmtDate, money } from '../utils/format'

export default function CrewList() {
  const { crew, loading } = useLookups()
  const [params] = useSearchParams()
  const nav = useNavigate()
  const { can } = useAuth()
  const toast = useToast()
  const [tab, setTab] = useState('all')
  const [adding, setAdding] = useState(false)
  const q = params.get('q') || ''

  const dupIds = useMemo(() => {
    const ids = new Set()
    crew.forEach((c) => { if (findDuplicates(crew, c, c.id).length) ids.add(c.id) })
    return ids
  }, [crew])

  const rows = useMemo(() => {
    let r = crew
    if (tab === 'duplicates') r = r.filter((c) => dupIds.has(c.id))
    else if (tab !== 'all') r = r.filter((c) => c.status === tab)
    if (q) {
      const n = q.toLowerCase()
      r = r.filter((c) => [fullName(c), c.id, c.employeeId, c.passportNo, c.cdcNo, c.indosNo, c.email, c.phone].some((v) => String(v || '').toLowerCase().includes(n)))
    }
    return r
  }, [crew, tab, q, dupIds])

  const columns = [
    { key: 'name', label: 'Seafarer', exportValue: (r) => fullName(r), sortValue: (r) => fullName(r), render: (r) => (
      <span className="crew-cell"><Avatar name={fullName(r)} src={r.photo} size={30} /><span><strong>{fullName(r)} {dupIds.has(r.id) && <Copy size={12} color="var(--warn)" />}</strong><small className="muted">{r.id} · {r.employeeId}</small></span></span>
    ) },
    { key: 'rank', label: 'Rank' },
    { key: 'department', label: 'Dept.' },
    { key: 'nationality', label: 'Nationality' },
    { key: 'totalExperienceMonths', label: 'Sea exp.', render: (r) => months(r.totalExperienceMonths), exportValue: (r) => r.totalExperienceMonths },
    { key: 'passportNo', label: 'Passport' },
    { key: 'cdcNo', label: 'CDC' },
    { key: 'availableFrom', label: 'Available from', render: (r) => fmtDate(r.availableFrom) },
    { key: 'expectedSalary', label: 'Exp. salary', align: 'right', render: (r) => money(r.expectedSalary) },
    { key: 'status', label: 'Status', render: (r) => <Badge>{r.status}</Badge> },
  ]

  const filters = [
    { key: 'department', label: 'Dept', options: DEPARTMENTS },
    { key: 'rank', label: 'Rank', options: ALL_RANKS },
    { key: 'nationality', label: 'Nationality', options: [...new Set(crew.map((c) => c.nationality))].sort() },
    { key: 'vesselType', label: 'Vessel exp.', options: VESSEL_TYPES, test: (r, v) => (r.vesselTypeExperience || '').includes(v) },
    { key: 'exp', label: 'Min exp.', options: [{ value: '12', label: '≥ 1 year' }, { value: '36', label: '≥ 3 years' }, { value: '60', label: '≥ 5 years' }, { value: '120', label: '≥ 10 years' }], test: (r, v) => r.totalExperienceMonths >= Number(v) },
  ]

  const counts = Object.fromEntries(CREW_STATUS.map((s) => [s, crew.filter((c) => c.status === s).length]))

  return (
    <>
      <PageHeader
        title="Crew Database"
        subtitle="Central master of all seafarers – every module links to this Crew ID."
        actions={can('crew', 'create') && <button className="btn btn-primary" onClick={() => setAdding(true)}><Plus size={16} /> Register Seafarer</button>}
      />
      {q && <div className="alert alert-info" style={{ marginBottom: 12 }}>Showing results for “{q}”. <a className="link" onClick={() => nav('/crew')} style={{ cursor: 'pointer' }}>Clear</a></div>}
      <Tabs value={tab} onChange={setTab} tabs={[
        { key: 'all', label: 'All', count: crew.length },
        ...['Available', 'Onboard', 'Planned', 'On Leave', 'Candidate', 'Inactive'].map((s) => ({ key: s, label: s, count: counts[s] || 0 })),
        { key: 'duplicates', label: 'Possible duplicates', count: dupIds.size },
      ]} />
      <div className="card">
        <DataTable columns={columns} rows={rows} loading={loading} filters={filters} exportTitle="Crew Master" module="crew" onRowClick={(r) => nav(`/crew/${r.id}`)} searchPlaceholder="Search name, ID, passport, CDC, INDOS…" />
      </div>
      <FormModal
        open={adding}
        title="Register seafarer"
        fields={[...CREW_FIELDS, { name: '_confirmDup', type: 'checkbox', label: 'Duplicate check', checkLabel: 'Not a duplicate – save anyway', span: 3, showIf: (v) => findDuplicates(crew, v).length > 0 }]}
        onClose={() => setAdding(false)}
        validate={(v) => {
          const d = findDuplicates(crew, v)
          if (d.length && !v._confirmDup) return `Possible duplicate of ${d.map((x) => `${x.id} (${fullName(x)})`).join(', ')}. Matching passport, CDC, email or name + DOB. Tick "Save anyway" to continue.`
        }}
        onSubmit={async (v) => {
          const { _confirmDup, ...data } = v
          const c = await api.create('crew', { ...data, createdAt: new Date().toISOString().slice(0, 10) })
          toast(`${c.id} registered`)
          nav(`/crew/${c.id}`)
        }}
        submitLabel="Register"
        width={920}
      />
    </>
  )
}

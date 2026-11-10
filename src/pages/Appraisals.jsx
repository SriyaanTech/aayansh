import ResourcePage from '../components/ResourcePage'
import { Badge, Stars, Stat } from '../components/ui'
import { CrewCell, VesselCell, useLookups } from '../context/LookupContext'
import { ALL_RANKS } from '../config/constants'
import { fmtDate } from '../utils/format'
import { useData } from '../api/hooks'
import { Star, ThumbsUp, ThumbsDown, GraduationCap } from 'lucide-react'

const score = { type: 'select', options: [{ value: '1', label: '1 – Poor' }, { value: '2', label: '2 – Below expectations' }, { value: '3', label: '3 – Meets expectations' }, { value: '4', label: '4 – Good' }, { value: '5', label: '5 – Excellent' }], required: true }
const overallOf = (v) => {
  const s = ['technical', 'safety', 'behaviour', 'teamwork'].map((k) => Number(v[k] || 0))
  return s.every(Boolean) ? Math.round((s.reduce((a, b) => a + b, 0) / 4) * 10) / 10 : ''
}

export const APPRAISAL_FIELDS = [
  { name: 'crewId', label: 'Seafarer', type: 'crew', required: true, span: 2, effect: (v, refs) => ({ rank: refs.crew.find((c) => c.id === v.crewId)?.rank || v.rank }) },
  { name: 'vesselId', label: 'Vessel', type: 'vessel', required: true },
  { name: 'rank', label: 'Rank', type: 'select', options: ALL_RANKS },
  { name: 'periodFrom', label: 'Period from', type: 'date', required: true },
  { name: 'periodTo', label: 'Period to', type: 'date', required: true },
  { name: 'evaluator', label: 'Evaluator', type: 'select', options: ['Master', 'Chief Engineer', 'Chief Officer', 'Superintendent'], required: true },
  { type: 'section', label: 'Evaluation' },
  { name: 'technical', label: 'Technical competency', ...score, effect: (v) => ({ overall: overallOf(v) }) },
  { name: 'safety', label: 'Safety & discipline', ...score, effect: (v) => ({ overall: overallOf(v) }) },
  { name: 'behaviour', label: 'Behaviour', ...score, effect: (v) => ({ overall: overallOf(v) }) },
  { name: 'teamwork', label: 'Teamwork', ...score, effect: (v) => ({ overall: overallOf(v) }) },
  { name: 'overall', label: 'Overall rating', type: 'number', disabled: true, hint: 'Auto-calculated average' },
  { name: 'rehire', label: 'Rehire recommendation', type: 'select', options: ['Yes', 'No', 'With Reservations'], required: true },
  { name: 'trainingRecommendation', label: 'Training recommendations', span: 3 },
  { name: 'comments', label: 'Evaluator comments', type: 'textarea', span: 3 },
]

export function useAppraisalColumns({ showCrew = true } = {}) {
  const { crewName, vesselName } = useLookups()
  return [
    ...(showCrew ? [{ key: 'crewId', label: 'Seafarer', render: (r) => <CrewCell id={r.crewId} />, exportValue: (r) => `${r.crewId} ${crewName(r.crewId)}` }] : []),
    { key: 'vesselId', label: 'Vessel', render: (r) => <VesselCell id={r.vesselId} />, exportValue: (r) => vesselName(r.vesselId) },
    { key: 'period', label: 'Period', exportValue: (r) => `${r.periodFrom} – ${r.periodTo}`, render: (r) => <small>{fmtDate(r.periodFrom)} – {fmtDate(r.periodTo)}</small> },
    { key: 'evaluator', label: 'Evaluator' },
    { key: 'technical', label: 'Tech.' },
    { key: 'safety', label: 'Safety' },
    { key: 'behaviour', label: 'Behav.' },
    { key: 'teamwork', label: 'Team' },
    { key: 'overall', label: 'Overall', render: (r) => <Stars value={r.overall} /> },
    { key: 'rehire', label: 'Rehire', render: (r) => <Badge>{r.rehire}</Badge> },
    { key: 'trainingRecommendation', label: 'Training rec.' },
  ]
}

export default function Appraisals() {
  const columns = useAppraisalColumns()
  const { appraisals } = useData('appraisals')
  const avg = appraisals.length ? (appraisals.reduce((s, a) => s + Number(a.overall || 0), 0) / appraisals.length).toFixed(1) : '—'
  return (
    <ResourcePage resource="appraisals" module="appraisals" title="Performance & Appraisal" subtitle="Master / Chief Engineer evaluations, rehire recommendations and training needs."
      createLabel="New Appraisal" formTitle="New appraisal" exportTitle="Performance Report" columns={columns} fields={APPRAISAL_FIELDS}
      beforeSave={(v) => ({ ...v, overall: overallOf(v) })}
      filters={[{ key: 'rehire', label: 'Rehire', options: ['Yes', 'No', 'With Reservations'] }, { key: 'evaluator', label: 'Evaluator', options: ['Master', 'Chief Engineer', 'Chief Officer', 'Superintendent'] }]}>
      <div className="stats">
        <Stat label="Appraisals on record" value={appraisals.length} icon={Star} tone="blue" />
        <Stat label="Average rating" value={avg} icon={Star} tone="teal" />
        <Stat label="Recommended for rehire" value={appraisals.filter((a) => a.rehire === 'Yes').length} icon={ThumbsUp} tone="green" />
        <Stat label="Not recommended" value={appraisals.filter((a) => a.rehire === 'No').length} icon={ThumbsDown} tone="red" />
        <Stat label="Training recommended" value={appraisals.filter((a) => a.trainingRecommendation).length} icon={GraduationCap} tone="amber" />
      </div>
    </ResourcePage>
  )
}

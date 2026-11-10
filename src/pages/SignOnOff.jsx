import { useState } from 'react'
import { Check } from 'lucide-react'
import ResourcePage from '../components/ResourcePage'
import { Badge, Tabs, useToast } from '../components/ui'
import { CrewCell, VesselCell, useLookups } from '../context/LookupContext'
import { useData } from '../api/hooks'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { ALL_RANKS, PORTS, SIGNOFF_REASONS } from '../config/constants'
import { fmtDate, addDays, today } from '../utils/format'

const yes = (v) => <Badge tone={v ? 'ok' : 'warn'}>{v ? 'Yes' : 'Pending'}</Badge>

function SignOn() {
  const { crewName, vesselName, vesselById } = useLookups()
  const { assignments, contracts } = useData('assignments', 'contracts')
  const { can } = useAuth()
  const toast = useToast()
  return (
    <ResourcePage resource="signOns" module="signonoff" title="Sign-On" hideHeader exportTitle="Sign-On Register" createLabel="Record Sign-On" formTitle="Record sign-on"
      fields={[
        { name: 'crewId', label: 'Seafarer', type: 'crew', required: true, span: 2, filter: (o, v, refs) => ['Planned', 'Available'].includes(refs.crew.find((c) => c.id === o.value)?.status),
          effect: (v, refs) => { const a = assignments.find((x) => x.crewId === v.crewId && x.status === 'Planned'); const c = refs.crew.find((x) => x.id === v.crewId); return a ? { vesselId: a.vesselId, rank: a.rank, joiningDate: a.signOnDate, port: a.joiningPort } : { rank: c?.rank } } },
        { name: 'rank', label: 'Rank', type: 'select', options: ALL_RANKS, required: true },
        { name: 'vesselId', label: 'Vessel assignment', type: 'vessel', required: true },
        { name: 'joiningDate', label: 'Joining date', type: 'date', required: true, default: today },
        { name: 'port', label: 'Joining port', type: 'select', options: PORTS, required: true },
        { name: 'joiningConfirmed', label: 'Joining confirmation', type: 'checkbox', checkLabel: 'Crew has joined', default: true },
        { name: 'masterConfirmed', label: 'Master confirmation', type: 'checkbox', checkLabel: 'Confirmed by Master' },
        { name: 'contractCommenced', label: 'Contract commencement', type: 'checkbox', checkLabel: 'Contract started', default: true },
        { name: 'documentsReceived', label: 'Sign-on documents', type: 'checkbox', checkLabel: 'Crew list / sign-on docs received' },
        { name: 'fileName', label: 'Upload sign-on documents', type: 'file', span: 2 },
      ]}
      afterSave={async (s, isEdit) => {
        if (isEdit) return
        const a = assignments.find((x) => x.crewId === s.crewId && x.status === 'Planned' && x.vesselId === s.vesselId)
        if (a) await api.update('assignments', a.id, { status: 'Onboard', signOnDate: s.joiningDate, approval: 'Approved' })
        else await api.create('assignments', { crewId: s.crewId, vesselId: s.vesselId, rank: s.rank, signOnDate: s.joiningDate, plannedSignOff: addDays(180, s.joiningDate), joiningPort: s.port, status: 'Onboard', approval: 'Approved' })
        await api.update('crew', s.crewId, { status: 'Onboard', lastSignOn: s.joiningDate, availableFrom: '' })
        const con = contracts.find((c) => c.crewId === s.crewId && ['Draft', 'Pending Approval'].includes(c.status))
        if (con && s.contractCommenced) await api.update('contracts', con.id, { status: 'Active', startDate: s.joiningDate })
        toast(`${crewName(s.crewId)} signed on ${vesselById[s.vesselId]?.name}`)
      }}
      columns={[
        { key: 'crewId', label: 'Seafarer', render: (r) => <CrewCell id={r.crewId} />, exportValue: (r) => `${r.crewId} ${crewName(r.crewId)}` },
        { key: 'vesselId', label: 'Vessel', render: (r) => <VesselCell id={r.vesselId} />, exportValue: (r) => vesselName(r.vesselId) },
        { key: 'rank', label: 'Rank' },
        { key: 'joiningDate', label: 'Joining date', render: (r) => fmtDate(r.joiningDate) },
        { key: 'port', label: 'Port' },
        { key: 'joiningConfirmed', label: 'Joined', render: (r) => yes(r.joiningConfirmed), exportValue: (r) => (r.joiningConfirmed ? 'Yes' : 'No') },
        { key: 'masterConfirmed', label: 'Master conf.', render: (r) => yes(r.masterConfirmed), exportValue: (r) => (r.masterConfirmed ? 'Yes' : 'No') },
        { key: 'contractCommenced', label: 'Contract', render: (r) => yes(r.contractCommenced), exportValue: (r) => (r.contractCommenced ? 'Yes' : 'No') },
        { key: 'documentsReceived', label: 'Docs', render: (r) => yes(r.documentsReceived), exportValue: (r) => (r.documentsReceived ? 'Yes' : 'No') },
      ]}
      rowActions={(r) => can('signonoff', 'approve') && !r.masterConfirmed && <button className="icon-btn" title="Master confirm" onClick={async () => { await api.update('signOns', r.id, { masterConfirmed: true }); toast('Master confirmation recorded') }}><Check size={15} color="var(--ok)" /></button>} />
  )
}

function SignOff() {
  const { crewName, vesselName, vesselById, crewById } = useLookups()
  const { assignments, contracts } = useData('assignments', 'contracts')
  const toast = useToast()
  return (
    <ResourcePage resource="signOffs" module="signonoff" title="Sign-Off" hideHeader exportTitle="Crew Movement – Sign-Off" createLabel="Record Sign-Off" formTitle="Record sign-off"
      fields={[
        { name: 'crewId', label: 'Seafarer (onboard)', type: 'crew', required: true, span: 2, filter: (o, v, refs) => refs.crew.find((c) => c.id === o.value)?.status === 'Onboard',
          effect: (v) => { const a = assignments.find((x) => x.crewId === v.crewId && x.status === 'Onboard'); return a ? { vesselId: a.vesselId, rank: a.rank, signOffDate: a.plannedSignOff < today() ? today() : a.plannedSignOff } : {} } },
        { name: 'rank', label: 'Rank', type: 'select', options: ALL_RANKS, required: true },
        { name: 'vesselId', label: 'Vessel', type: 'vessel', required: true },
        { name: 'signOffDate', label: 'Sign-off date', type: 'date', required: true, default: today },
        { name: 'port', label: 'Sign-off port', type: 'select', options: PORTS, required: true },
        { name: 'reason', label: 'Reason for sign-off', type: 'select', options: SIGNOFF_REASONS, required: true, default: 'Contract Completed' },
        { name: 'masterAppraisal', label: 'Master appraisal', type: 'select', options: ['Excellent', 'Good', 'Satisfactory', 'Poor'], required: true },
        { name: 'settlementStatus', label: 'Final settlement', type: 'select', options: ['Pending', 'Settled'], default: 'Pending', hint: 'Initiates settlement in Payroll' },
        { name: 'nextEligibility', label: 'Next deployment eligibility', type: 'select', options: ['Eligible', 'Review Required', 'Not Eligible'], default: 'Eligible' },
        { name: 'remarks', label: 'Remarks', type: 'textarea', span: 3 },
      ]}
      afterSave={async (s, isEdit) => {
        if (isEdit) return
        const a = assignments.find((x) => x.crewId === s.crewId && x.status === 'Onboard')
        if (a) await api.update('assignments', a.id, { status: 'Completed', actualSignOff: s.signOffDate })
        const con = contracts.find((c) => c.crewId === s.crewId && c.status === 'Active')
        if (con) await api.update('contracts', con.id, { status: 'Completed' })
        const v = vesselById[s.vesselId]
        await api.create('seaService', { crewId: s.crewId, vesselName: v?.name, vesselType: v?.type, rank: s.rank, company: v?.manager, signOn: a?.signOnDate || crewById[s.crewId]?.lastSignOn, signOff: s.signOffDate, grt: v?.grt })
        await api.update('crew', s.crewId, { status: s.nextEligibility === 'Not Eligible' ? 'Inactive' : 'On Leave', lastSignOff: s.signOffDate, availableFrom: addDays(60, s.signOffDate) })
        toast(`${crewName(s.crewId)} signed off – availability and history updated`)
      }}
      columns={[
        { key: 'crewId', label: 'Seafarer', render: (r) => <CrewCell id={r.crewId} />, exportValue: (r) => `${r.crewId} ${crewName(r.crewId)}` },
        { key: 'vesselId', label: 'Vessel', render: (r) => <VesselCell id={r.vesselId} />, exportValue: (r) => vesselName(r.vesselId) },
        { key: 'rank', label: 'Rank' },
        { key: 'signOffDate', label: 'Sign-off', render: (r) => fmtDate(r.signOffDate) },
        { key: 'port', label: 'Port' },
        { key: 'reason', label: 'Reason' },
        { key: 'masterAppraisal', label: 'Master appraisal', render: (r) => <Badge tone={r.masterAppraisal === 'Poor' ? 'danger' : r.masterAppraisal === 'Excellent' ? 'ok' : 'info'}>{r.masterAppraisal}</Badge> },
        { key: 'settlementStatus', label: 'Settlement', render: (r) => <Badge>{r.settlementStatus}</Badge> },
        { key: 'nextEligibility', label: 'Next deployment', render: (r) => <Badge>{r.nextEligibility}</Badge> },
      ]} />
  )
}

export default function SignOnOff() {
  const [tab, setTab] = useState('on')
  return (
    <>
      <div className="page-head"><div><h1>Sign-On & Sign-Off</h1><p className="muted">Recording sign-on/off updates the assignment, contract, crew availability and employment history automatically.</p></div></div>
      <Tabs value={tab} onChange={setTab} tabs={[{ key: 'on', label: 'Sign-On' }, { key: 'off', label: 'Sign-Off' }]} />
      {tab === 'on' ? <SignOn /> : <SignOff />}
    </>
  )
}

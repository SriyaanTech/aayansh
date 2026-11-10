import { FileDown, Check, Send, Plane, Clock, CheckCircle2 } from 'lucide-react'
import ResourcePage from '../components/ResourcePage'
import { Badge, Stat, useToast } from '../components/ui'
import { CrewCell, VesselCell, useLookups } from '../context/LookupContext'
import { CURRENCIES, PORTS, TRAVEL_STATUS } from '../config/constants'
import { fmtDateTime, money, fullName } from '../utils/format'
import { useData } from '../api/hooks'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { joiningPDF } from '../utils/documents'

export const TRAVEL_FIELDS = [
  { type: 'section', label: 'Crew & purpose' },
  { name: 'crewId', label: 'Seafarer', type: 'crew', required: true, span: 2 },
  { name: 'vesselId', label: 'Vessel', type: 'vessel', required: true },
  { name: 'purpose', label: 'Purpose', type: 'select', options: ['Joining', 'Sign-off / Repatriation', 'Training', 'Medical'], default: 'Joining' },
  { name: 'fromCity', label: 'From', required: true },
  { name: 'toCity', label: 'To / joining port', type: 'select', options: PORTS, required: true },
  { type: 'section', label: 'Flight booking' },
  { name: 'airline', label: 'Airline' },
  { name: 'flightNo', label: 'Flight no.' },
  { name: 'pnr', label: 'PNR / booking ref.' },
  { name: 'departure', label: 'Departure', type: 'datetime-local', required: true },
  { name: 'arrival', label: 'Arrival', type: 'datetime-local' },
  { name: 'ticketFile', label: 'Ticket / boarding pass', type: 'file' },
  { type: 'section', label: 'Visa, accommodation & transfers' },
  { name: 'visaStatus', label: 'Visa / work permit', type: 'select', options: ['Not Required', 'Applied', 'Approved', 'OK to Board', 'Rejected'] },
  { name: 'hotel', label: 'Hotel / accommodation' },
  { name: 'pickup', label: 'Airport pickup / drop' },
  { name: 'agent', label: 'Port agent' },
  { name: 'expenses', label: 'Travel expenses', type: 'number' },
  { name: 'currency', label: 'Currency', type: 'select', options: CURRENCIES, default: 'USD' },
  { name: 'instructions', label: 'Joining instructions', type: 'textarea', span: 3, rows: 4 },
  { name: 'status', label: 'Status', type: 'select', options: TRAVEL_STATUS, default: 'Requested' },
  { name: 'joiningConfirmed', label: 'Joining confirmation', type: 'checkbox', checkLabel: 'Crew joined vessel' },
]

export function useTravelColumns({ showCrew = true } = {}) {
  const { crewName, vesselName } = useLookups()
  return [
    { key: 'id', label: 'Ref' },
    ...(showCrew ? [{ key: 'crewId', label: 'Seafarer', render: (r) => <CrewCell id={r.crewId} />, exportValue: (r) => `${r.crewId} ${crewName(r.crewId)}` }] : []),
    { key: 'vesselId', label: 'Vessel', render: (r) => <VesselCell id={r.vesselId} />, exportValue: (r) => vesselName(r.vesselId) },
    { key: 'route', label: 'Route', exportValue: (r) => `${r.fromCity} → ${r.toCity}`, render: (r) => <>{r.fromCity} → <strong>{r.toCity}</strong></> },
    { key: 'flight', label: 'Flight', exportValue: (r) => `${r.airline} ${r.flightNo}`, render: (r) => <>{r.airline}<br /><small className="muted">{r.flightNo} · PNR {r.pnr}</small></> },
    { key: 'departure', label: 'Departure', render: (r) => fmtDateTime(r.departure) },
    { key: 'visaStatus', label: 'Visa', render: (r) => <Badge>{r.visaStatus}</Badge> },
    { key: 'expenses', label: 'Expenses', align: 'right', render: (r) => money(r.expenses, r.currency) },
    { key: 'status', label: 'Status', render: (r) => <Badge>{r.status}</Badge> },
    { key: 'joiningConfirmed', label: 'Joined', exportValue: (r) => (r.joiningConfirmed ? 'Yes' : 'No'), render: (r) => <Badge tone={r.joiningConfirmed ? 'ok' : 'muted'}>{r.joiningConfirmed ? 'Confirmed' : 'Awaiting'}</Badge> },
  ]
}

export default function Travel() {
  const columns = useTravelColumns()
  const { travel } = useData('travel')
  const { can } = useAuth()
  const { crewById, vesselById } = useLookups()
  const toast = useToast()
  return (
    <ResourcePage resource="travel" module="travel" title="Travel & Joining" subtitle="Flights, visas, hotels, transfers, joining instructions and confirmation."
      createLabel="New Travel" formTitle="New travel arrangement" exportTitle="Travel Report" columns={columns} fields={TRAVEL_FIELDS} formWidth={900}
      filters={[{ key: 'status', label: 'Status', options: TRAVEL_STATUS }, { key: 'purpose', label: 'Purpose', options: ['Joining', 'Sign-off / Repatriation', 'Training', 'Medical'] }]}
      rowActions={(r) => (
        <>
          <button className="icon-btn" title="Joining instructions PDF" onClick={() => joiningPDF({ travel: r, crew: crewById[r.crewId], vessel: vesselById[r.vesselId] })}><FileDown size={15} /></button>
          <button className="icon-btn" title="Send itinerary to crew" onClick={async () => {
            await api.create('notifications', { type: 'Travel', title: `Itinerary: ${r.airline} ${r.flightNo}`, body: `Joining ${vesselById[r.vesselId]?.name} at ${r.toCity}. ${r.instructions || ''}`, channel: 'Email', audience: 'Crew', crewId: r.crewId, date: new Date().toISOString().slice(0, 10), read: false, status: 'Sent' })
            toast(`Itinerary sent to ${fullName(crewById[r.crewId])}`)
          }}><Send size={15} /></button>
          {can('travel', 'approve') && r.status === 'Pending Approval' && <button className="icon-btn" title="Approve" onClick={async () => { await api.update('travel', r.id, { status: 'Booked' }); toast('Travel approved') }}><Check size={15} color="var(--ok)" /></button>}
        </>
      )}>
      <div className="stats">
        <Stat label="Pending approval" value={travel.filter((t) => t.status === 'Pending Approval').length} icon={Clock} tone="amber" />
        <Stat label="Booked" value={travel.filter((t) => t.status === 'Booked').length} icon={Plane} tone="blue" />
        <Stat label="Joining confirmed" value={travel.filter((t) => t.joiningConfirmed).length} icon={CheckCircle2} tone="green" />
        <Stat label="Total expenses" value={money(travel.reduce((s, t) => s + Number(t.expenses || 0), 0))} icon={Plane} tone="teal" />
      </div>
    </ResourcePage>
  )
}

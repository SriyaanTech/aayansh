import { FileDown, Plane } from 'lucide-react'
import { Badge, Card, Empty, KV } from '../../components/ui'
import { useData } from '../../api/hooks'
import { joiningPDF } from '../../utils/documents'
import { fmtDateTime } from '../../utils/format'
import { usePortal } from './usePortal'

export default function PortalTravel() {
  const { me, mine, vesselById } = usePortal()
  const { travel } = useData('travel')
  const list = mine(travel)
  return (
    <>
      <div className="page-head"><div><h1>Travel & Joining</h1><p className="muted">Flight, visa, hotel and joining instructions.</p></div></div>
      {!list.length && <Card><Empty title="No travel arranged">Your itinerary will appear here once booked.</Empty></Card>}
      <div className="stack">
        {list.map((t) => (
          <Card key={t.id} title={<span className="row"><Plane size={16} /> {t.fromCity} → {t.toCity} · {vesselById[t.vesselId]?.name}</span>} actions={<><Badge>{t.status}</Badge><button className="btn btn-sm" onClick={() => joiningPDF({ travel: t, crew: me, vessel: vesselById[t.vesselId] })}><FileDown size={14} /> Joining instructions</button></>}>
            <KV cols={4} items={[['Flight', `${t.airline} ${t.flightNo}`], ['PNR', t.pnr], ['Departure', fmtDateTime(t.departure)], ['Arrival', fmtDateTime(t.arrival)], ['Visa', t.visaStatus], ['Hotel', t.hotel || 'Not required'], ['Airport pickup', t.pickup], ['Port agent', t.agent]]} />
            {t.instructions && <div className="alert alert-info" style={{ marginTop: 14 }}>{t.instructions}</div>}
          </Card>
        ))}
      </div>
    </>
  )
}

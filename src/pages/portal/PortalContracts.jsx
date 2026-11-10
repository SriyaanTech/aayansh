import { FileDown } from 'lucide-react'
import { Badge, Card, Empty } from '../../components/ui'
import { useData } from '../../api/hooks'
import { contractPDF } from '../../utils/documents'
import { fmtDate, money } from '../../utils/format'
import { usePortal } from './usePortal'

export default function PortalContracts() {
  const { me, mine, vesselById } = usePortal()
  const { contracts } = useData('contracts')
  const list = mine(contracts)
  return (
    <>
      <div className="page-head"><div><h1>My Contracts</h1><p className="muted">View and download your employment contracts.</p></div></div>
      <Card pad={false}>
        {list.length ? (
          <table className="simple-table">
            <thead><tr><th>Contract</th><th>Vessel</th><th>Rank</th><th>Period</th><th>Monthly total</th><th>Signed</th><th>Status</th><th /></tr></thead>
            <tbody>{list.map((c) => (
              <tr key={c.id}><td>{c.id}<br /><small className="muted">v{c.version || 1}</small></td><td>{vesselById[c.vesselId]?.name}</td><td>{c.rank}</td><td>{fmtDate(c.startDate)} – {fmtDate(c.endDate)}</td>
                <td>{money(c.basicWage + c.fixedOT + c.leavePay + c.otherAllowance, c.currency)}</td><td><Badge tone={c.signed ? 'ok' : 'warn'}>{c.signed ? 'Signed' : 'Awaiting signature'}</Badge></td><td><Badge>{c.status}</Badge></td>
                <td><button className="btn btn-sm" onClick={() => contractPDF({ contract: c, crew: me, vessel: vesselById[c.vesselId] })}><FileDown size={14} /> PDF</button></td></tr>
            ))}</tbody>
          </table>
        ) : <Empty title="No contracts yet" />}
      </Card>
    </>
  )
}

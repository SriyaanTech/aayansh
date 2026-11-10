import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Pencil, Plus, Trash2, Save } from 'lucide-react'
import { PageHeader, Card, KV, Badge, Tabs, useToast, Progress } from '../components/ui'
import FormModal from '../components/FormModal'
import { useData } from '../api/hooks'
import { api } from '../api/client'
import { CrewCell, useLookups } from '../context/LookupContext'
import { useAuth } from '../context/AuthContext'
import { VESSEL_FIELDS } from './Vessels'
import { fmtDate, expiryStatus } from '../utils/format'
import { ALL_RANKS } from '../config/constants'

export default function VesselDetail() {
  const { id } = useParams()
  const { vesselById, clientName } = useLookups()
  const { assignments } = useData('assignments')
  const { can } = useAuth()
  const toast = useToast()
  const v = vesselById[id]
  const [tab, setTab] = useState('manning')
  const [editing, setEditing] = useState(false)
  const [manning, setManning] = useState(null)
  const [docForm, setDocForm] = useState(false)
  if (!v) return <p className="muted">Loading vessel…</p>

  const asg = assignments.filter((a) => a.vesselId === id)
  const onboard = asg.filter((a) => a.status === 'Onboard')
  const planned = asg.filter((a) => a.status === 'Planned')
  const rows = (manning || v.manning || []).map((m) => {
    const alloc = onboard.filter((a) => a.rank === m.rank).length
    const plan = planned.filter((a) => a.rank === m.rank).length
    return { ...m, alloc, plan, gap: Number(m.required || 0) - alloc }
  })
  const req = rows.reduce((s, r) => s + Number(r.required || 0), 0)

  return (
    <>
      <PageHeader back={<Link to="/vessels" className="back"><ArrowLeft size={14} /> Vessels</Link>} title={v.name}
        subtitle={`IMO ${v.imo} · ${v.type} · ${v.flag} flag · ${clientName(v.clientId)}`}
        actions={can('vessels', 'edit') && <button className="btn" onClick={() => setEditing(true)}><Pencil size={15} /> Edit vessel</button>} />

      <div className="grid g-2-1">
        <Card title="Vessel particulars">
          <KV items={[['Vessel type', v.type], ['Flag', v.flag], ['Owner', v.owner], ['Ship manager', v.manager || clientName(v.clientId)], ['Gross tonnage', Number(v.grt).toLocaleString()], ['Deadweight', Number(v.dwt).toLocaleString()], ['Year built', v.built], ['Trading area', v.tradingArea], ['Status', <Badge key="s">{v.status}</Badge>]]} />
        </Card>
        <Card title="Crew strength">
          <div className="stack">
            <div style={{ fontSize: 30, fontWeight: 700 }}>{onboard.length} <span className="muted" style={{ fontSize: 16 }}>/ {req} required</span></div>
            <Progress value={onboard.length} max={req} />
            <span className="muted">{planned.length} relief / joining crew planned · {rows.filter((r) => r.gap > 0).length} ranks below minimum safe manning</span>
          </div>
        </Card>
      </div>

      <div className="mt">
        <Tabs value={tab} onChange={setTab} tabs={[{ key: 'manning', label: 'Manning requirements' }, { key: 'crew', label: 'Onboard crew', count: onboard.length }, { key: 'history', label: 'Crew history', count: asg.length }, { key: 'docs', label: 'Vessel documents', count: (v.documents || []).length }]} />
      </div>

      {tab === 'manning' && (
        <Card title="Rank-wise manpower & minimum safe manning" pad={false} actions={can('vessels', 'edit') && (manning
          ? <><button className="btn btn-sm" onClick={() => setManning(null)}>Cancel</button><button className="btn btn-primary btn-sm" onClick={async () => { await api.update('vessels', v.id, { manning: manning.filter((m) => m.rank) }); setManning(null); toast('Manning configuration saved') }}><Save size={14} /> Save</button></>
          : <button className="btn btn-sm" onClick={() => setManning(v.manning || [])}><Pencil size={14} /> Configure</button>)}>
          <table className="simple-table">
            <thead><tr><th>Rank</th><th>Required (safe manning)</th><th>Allocated onboard</th><th>Planned relief</th><th>Status</th>{manning && <th />}</tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td>{manning ? <select className="input input-sm" value={r.rank} onChange={(e) => setManning((m) => m.map((x, j) => (j === i ? { ...x, rank: e.target.value } : x)))}>{ALL_RANKS.map((x) => <option key={x}>{x}</option>)}</select> : r.rank}</td>
                  <td>{manning ? <input type="number" min={0} className="input input-sm" style={{ width: 80, minWidth: 0 }} value={r.required} onChange={(e) => setManning((m) => m.map((x, j) => (j === i ? { ...x, required: Number(e.target.value) } : x)))} /> : r.required}</td>
                  <td>{r.alloc}</td><td>{r.plan}</td>
                  <td>{r.gap > 0 ? <Badge tone="danger">Short by {r.gap}</Badge> : r.gap < 0 ? <Badge tone="info">Surplus {-r.gap}</Badge> : <Badge tone="ok">Fully manned</Badge>}</td>
                  {manning && <td><button className="icon-btn danger" onClick={() => setManning((m) => m.filter((_, j) => j !== i))}><Trash2 size={14} /></button></td>}
                </tr>
              ))}
            </tbody>
          </table>
          {manning && <div className="card-body"><button className="btn btn-sm" onClick={() => setManning((m) => [...m, { rank: ALL_RANKS[0], required: 1 }])}><Plus size={14} /> Add rank</button></div>}
        </Card>
      )}

      {(tab === 'crew' || tab === 'history') && (
        <Card pad={false}>
          <table className="simple-table">
            <thead><tr><th>Seafarer</th><th>Rank</th><th>Sign-on</th><th>Planned / actual sign-off</th><th>Port</th><th>Status</th></tr></thead>
            <tbody>
              {(tab === 'crew' ? onboard : [...asg].sort((a, b) => (b.signOnDate || '').localeCompare(a.signOnDate || ''))).map((a) => (
                <tr key={a.id}><td><CrewCell id={a.crewId} /></td><td>{a.rank}</td><td>{fmtDate(a.signOnDate)}</td><td>{fmtDate(a.actualSignOff || a.plannedSignOff)}</td><td>{a.joiningPort}</td><td><Badge>{a.status}</Badge></td></tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {tab === 'docs' && (
        <Card pad={false} actions={can('vessels', 'edit') && <button className="btn btn-sm" onClick={() => setDocForm(true)}><Plus size={14} /> Add document</button>} title="Vessel documents">
          <table className="simple-table">
            <thead><tr><th>Document</th><th>Expiry</th><th>Status</th><th /></tr></thead>
            <tbody>
              {(v.documents || []).map((d, i) => { const e = expiryStatus(d.expiry); return (
                <tr key={i}><td>{d.name}{d.fileName && <><br /><small className="muted">{d.fileName}</small></>}</td><td>{fmtDate(d.expiry)}</td><td><Badge tone={e.tone}>{e.label}</Badge></td>
                  <td className="right">{can('vessels', 'edit') && <button className="icon-btn danger" onClick={() => api.update('vessels', v.id, { documents: v.documents.filter((_, j) => j !== i) })}><Trash2 size={14} /></button>}</td></tr>
              ) })}
            </tbody>
          </table>
        </Card>
      )}

      <FormModal open={editing} title={`Edit ${v.name}`} fields={VESSEL_FIELDS} initial={v} onClose={() => setEditing(false)} onSubmit={async (val) => { await api.update('vessels', v.id, val); toast('Vessel updated') }} />
      <FormModal open={docForm} title="Add vessel document" width={560} fields={[{ name: 'name', label: 'Document name', required: true, span: 3 }, { name: 'expiry', label: 'Expiry date', type: 'date' }, { name: 'fileName', label: 'File', type: 'file', span: 2 }]}
        onClose={() => setDocForm(false)} onSubmit={async (d) => { await api.update('vessels', v.id, { documents: [...(v.documents || []), d] }); toast('Document added') }} />
    </>
  )
}

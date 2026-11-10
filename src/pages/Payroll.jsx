import { useState } from 'react'
import { FileDown, Check, Play, Wallet, Clock, PauseCircle, CheckCircle2 } from 'lucide-react'
import ResourcePage from '../components/ResourcePage'
import { Badge, Stat, Tabs, useToast, Card } from '../components/ui'
import { CrewCell, VesselCell, useLookups } from '../context/LookupContext'
import { ALL_RANKS, CURRENCIES, PAY_STATUS } from '../config/constants'
import { money, fmtDate } from '../utils/format'
import { useData } from '../api/hooks'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { payslipPDF } from '../utils/documents'

const calc = (v) => {
  const n = (k) => Number(v[k] || 0)
  const gross = n('basic') + n('fixedOT') + n('extraOT') + n('leaveWages') + n('allowances')
  return { gross, net: gross - n('advance') - n('deductions') }
}
const eff = (v) => calc(v)

export const PAY_FIELDS = [
  { name: 'crewId', label: 'Seafarer', type: 'crew', required: true, span: 2 },
  { name: 'vesselId', label: 'Vessel', type: 'vessel' },
  { name: 'period', label: 'Salary period', type: 'month', required: true },
  { name: 'currency', label: 'Currency', type: 'select', options: CURRENCIES, default: 'USD' },
  { name: 'bank', label: 'Bank' },
  { type: 'section', label: 'Earnings' },
  { name: 'basic', label: 'Basic salary', type: 'number', required: true, effect: eff },
  { name: 'fixedOT', label: 'Fixed overtime', type: 'number', effect: eff },
  { name: 'extraOT', label: 'Extra overtime', type: 'number', effect: eff, hint: 'Hours × OT rate from salary structure' },
  { name: 'leaveWages', label: 'Leave wages', type: 'number', effect: eff },
  { name: 'allowances', label: 'Allowances', type: 'number', effect: eff },
  { name: 'gross', label: 'Gross', type: 'number', disabled: true },
  { type: 'section', label: 'Deductions & allotment' },
  { name: 'advance', label: 'Advance payments', type: 'number', effect: eff },
  { name: 'deductions', label: 'Other deductions', type: 'number', effect: eff },
  { name: 'net', label: 'Net payable', type: 'number', disabled: true },
  { name: 'allotment', label: 'Home allotment', type: 'number' },
  { name: 'status', label: 'Payment status', type: 'select', options: PAY_STATUS, default: 'Draft' },
]

export function usePayColumns({ showCrew = true } = {}) {
  const { crewName, vesselName } = useLookups()
  return [
    { key: 'period', label: 'Period' },
    ...(showCrew ? [{ key: 'crewId', label: 'Seafarer', render: (r) => <CrewCell id={r.crewId} />, exportValue: (r) => `${r.crewId} ${crewName(r.crewId)}` }] : []),
    { key: 'vesselId', label: 'Vessel', render: (r) => <VesselCell id={r.vesselId} />, exportValue: (r) => vesselName(r.vesselId) },
    { key: 'basic', label: 'Basic', align: 'right', render: (r) => money(r.basic, r.currency) },
    { key: 'extraOT', label: 'Extra OT', align: 'right', render: (r) => money(r.extraOT, r.currency) },
    { key: 'gross', label: 'Gross', align: 'right', render: (r) => money(r.gross, r.currency) },
    { key: 'advance', label: 'Advance', align: 'right', render: (r) => money(r.advance, r.currency) },
    { key: 'deductions', label: 'Deductions', align: 'right', render: (r) => money(r.deductions, r.currency) },
    { key: 'net', label: 'Net', align: 'right', render: (r) => <strong>{money(r.net, r.currency)}</strong> },
    { key: 'allotment', label: 'Allotment', align: 'right', render: (r) => money(r.allotment, r.currency) },
    { key: 'currency', label: 'Cur.' },
    { key: 'status', label: 'Status', render: (r) => <Badge>{r.status}</Badge> },
  ]
}

function PayrollTab() {
  const columns = usePayColumns()
  const { payroll, contracts } = useData('payroll', 'contracts')
  const { can } = useAuth()
  const { crewById, vesselById } = useLookups()
  const toast = useToast()
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7))

  const generate = async () => {
    const active = contracts.filter((c) => c.status === 'Active')
    let n = 0
    for (const c of active) {
      if (payroll.some((p) => p.crewId === c.crewId && p.period === period)) continue
      const gross = c.basicWage + c.fixedOT + c.leavePay + c.otherAllowance
      await api.create('payroll', { crewId: c.crewId, vesselId: c.vesselId, period, basic: c.basicWage, fixedOT: c.fixedOT, extraOT: 0, leaveWages: c.leavePay, allowances: c.otherAllowance, advance: 0, deductions: 0, gross, net: gross, allotment: Math.round(gross * 0.8), currency: c.currency, status: 'Draft', bank: '' })
      n++
    }
    toast(n ? `Generated ${n} payroll records for ${period}` : `Payroll for ${period} already exists for all active contracts`, n ? 'ok' : 'info')
  }

  const totals = payroll.filter((p) => p.period === period).reduce((acc, p) => { acc[p.currency] = (acc[p.currency] || 0) + Number(p.net || 0); return acc }, {})

  return (
    <ResourcePage resource="payroll" module="payroll" title="Payroll" hideHeader exportTitle="Payroll Report" columns={columns} fields={PAY_FIELDS} createLabel="Add Entry" formTitle="New payroll entry"
      beforeSave={(v) => ({ ...v, ...calc(v) })}
      filters={[{ key: 'period', label: 'Period', options: [...new Set(payroll.map((p) => p.period))].sort().reverse() }, { key: 'status', label: 'Status', options: PAY_STATUS }, { key: 'currency', label: 'Currency', options: CURRENCIES }]}
      rowActions={(r) => (
        <>
          <button className="icon-btn" title="Payslip PDF" onClick={() => payslipPDF({ pay: r, crew: crewById[r.crewId], vessel: vesselById[r.vesselId] })}><FileDown size={15} /></button>
          {can('payroll', 'approve') && r.status !== 'Paid' && <button className="icon-btn" title="Mark paid" onClick={async () => { await api.update('payroll', r.id, { status: 'Paid', paidOn: new Date().toISOString().slice(0, 10) }); toast('Marked as paid') }}><Check size={15} color="var(--ok)" /></button>}
        </>
      )}>
      <div className="stats">
        <Stat label="Paid" value={payroll.filter((p) => p.status === 'Paid').length} icon={CheckCircle2} tone="green" />
        <Stat label="Processing" value={payroll.filter((p) => p.status === 'Processing' || p.status === 'Draft').length} icon={Clock} tone="blue" />
        <Stat label="On hold" value={payroll.filter((p) => p.status === 'On Hold').length} icon={PauseCircle} tone="amber" />
        <Stat label={`Net payable · ${period}`} value={Object.entries(totals).map(([c, v]) => money(v, c)).join(' · ') || '—'} icon={Wallet} tone="teal" />
      </div>
      {can('payroll', 'create') && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-body row">
            <strong>Run payroll</strong>
            <span className="muted">Generate entries from active contracts for</span>
            <input type="month" className="input input-sm" value={period} onChange={(e) => setPeriod(e.target.value)} />
            <button className="btn btn-primary btn-sm" onClick={generate}><Play size={14} /> Generate</button>
          </div>
        </div>
      )}
    </ResourcePage>
  )
}

function SalaryStructureTab() {
  return (
    <ResourcePage resource="salaryStructures" module="payroll" title="Salary Structures" hideHeader exportTitle="Rank-wise Salary Structure" createLabel="Add Rank Scale" formTitle="Rank-wise salary structure"
      columns={[
        { key: 'rank', label: 'Rank' },
        { key: 'basic', label: 'Basic', align: 'right', render: (r) => money(r.basic, r.currency) },
        { key: 'fixedOT', label: 'Fixed OT', align: 'right', render: (r) => money(r.fixedOT, r.currency) },
        { key: 'leavePay', label: 'Leave pay', align: 'right', render: (r) => money(r.leavePay, r.currency) },
        { key: 'otherAllowance', label: 'Other allow.', align: 'right', render: (r) => money(r.otherAllowance, r.currency) },
        { key: 'total', label: 'Total / month', align: 'right', exportValue: (r) => r.basic + r.fixedOT + r.leavePay + r.otherAllowance, render: (r) => <strong>{money(r.basic + r.fixedOT + r.leavePay + r.otherAllowance, r.currency)}</strong> },
        { key: 'otRate', label: 'OT rate / hr', align: 'right', render: (r) => money(r.otRate, r.currency) },
        { key: 'currency', label: 'Currency' },
      ]}
      fields={[
        { name: 'rank', label: 'Rank', type: 'select', options: ALL_RANKS, required: true },
        { name: 'currency', label: 'Currency', type: 'select', options: CURRENCIES, default: 'USD' },
        { name: 'basic', label: 'Basic', type: 'number', required: true },
        { name: 'fixedOT', label: 'Fixed OT', type: 'number' },
        { name: 'leavePay', label: 'Leave pay', type: 'number' },
        { name: 'otherAllowance', label: 'Other allowance', type: 'number' },
        { name: 'otRate', label: 'Overtime rate / hour', type: 'number' },
      ]} />
  )
}

function SettlementTab() {
  const { signOffs } = useData('signOffs')
  const { crewName, vesselName } = useLookups()
  const { can } = useAuth()
  const toast = useToast()
  return (
    <Card title="Sign-off final settlements" pad={false}>
      <table className="simple-table">
        <thead><tr><th>Seafarer</th><th>Vessel</th><th>Sign-off</th><th>Reason</th><th>Settlement</th><th /></tr></thead>
        <tbody>
          {signOffs.map((s) => (
            <tr key={s.id}>
              <td><CrewCell id={s.crewId} /></td><td>{vesselName(s.vesselId)}</td><td>{fmtDate(s.signOffDate)} · {s.port}</td><td>{s.reason}</td>
              <td><Badge>{s.settlementStatus}</Badge></td>
              <td className="right">{can('payroll', 'approve') && s.settlementStatus !== 'Settled' && <button className="btn btn-sm" onClick={async () => { await api.update('signOffs', s.id, { settlementStatus: 'Settled', settledOn: new Date().toISOString().slice(0, 10) }); toast(`Settlement closed for ${crewName(s.crewId)}`) }}>Mark settled</button>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  )
}

export default function Payroll() {
  const [tab, setTab] = useState('payroll')
  return (
    <>
      <div className="page-head"><div><h1>Payroll & Financial Management</h1><p className="muted">Rank-wise salary, overtime, allotments, advances, deductions, settlements and payslips. Multi-currency.</p></div></div>
      <Tabs value={tab} onChange={setTab} tabs={[{ key: 'payroll', label: 'Monthly Payroll' }, { key: 'structure', label: 'Salary Structure' }, { key: 'settlement', label: 'Sign-off Settlements' }]} />
      {tab === 'payroll' && <PayrollTab />}
      {tab === 'structure' && <SalaryStructureTab />}
      {tab === 'settlement' && <SettlementTab />}
    </>
  )
}

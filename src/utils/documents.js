import { documentPDF } from './export'
import { fullName, fmtDate, money, fmtDateTime } from './format'

export function offerLetterPDF({ app, crew, vacancy, vessel, client }) {
  return documentPDF({
    title: 'Offer of Employment', subtitle: `Ref ${app.id} · ${fmtDate(new Date())}`, filename: `Offer_${crew.id}_${app.id}.pdf`,
    blocks: [
      { text: `Dear ${fullName(crew)},\n\nFurther to your interview and assessment, we are pleased to offer you the position of ${vacancy.rank} on board ${vessel?.name || 'the vessel'} on the terms below. This offer is subject to valid statutory documents, medical fitness and client approval.` },
      { heading: 'Position', pairs: [['Seafarer', `${fullName(crew)} (${crew.id})`], ['Rank', vacancy.rank], ['Vessel', `${vessel?.name || '—'} (IMO ${vessel?.imo || '—'})`], ['Vessel type / flag', `${vessel?.type || '—'} / ${vessel?.flag || '—'}`], ['Principal', client?.name || '—']] },
      { heading: 'Terms', pairs: [['Monthly wage (all-in)', money(vacancy.salary, vacancy.currency)], ['Contract duration', `${vacancy.contractMonths} months (± 1 month)`], ['Expected joining', `${fmtDate(vacancy.joiningDate)} at ${vacancy.joiningPort}`]] },
      { text: 'Please confirm acceptance within 3 working days. Your employment contract (SEA) will be issued upon acceptance.' },
      { signatures: ['For the Company', 'Accepted by Seafarer'] },
    ],
  })
}

export function contractPDF({ contract: c, crew, vessel }) {
  const total = (c.basicWage || 0) + (c.fixedOT || 0) + (c.leavePay || 0) + (c.otherAllowance || 0)
  return documentPDF({
    title: 'Seafarer Employment Agreement', subtitle: `${c.id} · v${c.version || 1}`, filename: `Contract_${c.id}.pdf`,
    blocks: [
      { heading: 'Parties', pairs: [['Seafarer', `${fullName(crew)} (${crew?.id})`], ['Nationality / DOB', `${crew?.nationality} / ${fmtDate(crew?.dob)}`], ['Passport / CDC', `${crew?.passportNo} / ${crew?.cdcNo}`], ['Vessel', `${vessel?.name} · IMO ${vessel?.imo} · ${vessel?.flag}`], ['Rank', c.rank]] },
      { heading: 'Period', pairs: [['Start date', fmtDate(c.startDate)], ['End date', fmtDate(c.endDate)], ['Duration', `${c.durationMonths} months`], ['Applicable CBA', c.cba]] },
      { heading: 'Wage structure (monthly)', table: { head: ['Component', 'Amount'], body: [['Basic wage', money(c.basicWage, c.currency)], ['Fixed overtime', money(c.fixedOT, c.currency)], ['Leave pay', money(c.leavePay, c.currency)], ['Other allowance', money(c.otherAllowance, c.currency)], ['Total', money(total, c.currency)]] } },
      { heading: 'Terms & conditions', text: c.terms || '—' },
      { signatures: ['Seafarer', 'Master / Company Representative'] },
    ],
  })
}

export function payslipPDF({ pay: p, crew, vessel }) {
  return documentPDF({
    title: 'Payslip', subtitle: `${p.period} · ${p.id}`, filename: `Payslip_${crew?.id}_${p.period}.pdf`,
    blocks: [
      { pairs: [['Seafarer', `${fullName(crew)} (${crew?.id})`], ['Rank', crew?.rank], ['Vessel', vessel?.name], ['Period', p.period], ['Bank', p.bank], ['Payment status', p.status]] },
      { heading: 'Earnings', table: { head: ['Component', 'Amount'], body: [['Basic', money(p.basic, p.currency)], ['Fixed OT', money(p.fixedOT, p.currency)], ['Extra OT', money(p.extraOT, p.currency)], ['Leave wages', money(p.leaveWages, p.currency)], ['Allowances', money(p.allowances, p.currency)], ['Gross', money(p.gross, p.currency)]] } },
      { heading: 'Deductions', table: { head: ['Component', 'Amount'], body: [['Advance', money(p.advance, p.currency)], ['Other deductions', money(p.deductions, p.currency)]] } },
      { pairs: [['Net payable', money(p.net, p.currency)], ['Home allotment', money(p.allotment, p.currency)], ['Onboard balance', money(p.net - p.allotment, p.currency)]] },
      { text: 'This is a system-generated payslip and does not require a signature.' },
    ],
  })
}

export function joiningPDF({ travel: t, crew, vessel }) {
  return documentPDF({
    title: 'Joining Instructions', subtitle: `${t.id}`, filename: `Joining_${crew?.id}_${t.id}.pdf`,
    blocks: [
      { pairs: [['Seafarer', `${fullName(crew)} (${crew?.id})`], ['Rank', crew?.rank], ['Vessel', `${vessel?.name} · IMO ${vessel?.imo}`], ['Joining port', t.toCity]] },
      { heading: 'Travel itinerary', pairs: [['Flight', `${t.airline} ${t.flightNo}`], ['PNR', t.pnr], ['Departure', `${t.fromCity} · ${fmtDateTime(t.departure)}`], ['Arrival', `${t.toCity} · ${fmtDateTime(t.arrival)}`], ['Visa', t.visaStatus], ['Hotel', t.hotel || 'Not required'], ['Airport pickup', t.pickup], ['Port agent', t.agent]] },
      { heading: 'Instructions', text: t.instructions },
      { text: 'Documents to carry: Passport, CDC, COC/COP, STCW certificates, Medical fitness, Yellow fever (if applicable), Visa/OK-to-board letter, and this joining letter.' },
    ],
  })
}

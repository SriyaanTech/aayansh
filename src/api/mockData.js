// Deterministic seed data so the UI looks realistic before the backend exists.
// Every record that belongs to a seafarer references the same crewId (CRW-xxxx),
// mirroring the "Crew Database as the central master" recommendation.

import { RANKS, DOCUMENT_TYPES, VESSEL_TYPES } from '../config/constants'
import { isMandatory } from '../config/training'

let seed = 42
const rnd = () => {
  seed = (seed * 16807) % 2147483647
  return (seed - 1) / 2147483646
}
const pick = (arr) => arr[Math.floor(rnd() * arr.length)]
const int = (min, max) => Math.floor(rnd() * (max - min + 1)) + min
const pad = (n, l = 4) => String(n).padStart(l, '0')

const TODAY = new Date()
const iso = (d) => d.toISOString().slice(0, 10)
const addDays = (days, base = TODAY) => {
  const d = new Date(base)
  d.setDate(d.getDate() + days)
  return iso(d)
}

const FIRST = ['Arjun', 'Rahul', 'Vikram', 'Suresh', 'Anil', 'Rohan', 'Karan', 'Manoj', 'Deepak', 'Sanjay', 'Joseph', 'Thomas', 'Mark', 'Ramon', 'Jose', 'Miguel', 'Andriy', 'Oleksandr', 'Dmitri', 'Ivan', 'Nikolai', 'Wei', 'Li', 'Nguyen', 'Tran', 'Rizal', 'Budi', 'Ahmed', 'Imran', 'Priya', 'Anjali', 'Maria', 'Elena', 'George', 'Peter', 'Daniel', 'Samuel', 'Ravi', 'Ajay', 'Nitin']
const LAST = ['Sharma', 'Nair', 'Menon', 'Pillai', 'Singh', 'Das', 'Rao', 'Iyer', 'Fernandes', 'D\'Souza', 'Santos', 'Reyes', 'Cruz', 'Garcia', 'Kovalenko', 'Shevchenko', 'Petrov', 'Ivanov', 'Zhang', 'Chen', 'Pham', 'Le', 'Santoso', 'Khan', 'Hussain', 'Kumar', 'Varghese', 'Mathew', 'Gomez', 'Popescu']
const NATIONALITY = ['Indian', 'Indian', 'Indian', 'Filipino', 'Ukrainian', 'Indian', 'Romanian', 'Indonesian', 'Vietnamese', 'Indian', 'Sri Lankan', 'Myanmar']
const CITIES = ['Mumbai', 'Kochi', 'Chennai', 'Kolkata', 'Goa', 'Manila', 'Odesa', 'Jakarta', 'Constanta', 'Delhi', 'Visakhapatnam']
const PORTS = ['Singapore', 'Rotterdam', 'Fujairah', 'Mumbai', 'Houston', 'Busan', 'Shanghai', 'Santos', 'Durban', 'Colombo', 'Piraeus', 'Antwerp']
const TRADING = ['Worldwide', 'Far East', 'Middle East', 'Europe', 'Americas', 'India Coastal']
const MED_CENTRES = ['Seamen\'s Medical Centre, Mumbai', 'Apollo Port Health, Chennai', 'St. Luke\'s Maritime Clinic, Manila', 'Port Health Centre, Kochi']
const INSTITUTES = ['Anglo-Eastern Maritime Academy', 'Samundra Institute', 'IMU Chennai', 'Tolani Maritime Institute', 'MOL Training Centre', 'Seafarers Training Centre, Manila']

export const CLIENTS = [
  { id: 'CLI-0001', name: 'Oceanic Bulk Carriers Pte Ltd', country: 'Singapore', contact: 'Hans Meyer', email: 'crewing@oceanicbulk.sg' },
  { id: 'CLI-0002', name: 'Bluewave Tankers S.A.', country: 'Greece', contact: 'Nikos Papas', email: 'ops@bluewave.gr' },
  { id: 'CLI-0003', name: 'Coral Line Shipping', country: 'India', contact: 'Meera Joshi', email: 'fleet@coralline.in' },
  { id: 'CLI-0004', name: 'Nordic Container Lines AS', country: 'Norway', contact: 'Erik Larsen', email: 'manning@nordiccl.no' },
]

const VESSEL_NAMES = ['MV Ocean Pioneer', 'MT Blue Horizon', 'MV Coral Star', 'MV Nordic Spirit', 'MT Aegean Grace', 'MV Indus Trader', 'LPG Sea Falcon', 'MV Pacific Dawn']
const FLAGS = ['Panama', 'Liberia', 'Marshall Islands', 'Singapore', 'India', 'Malta', 'Bahamas', 'Hong Kong']

// Minimum safe manning per vessel (rank -> count)
const BASE_MANNING = {
  Master: 1, 'Chief Officer': 1, 'Second Officer': 1, 'Third Officer': 1, Bosun: 1, 'Able Seaman': 3, 'Ordinary Seaman': 1,
  'Chief Engineer': 1, 'Second Engineer': 1, 'Third Engineer': 1, 'Fourth Engineer': 1, 'Electro-Technical Officer': 1, Fitter: 1, Oiler: 2, Wiper: 1,
  'Chief Cook': 1, Steward: 1,
}

export function buildSeed() {
  const vessels = VESSEL_NAMES.map((name, i) => ({
    id: `VSL-${pad(i + 1)}`,
    name,
    imo: String(9300000 + int(10000, 99999)),
    type: name.startsWith('MT') ? (i % 2 ? 'Product Tanker' : 'Crude Oil Tanker') : name.startsWith('LPG') ? 'LPG Carrier' : pick(['Bulk Carrier', 'Container Ship', 'General Cargo']),
    flag: FLAGS[i],
    owner: pick(['Pioneer Maritime Ltd', 'Horizon Holdings Inc', 'Coral Shipowning', 'Aegean Ship Owners']),
    manager: CLIENTS[i % CLIENTS.length].name,
    clientId: CLIENTS[i % CLIENTS.length].id,
    grt: int(18000, 62000),
    dwt: int(28000, 115000),
    built: String(int(2006, 2022)),
    tradingArea: pick(TRADING),
    status: i === 6 ? 'Dry Dock' : 'In Service',
    manning: Object.entries(BASE_MANNING).map(([rank, required]) => ({ rank, required })),
    documents: [
      { name: 'Safe Manning Document', expiry: addDays(int(60, 700)) },
      { name: 'Certificate of Registry', expiry: addDays(int(200, 1500)) },
      { name: 'ISM Safety Management Certificate', expiry: addDays(int(20, 900)) },
    ],
  }))

  const allRanks = RANKS.flatMap((d) => d.ranks.map((r) => ({ dept: d.department, rank: r })))
  const crew = []
  const documents = []
  const assignments = []
  const contracts = []
  const medicals = []
  const seaService = []
  const comments = []
  let docN = 1, asgN = 1, conN = 1, medN = 1, ssN = 1, cmN = 1

  // Ensure each vessel gets most core ranks filled
  const onboardPlan = []
  vessels.forEach((v) => {
    if (v.status !== 'In Service') return
    v.manning.forEach(({ rank, required }) => {
      for (let k = 0; k < required; k++) if (rnd() < 0.86) onboardPlan.push({ vessel: v, rank })
    })
  })

  const TOTAL = Math.max(90, onboardPlan.length + 30)
  for (let i = 0; i < TOTAL; i++) {
    const planned = onboardPlan[i]
    const r = planned ? allRanks.find((x) => x.rank === planned.rank) : pick(allRanks)
    const first = pick(FIRST)
    const last = pick(LAST)
    const nationality = pick(NATIONALITY)
    const senior = ['Master', 'Chief Officer', 'Chief Engineer', 'Second Engineer'].includes(r.rank)
    const age = senior ? int(34, 58) : int(21, 50)
    const totalExpMonths = Math.min((age - 19) * 10, int(senior ? 110 : 10, senior ? 300 : 160))
    const status = planned ? 'Onboard' : i % 9 === 0 ? 'Candidate' : i % 11 === 0 ? 'On Leave' : i % 17 === 0 ? 'Inactive' : 'Available'
    const id = `CRW-${pad(i + 1)}`
    const lastSignOff = status === 'Onboard' ? addDays(-int(300, 500)) : addDays(-int(15, 200))
    const c = {
      id,
      employeeId: `EMP-${pad(1000 + i)}`,
      firstName: first,
      lastName: last,
      dob: addDays(-age * 365 - int(0, 300)),
      gender: first === 'Priya' || first === 'Anjali' || first === 'Maria' || first === 'Elena' ? 'Female' : 'Male',
      nationality,
      phone: `+91 9${int(100000000, 999999999)}`,
      email: `${first.toLowerCase()}.${last.toLowerCase().replace(/[^a-z]/g, '')}${i}@mail.com`,
      address: `${int(1, 300)}, ${pick(['Harbour Road', 'Marine Drive', 'Beach Road', 'Port View', 'Station Road'])}, ${pick(CITIES)}`,
      passportNo: `${String.fromCharCode(65 + int(0, 25))}${int(1000000, 9999999)}`,
      passportExpiry: addDays(int(-20, 3000)),
      cdcNo: `${nationality === 'Indian' ? 'MUM' : 'CDC'}${int(100000, 999999)}`,
      cdcExpiry: addDays(int(40, 3000)),
      indosNo: nationality === 'Indian' ? `${int(10, 23)}${pick(['GL', 'HL', 'NL'])}${int(1000, 9999)}` : '',
      emergencyName: `${pick(FIRST)} ${last}`,
      emergencyRelation: pick(['Spouse', 'Father', 'Mother', 'Brother', 'Sister']),
      emergencyPhone: `+91 9${int(100000000, 999999999)}`,
      department: r.dept,
      rank: r.rank,
      totalExperienceMonths: totalExpMonths,
      rankExperienceMonths: Math.round(totalExpMonths * (0.2 + rnd() * 0.4)),
      previousEmployer: pick(['Anglo-Eastern', 'V.Ships', 'Synergy Marine', 'Fleet Management', 'Wallem', 'Bernhard Schulte']),
      vesselTypeExperience: [pick(VESSEL_TYPES), pick(VESSEL_TYPES)].filter((v, idx, a) => a.indexOf(v) === idx).join(', '),
      lastSignOn: status === 'Onboard' ? addDays(-int(20, 160)) : addDays(-int(220, 400)),
      lastSignOff,
      availableFrom: status === 'Available' ? addDays(int(-30, 45)) : '',
      expectedSalary: int(1200, 12000),
      preferredVesselType: pick(VESSEL_TYPES),
      preferredTradingArea: pick(TRADING),
      status,
      photo: '',
      createdAt: addDays(-int(30, 1200)),
    }
    crew.push(c)

    // Documents
    DOCUMENT_TYPES.forEach((type) => {
      if (type === 'INDOS Certificate' && !c.indosNo) return
      if (['Yellow Fever Certificate', 'Visa / Work Permit', 'GMDSS Certificate'].includes(type) && rnd() < 0.4) return
      if (type === 'Certificate of Competency (COC)' && ['Ordinary Seaman', 'Wiper', 'Steward', 'Able Seaman', 'Oiler', 'Fitter', 'Bosun', 'Chief Cook', 'Messman'].includes(c.rank)) return
      const expiry = type === 'Passport' ? c.passportExpiry : type === 'CDC / Seaman Book' ? c.cdcExpiry : addDays(int(-40, 1400))
      const verificationRoll = rnd()
      documents.push({
        id: `DOC-${pad(docN++, 5)}`,
        crewId: id,
        type,
        number: type === 'Passport' ? c.passportNo : type === 'CDC / Seaman Book' ? c.cdcNo : `${type.slice(0, 3).toUpperCase()}-${int(10000, 99999)}`,
        issueDate: addDays(-int(300, 1800)),
        expiryDate: expiry,
        issuingAuthority: type === 'Passport' ? `Govt. of ${nationality === 'Indian' ? 'India' : nationality}` : pick(['DG Shipping, India', 'MARINA, Philippines', 'Panama Maritime Authority', 'Liberian Registry', 'MCA, UK']),
        status: verificationRoll < 0.78 ? 'Verified' : verificationRoll < 0.93 ? 'Pending' : 'Rejected',
        remarks: verificationRoll >= 0.93 ? 'Scan illegible – please re-upload' : '',
        version: int(1, 3),
        fileName: `${type.replace(/[^a-z]/gi, '_')}_${id}.pdf`,
      })
    })

    // Medical
    const fit = rnd()
    medicals.push({
      id: `MED-${pad(medN++)}`,
      crewId: id,
      examDate: addDays(-int(30, 700)),
      expiryDate: addDays(int(-30, 700)),
      centre: pick(MED_CENTRES),
      doctor: `Dr. ${pick(FIRST)} ${pick(LAST)}`,
      status: fit < 0.88 ? 'Fit' : fit < 0.96 ? 'Temporarily Unfit' : 'Unfit',
      restrictions: fit < 0.88 ? '' : 'Review after 3 months',
      remarks: '',
    })

    // Sea service history (2-3 past voyages)
    for (let s = 0; s < int(2, 4); s++) {
      const start = addDays(-int(400, 2600))
      seaService.push({
        id: `SS-${pad(ssN++, 5)}`,
        crewId: id,
        vesselName: pick(['MV Star Aurora', 'MT Gulf Eagle', 'MV Asian Pride', 'MV Baltic Wind', 'MT Pacific Jade', ...VESSEL_NAMES]),
        vesselType: pick(VESSEL_TYPES),
        rank: c.rank,
        company: pick(['Anglo-Eastern', 'V.Ships', 'Synergy Marine', 'Fleet Management', 'Wallem']),
        signOn: start,
        signOff: addDays(int(120, 270), new Date(start)),
        grt: int(15000, 80000),
      })
    }

    if (planned) {
      const start = c.lastSignOn
      const months = pick([4, 6, 6, 9])
      const end = addDays(months * 30, new Date(start))
      assignments.push({
        id: `ASG-${pad(asgN++)}`,
        crewId: id,
        vesselId: planned.vessel.id,
        rank: c.rank,
        signOnDate: start,
        plannedSignOff: end,
        joiningPort: pick(PORTS),
        status: 'Onboard',
        approval: 'Approved',
      })
      const salary = salaryFor(c.rank)
      contracts.push({
        id: `CON-${pad(conN++)}`,
        crewId: id,
        vesselId: planned.vessel.id,
        rank: c.rank,
        startDate: start,
        endDate: end,
        durationMonths: months,
        basicWage: salary.basic,
        fixedOT: salary.ot,
        leavePay: salary.leave,
        otherAllowance: salary.other,
        currency: 'USD',
        cba: pick(['ITF', 'IBF', 'Company CBA']),
        terms: 'As per MLC 2006 and applicable CBA. Repatriation at company cost on completion of contract.',
        status: 'Active',
        approval: 'Approved',
        signed: true,
        version: 1,
      })
    }

    if (rnd() < 0.12) {
      comments.push({ id: `CMT-${pad(cmN++)}`, crewId: id, author: 'Neha Kapoor (HR)', date: addDays(-int(1, 90)), text: pick(['Called for availability – will confirm next week.', 'Prefers tanker vessels, good feedback from last Master.', 'Pending updated STCW refresher.', 'Requested salary revision, discussed with Crewing Manager.']) })
    }
  }

  // Upcoming / planned assignments for some available crew
  crew.filter((c) => c.status === 'Available').slice(0, 6).forEach((c, idx) => {
    const v = vessels[idx % 6]
    const join = addDays(int(5, 40))
    assignments.push({
      id: `ASG-${pad(asgN++)}`,
      crewId: c.id,
      vesselId: v.id,
      rank: c.rank,
      signOnDate: join,
      plannedSignOff: addDays(180, new Date(join)),
      joiningPort: pick(PORTS),
      status: 'Planned',
      approval: idx % 3 === 0 ? 'Pending' : 'Approved',
    })
  })

  // Completed (sign-off history)
  const signOffs = []
  crew.filter((c) => c.status === 'Available' || c.status === 'On Leave').slice(6, 22).forEach((c, idx) => {
    const v = vessels[idx % vessels.length]
    const off = c.lastSignOff
    const on = addDays(-int(150, 270), new Date(off))
    assignments.push({ id: `ASG-${pad(asgN++)}`, crewId: c.id, vesselId: v.id, rank: c.rank, signOnDate: on, plannedSignOff: off, actualSignOff: off, joiningPort: pick(PORTS), status: 'Completed', approval: 'Approved' })
    signOffs.push({
      id: `SOF-${pad(idx + 1)}`,
      crewId: c.id,
      vesselId: v.id,
      rank: c.rank,
      signOffDate: off,
      port: pick(PORTS),
      reason: pick(['Contract Completed', 'Contract Completed', 'Contract Completed', 'Medical Grounds', 'Family Emergency', 'Company Request']),
      masterAppraisal: pick(['Excellent', 'Good', 'Good', 'Satisfactory']),
      settlementStatus: idx % 4 === 0 ? 'Pending' : 'Settled',
      nextEligibility: pick(['Eligible', 'Eligible', 'Eligible', 'Review Required']),
    })
  })

  const signOns = assignments.filter((a) => a.status === 'Onboard').slice(0, 18).map((a, idx) => ({
    id: `SON-${pad(idx + 1)}`,
    crewId: a.crewId,
    vesselId: a.vesselId,
    rank: a.rank,
    joiningDate: a.signOnDate,
    port: a.joiningPort,
    joiningConfirmed: true,
    masterConfirmed: idx % 7 !== 0,
    contractCommenced: true,
    documentsReceived: idx % 5 !== 0,
  }))

  // Vacancies
  const vacancyRanks = ['Chief Officer', 'Second Engineer', 'Able Seaman', 'Electro-Technical Officer', 'Third Officer', 'Oiler', 'Chief Cook', 'Master', 'Fitter', 'Fourth Engineer']
  const vacancies = vacancyRanks.map((rank, i) => {
    const v = vessels[i % vessels.length]
    const dept = allRanks.find((x) => x.rank === rank).dept
    return {
      id: `VAC-${pad(i + 1)}`,
      title: `${rank} – ${v.type}`,
      clientId: v.clientId,
      vesselId: v.id,
      rank,
      department: dept,
      numberRequired: rank === 'Able Seaman' || rank === 'Oiler' ? 2 : 1,
      minExperienceMonths: rank === 'Master' || rank.startsWith('Chief') ? 36 : 12,
      mandatoryCertificates: dept === 'Deck' ? 'COC, STCW Basic, GMDSS, Tanker Familiarisation' : dept === 'Engine' ? 'COC, STCW Basic, ERM' : 'STCW Basic, Food Safety',
      salary: salaryFor(rank).basic + salaryFor(rank).ot,
      currency: 'USD',
      contractMonths: pick([4, 6, 9]),
      joiningDate: addDays(int(10, 60)),
      joiningPort: pick(PORTS),
      deadline: addDays(int(-5, 30)),
      status: i < 7 ? 'Open' : i === 7 ? 'Hold' : 'Closed',
      description: `Immediate requirement for ${rank} on ${v.type.toLowerCase()} trading ${v.tradingArea}.`,
      postedOn: addDays(-int(3, 40)),
    }
  })

  // Applications / pipeline
  const STAGES = ['Sourcing', 'Screening', 'Interview', 'Client Approval', 'Selected', 'Offer & Contract', 'Joining Preparation']
  const applications = []
  let appN = 1
  vacancies.filter((v) => v.status !== 'Closed').forEach((vac) => {
    const rIdx = allRanks.findIndex((x) => x.rank === vac.rank)
    const near = [allRanks[rIdx]?.rank, allRanks[rIdx + 1]?.dept === vac.department ? allRanks[rIdx + 1].rank : null]
    let pool = crew.filter((c) => c.status !== 'Onboard' && near.includes(c.rank))
    if (pool.length < 2) pool = crew.filter((c) => c.status !== 'Onboard' && c.department === vac.department)
    for (let k = 0; k < int(2, 5); k++) {
      const c = pick(pool)
      if (!c || applications.some((a) => a.crewId === c.id && a.vacancyId === vac.id)) continue
      const stage = STAGES[(appN * 3 + k) % STAGES.length]
      const stIdx = STAGES.indexOf(stage)
      applications.push({
        id: `APP-${pad(appN++)}`,
        vacancyId: vac.id,
        crewId: c.id,
        appliedOn: addDays(-int(1, 30)),
        stage,
        source: pick(['Portal', 'Referral', 'Database', 'Walk-in', 'Job Board']),
        screeningResult: stIdx >= 1 ? 'Shortlisted' : 'Pending',
        interviewDate: stIdx >= 2 ? addDays(int(-10, 10)) : '',
        interviewer: stIdx >= 2 ? pick(['Capt. R. Menon', 'C/E S. Iyer', 'Capt. A. Fernandes']) : '',
        assessmentScore: stIdx >= 2 ? int(55, 95) : '',
        internalApproval: stIdx >= 3 ? 'Approved' : 'Pending',
        clientApproval: stIdx >= 4 ? 'Approved' : stIdx === 3 ? 'Pending' : 'Not Sent',
        offerSent: stIdx >= 5,
        status: 'Active',
        remarks: '',
      })
    }
  })

  // Travel
  const travel = assignments.filter((a) => a.status === 'Planned' || (a.status === 'Onboard' && rnd() < 0.2)).slice(0, 12).map((a, idx) => {
    const c = crew.find((x) => x.id === a.crewId)
    return {
      id: `TRV-${pad(idx + 1)}`,
      crewId: a.crewId,
      vesselId: a.vesselId,
      purpose: 'Joining',
      fromCity: c.address.split(', ').pop(),
      toCity: a.joiningPort,
      departure: addDays(-1, new Date(a.signOnDate)) + 'T' + pick(['02:15', '09:40', '14:05', '23:30']),
      arrival: addDays(0, new Date(a.signOnDate)) + 'T' + pick(['08:20', '13:55', '18:10']),
      airline: pick(['Emirates', 'Singapore Airlines', 'Qatar Airways', 'Air India', 'KLM']),
      flightNo: `${pick(['EK', 'SQ', 'QR', 'AI', 'KL'])} ${int(100, 999)}`,
      pnr: Math.random().toString(36).slice(2, 8).toUpperCase(),
      visaStatus: pick(['Not Required', 'Approved', 'OK to Board', 'Applied']),
      hotel: pick(['Seamen\'s Club', 'Holiday Inn Port', 'Ibis Harbour', '']),
      pickup: pick(['Agent – Airport pickup arranged', 'Taxi reimbursement', 'Agent to meet at arrivals']),
      agent: pick(['GAC Shipping', 'Wilhelmsen Ships Service', 'Inchcape Shipping']),
      expenses: int(400, 1800),
      currency: 'USD',
      status: a.status === 'Onboard' ? 'Completed' : idx % 3 === 0 ? 'Pending Approval' : 'Booked',
      joiningConfirmed: a.status === 'Onboard',
      instructions: `Report to ship's agent at ${a.joiningPort}. Carry original CDC, passport, COC, medical and yellow-fever certificate. Agent contact will be shared 24h before departure.`,
    }
  })

  // Appraisals
  const appraisals = signOffs.slice(0, 14).map((s, idx) => {
    const scores = [int(2, 5), int(2, 5), int(3, 5), int(3, 5)]
    const avg = scores.reduce((a, b) => a + b, 0) / 4
    return {
      id: `APR-${pad(idx + 1)}`,
      crewId: s.crewId,
      vesselId: s.vesselId,
      rank: s.rank,
      periodFrom: addDays(-180, new Date(s.signOffDate)),
      periodTo: s.signOffDate,
      evaluator: s.rank.includes('Engineer') || ['Oiler', 'Fitter', 'Wiper'].includes(s.rank) ? 'Chief Engineer' : 'Master',
      technical: scores[0],
      safety: scores[1],
      behaviour: scores[2],
      teamwork: scores[3],
      overall: Math.round(avg * 10) / 10,
      rehire: avg >= 3 ? 'Yes' : 'No',
      trainingRecommendation: avg < 3.5 ? pick(['Bridge Resource Management refresher', 'Engine Room Resource Management', 'Leadership & Teamwork']) : '',
      comments: avg >= 4 ? 'Reliable officer, recommended for promotion.' : 'Meets expectations.',
    }
  })

  // Payroll for current month (onboard crew)
  const month = iso(TODAY).slice(0, 7)
  const payroll = contracts.map((con, idx) => {
    const ot = int(0, 60) * 9
    const advance = idx % 4 === 0 ? int(100, 500) : 0
    const deductions = int(20, 120)
    const gross = con.basicWage + con.fixedOT + con.leavePay + con.otherAllowance + ot
    return {
      id: `PAY-${pad(idx + 1)}`,
      crewId: con.crewId,
      vesselId: con.vesselId,
      period: month,
      basic: con.basicWage,
      fixedOT: con.fixedOT,
      extraOT: ot,
      leaveWages: con.leavePay,
      allowances: con.otherAllowance,
      advance,
      deductions,
      allotment: Math.round(gross * 0.8),
      currency: con.currency,
      gross,
      net: gross - advance - deductions,
      status: idx % 5 === 0 ? 'Processing' : idx % 7 === 0 ? 'On Hold' : 'Paid',
      bank: pick(['SBI', 'HDFC Bank', 'ICICI Bank', 'BDO Unibank', 'PrivatBank']),
    }
  })

  const salaryStructures = RANKS.flatMap((d) => d.ranks).map((rank, idx) => {
    const s = salaryFor(rank)
    return { id: `SAL-${pad(idx + 1)}`, rank, basic: s.basic, fixedOT: s.ot, leavePay: s.leave, otherAllowance: s.other, currency: 'USD', otRate: Math.round(s.basic / 190 * 1.25) }
  })

  // Training
  const courses = [
    { name: 'STCW Basic Safety Training', code: 'BST', validityMonths: 60, mandatoryFor: 'All' },
    { name: 'Advanced Fire Fighting', code: 'AFF', validityMonths: 60, mandatoryFor: 'Officers' },
    { name: 'Medical First Aid', code: 'MFA', validityMonths: 60, mandatoryFor: 'Officers' },
    { name: 'Bridge Resource Management', code: 'BRM', validityMonths: 60, mandatoryFor: 'Deck Officers' },
    { name: 'Engine Room Resource Management', code: 'ERM', validityMonths: 60, mandatoryFor: 'Engine Officers' },
    { name: 'ECDIS Generic', code: 'ECDIS', validityMonths: 0, mandatoryFor: 'Deck Officers' },
    { name: 'Tanker Familiarisation (Oil & Chem)', code: 'TF', validityMonths: 60, mandatoryFor: 'Tanker Crew' },
    { name: 'Ship Security Awareness', code: 'SSA', validityMonths: 0, mandatoryFor: 'All' },
    { name: 'High Voltage Safety', code: 'HV', validityMonths: 60, mandatoryFor: 'Engine Officers' },
    { name: 'Food Safety & Hygiene', code: 'FSH', validityMonths: 36, mandatoryFor: 'Catering' },
  ].map((c, i) => ({ id: `CRS-${pad(i + 1)}`, ...c, institute: pick(INSTITUTES), durationDays: int(2, 10) }))

  const trainingRecords = []
  let trN = 1
  crew.forEach((c) => {
    courses.forEach((course) => {
      if (!isMandatory(course, c)) return
      if (rnd() < 0.12) return // gap
      const done = addDays(-int(60, 1800))
      trainingRecords.push({
        id: `TRN-${pad(trN++, 5)}`,
        crewId: c.id,
        courseId: course.id,
        institute: course.institute,
        completedOn: done,
        expiryDate: course.validityMonths ? addDays(course.validityMonths * 30, new Date(done)) : '',
        certificateNo: `${course.code}-${int(10000, 99999)}`,
        status: 'Completed',
      })
    })
  })

  const notifications = [
    { type: 'Document Expiry', title: 'COC expiring in 30 days', body: '6 officers have COC expiring within 30 days.', channel: 'Email' },
    { type: 'Vacancy', title: 'New vacancy: Chief Officer – Bulk Carrier', body: 'Posted for MV Ocean Pioneer, joining Singapore.', channel: 'WhatsApp' },
    { type: 'Interview', title: 'Interview reminder', body: 'Interview with candidate CRW-0034 scheduled tomorrow 11:00.', channel: 'SMS' },
    { type: 'Contract', title: 'Contract renewal due', body: '4 contracts end within 30 days – plan relief.', channel: 'Email' },
    { type: 'Travel', title: 'Flight booked', body: 'EK 501 booked for joining crew to Fujairah.', channel: 'WhatsApp' },
    { type: 'Joining', title: 'Joining instructions sent', body: 'Joining instructions sent to 3 crew members.', channel: 'Email' },
    { type: 'Medical', title: 'Medical expired', body: '2 seafarers have expired medical certificates.', channel: 'Email' },
    { type: 'Payroll', title: 'Payroll processed', body: `Payroll for ${month} processed for onboard crew.`, channel: 'Email' },
      { type: 'Payroll', title: 'Payslip published', body: `Your payslip for ${month} is available in Salary Slips.`, channel: 'Email', audience: 'Crew' },
    { type: 'General', title: 'Updated MLC wage guidelines', body: 'Revised CBA wage scales effective next month. See your contract for details.', channel: 'Email', audience: 'Crew' },
  ].map((n, i) => ({ id: `NTF-${pad(i + 1)}`, audience: n.type === 'Vacancy' ? 'Crew' : 'Internal', ...n, date: addDays(-i), read: i > 3, status: 'Sent' }))

  const requests = [
    { crewId: 'CRW-0003', subject: 'Leave extension', message: 'Requesting 2 more weeks of leave before next joining.', status: 'Open' },
    { crewId: 'CRW-0005', subject: 'Allotment change', message: 'Please update my allotment bank account.', status: 'In Progress' },
    { crewId: 'CRW-0001', subject: 'Salary slip correction', message: 'Overtime for last month seems missing.', status: 'Resolved' },
  ].map((r, i) => ({ id: `REQ-${pad(i + 1)}`, ...r, date: addDays(-i * 3 - 1), response: r.status === 'Resolved' ? 'Corrected in this month\'s payroll.' : '' }))

  const users = [
    ['Admin User', 'admin@crewdesk.com', 'Super Admin'],
    ['Neha Kapoor', 'hr@crewdesk.com', 'HR Manager'],
    ['Capt. Rajiv Menon', 'crewing@crewdesk.com', 'Crewing Manager'],
    ['Sonia Thomas', 'recruitment@crewdesk.com', 'Recruitment Manager'],
    ['Aman Gupta', 'recruiter@crewdesk.com', 'Recruitment Executive'],
    ['Farah Sheikh', 'docs@crewdesk.com', 'Documentation Executive'],
    ['Vivek Rao', 'ops@crewdesk.com', 'Operations Manager'],
    ['Kavita Jain', 'accounts@crewdesk.com', 'Accounts Manager'],
    ['Capt. Alan D\'Souza', 'master@crewdesk.com', 'Vessel Master'],
    ['Hans Meyer', 'client@crewdesk.com', 'Client Representative'],
  ].map(([name, email, role], i) => ({ id: `USR-${pad(i + 1)}`, name, email, role, status: 'Active', mfa: i < 3, lastLogin: addDays(-int(0, 10)) }))

  const audit = []

  return {
    crew, vessels, clients: CLIENTS, documents, assignments, contracts, medicals, seaService, comments,
    vacancies, applications, travel, signOns, signOffs, appraisals, payroll, salaryStructures,
    courses, trainingRecords, notifications, requests, users, audit,
  }
}

export function salaryFor(rank) {
  const table = {
    Master: 11500, 'Chief Officer': 8200, 'Second Officer': 4600, 'Third Officer': 3500, 'Deck Cadet': 600,
    Bosun: 2100, 'Able Seaman': 1650, 'Ordinary Seaman': 1150,
    'Chief Engineer': 11000, 'Second Engineer': 7900, 'Third Engineer': 4400, 'Fourth Engineer': 3300, 'Electro-Technical Officer': 4800, 'Engine Cadet': 600,
    Fitter: 2050, Oiler: 1600, Wiper: 1150,
    'Chief Cook': 2000, 'Second Cook': 1500, Steward: 1300, Messman: 1100,
  }
  const total = table[rank] || 1500
  return { basic: Math.round(total * 0.55), ot: Math.round(total * 0.25), leave: Math.round(total * 0.12), other: Math.round(total * 0.08) }
}


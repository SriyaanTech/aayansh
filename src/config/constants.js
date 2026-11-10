export const RANKS = [
  { department: 'Deck', ranks: ['Master', 'Chief Officer', 'Second Officer', 'Third Officer', 'Deck Cadet', 'Bosun', 'Able Seaman', 'Ordinary Seaman'] },
  { department: 'Engine', ranks: ['Chief Engineer', 'Second Engineer', 'Third Engineer', 'Fourth Engineer', 'Electro-Technical Officer', 'Engine Cadet', 'Fitter', 'Oiler', 'Wiper'] },
  { department: 'Catering', ranks: ['Chief Cook', 'Second Cook', 'Steward', 'Messman'] },
]
export const ALL_RANKS = RANKS.flatMap((d) => d.ranks)
export const DEPARTMENTS = RANKS.map((d) => d.department)
export const rankDept = (rank) => RANKS.find((d) => d.ranks.includes(rank))?.department || ''

export const VESSEL_TYPES = ['Bulk Carrier', 'Container Ship', 'Crude Oil Tanker', 'Product Tanker', 'Chemical Tanker', 'LPG Carrier', 'LNG Carrier', 'General Cargo', 'Offshore Supply', 'Car Carrier']
export const VESSEL_STATUS = ['In Service', 'Dry Dock', 'Laid Up', 'Sold']
export const TRADING_AREAS = ['Worldwide', 'Far East', 'Middle East', 'Europe', 'Americas', 'India Coastal']

export const CREW_STATUS = ['Candidate', 'Available', 'Onboard', 'On Leave', 'Planned', 'Inactive', 'Blacklisted']

export const DOCUMENT_TYPES = [
  'Passport', 'CDC / Seaman Book', 'INDOS Certificate', 'Certificate of Competency (COC)', 'Certificate of Proficiency (COP)',
  'STCW Basic Safety', 'GMDSS Certificate', 'Medical Fitness Certificate', 'Yellow Fever Certificate', 'Visa / Work Permit',
  'Sea Service Certificate', 'Educational Certificate',
]
export const DOC_STATUS = ['Pending', 'Verified', 'Rejected']

export const VACANCY_STATUS = ['Open', 'Hold', 'Closed']
export const PIPELINE_STAGES = ['Sourcing', 'Screening', 'Interview', 'Client Approval', 'Selected', 'Offer & Contract', 'Joining Preparation']

export const MEDICAL_STATUS = ['Fit', 'Temporarily Unfit', 'Unfit']
export const CONTRACT_STATUS = ['Draft', 'Pending Approval', 'Active', 'Completed', 'Terminated']
export const APPROVAL = ['Pending', 'Approved', 'Rejected']
export const CURRENCIES = ['USD', 'EUR', 'INR', 'SGD', 'PHP', 'GBP']
export const SIGNOFF_REASONS = ['Contract Completed', 'Medical Grounds', 'Family Emergency', 'Company Request', 'Disciplinary', 'Vessel Sold / Laid Up', 'Own Request']
export const TRAVEL_STATUS = ['Requested', 'Pending Approval', 'Booked', 'Completed', 'Cancelled']
export const PAY_STATUS = ['Draft', 'Processing', 'Paid', 'On Hold']
export const PORTS = ['Singapore', 'Rotterdam', 'Fujairah', 'Mumbai', 'Houston', 'Busan', 'Shanghai', 'Santos', 'Durban', 'Colombo', 'Piraeus', 'Antwerp', 'Kochi', 'Chennai']

export const ROLES = [
  'Super Admin', 'HR Manager', 'Crewing Manager', 'Recruitment Manager', 'Recruitment Executive', 'Documentation Executive',
  'Operations Manager', 'Accounts Manager', 'Vessel Master', 'Client Representative', 'Crew Member',
]

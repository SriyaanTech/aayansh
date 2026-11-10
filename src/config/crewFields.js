import { ALL_RANKS, DEPARTMENTS, VESSEL_TYPES, TRADING_AREAS, CREW_STATUS, rankDept } from './constants'

export const CREW_FIELDS = [
  { type: 'section', label: 'Personal details' },
  { name: 'employeeId', label: 'Employee ID' },
  { name: 'firstName', label: 'First name', required: true },
  { name: 'lastName', label: 'Last name', required: true },
  { name: 'dob', label: 'Date of birth', type: 'date', required: true },
  { name: 'gender', label: 'Gender', type: 'select', options: ['Male', 'Female', 'Other'] },
  { name: 'nationality', label: 'Nationality', required: true },
  { name: 'phone', label: 'Contact number', type: 'tel', required: true },
  { name: 'email', label: 'Email', type: 'email', required: true },
  { name: 'address', label: 'Address', span: 3 },
  { type: 'section', label: 'Identity documents' },
  { name: 'passportNo', label: 'Passport no.', required: true },
  { name: 'passportExpiry', label: 'Passport expiry', type: 'date' },
  { name: 'cdcNo', label: 'CDC / Seaman book no.' },
  { name: 'cdcExpiry', label: 'CDC expiry', type: 'date' },
  { name: 'indosNo', label: 'INDOS no.', hint: 'Indian seafarers only' },
  { name: 'photo', label: 'Profile photograph', type: 'file', urlField: 'photo' },
  { type: 'section', label: 'Emergency contact / next of kin' },
  { name: 'emergencyName', label: 'Name' },
  { name: 'emergencyRelation', label: 'Relation' },
  { name: 'emergencyPhone', label: 'Phone', type: 'tel' },
  { type: 'section', label: 'Professional details' },
  { name: 'rank', label: 'Rank / designation', type: 'select', options: ALL_RANKS, required: true, effect: (v) => ({ department: rankDept(v.rank) }) },
  { name: 'department', label: 'Department', type: 'select', options: DEPARTMENTS, required: true },
  { name: 'status', label: 'Crew status', type: 'select', options: CREW_STATUS, required: true, default: 'Candidate' },
  { name: 'totalExperienceMonths', label: 'Total sea experience (months)', type: 'number', min: 0 },
  { name: 'rankExperienceMonths', label: 'Experience in rank (months)', type: 'number', min: 0 },
  { name: 'previousEmployer', label: 'Previous employer' },
  { name: 'vesselTypeExperience', label: 'Vessel type experience', placeholder: 'e.g. Bulk Carrier, Product Tanker' },
  { name: 'lastSignOn', label: 'Last sign-on', type: 'date' },
  { name: 'lastSignOff', label: 'Last sign-off', type: 'date' },
  { name: 'availableFrom', label: 'Available from', type: 'date' },
  { name: 'expectedSalary', label: 'Expected salary (USD/month)', type: 'number', min: 0 },
  { name: 'preferredVesselType', label: 'Preferred vessel type', type: 'select', options: VESSEL_TYPES },
  { name: 'preferredTradingArea', label: 'Preferred trading area', type: 'select', options: TRADING_AREAS },
]

// Duplicate detection: same passport, same email, or same name + DOB.
export function findDuplicates(crew, candidate, excludeId) {
  const norm = (s) => String(s || '').trim().toLowerCase()
  return crew.filter((c) => c.id !== excludeId && (
    (candidate.passportNo && norm(c.passportNo) === norm(candidate.passportNo)) ||
    (candidate.email && norm(c.email) === norm(candidate.email)) ||
    (candidate.cdcNo && norm(c.cdcNo) === norm(candidate.cdcNo)) ||
    (candidate.firstName && norm(c.firstName) === norm(candidate.firstName) && norm(c.lastName) === norm(candidate.lastName) && c.dob === candidate.dob)
  ))
}

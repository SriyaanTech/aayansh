// Which training courses are mandatory for a given seafarer.
export function isMandatory(course, crew) {
  const officerRanks = ['Master', 'Chief Officer', 'Second Officer', 'Third Officer', 'Chief Engineer', 'Second Engineer', 'Third Engineer', 'Fourth Engineer', 'Electro-Technical Officer']
  const isOfficer = officerRanks.includes(crew.rank)
  switch (course.mandatoryFor) {
    case 'All': return true
    case 'Officers': return isOfficer
    case 'Deck Officers': return isOfficer && crew.department === 'Deck'
    case 'Engine Officers': return isOfficer && crew.department === 'Engine'
    case 'Catering': return crew.department === 'Catering'
    case 'Tanker Crew': return (crew.preferredVesselType || '').includes('Tanker') || (crew.vesselTypeExperience || '').includes('Tanker')
    default: return false
  }
}

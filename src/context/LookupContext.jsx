import { createContext, useContext, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useData } from '../api/hooks'
import { fullName } from '../utils/format'
import { Avatar } from '../components/ui'

const Ctx = createContext({})

// App-wide id -> record maps for the master entities everything else references.
export function LookupProvider({ children }) {
  const { crew, vessels, clients, vacancies, courses, loading } = useData('crew', 'vessels', 'clients', 'vacancies', 'courses')
  const value = useMemo(() => {
    const m = (l) => Object.fromEntries((l || []).map((x) => [x.id, x]))
    const crewById = m(crew); const vesselById = m(vessels); const clientById = m(clients); const vacancyById = m(vacancies); const courseById = m(courses)
    return {
      loading, crew, vessels, clients, vacancies, courses, crewById, vesselById, clientById, vacancyById, courseById,
      crewName: (id) => fullName(crewById[id]) || id,
      vesselName: (id) => vesselById[id]?.name || id || '—',
      clientName: (id) => clientById[id]?.name || id || '—',
    }
  }, [crew, vessels, clients, vacancies, courses, loading])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export const useLookups = () => useContext(Ctx)

export function CrewCell({ id, sub = true }) {
  const { crewById } = useLookups()
  const c = crewById[id]
  if (!c) return <span className="muted">{id || '—'}</span>
  return (
    <Link to={`/crew/${c.id}`} className="crew-cell" onClick={(e) => e.stopPropagation()}>
      <Avatar name={fullName(c)} src={c.photo} size={28} />
      <span>
        <strong>{fullName(c)}</strong>
        {sub && <small className="muted">{c.id} · {c.rank}</small>}
      </span>
    </Link>
  )
}

export function VesselCell({ id }) {
  const { vesselById } = useLookups()
  const v = vesselById[id]
  if (!v) return <span className="muted">{id || '—'}</span>
  return <Link to={`/vessels/${v.id}`} className="link" onClick={(e) => e.stopPropagation()}>{v.name}</Link>
}

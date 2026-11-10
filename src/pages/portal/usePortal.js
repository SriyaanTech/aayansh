import { useAuth } from '../../context/AuthContext'
import { useLookups } from '../../context/LookupContext'

export function usePortal() {
  const { user } = useAuth()
  const L = useLookups()
  const id = user?.crewId
  return { id, me: L.crewById[id], ...L, mine: (list) => (list || []).filter((x) => x.crewId === id) }
}

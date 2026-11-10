import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api } from '../api/client'
import { useConfig } from '../api/hooks'
import { DEFAULT_PERMISSIONS } from '../config/permissions'

const AuthCtx = createContext(null)
const KEY = 'crewdesk_session'

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem(KEY)) } catch { return null }
  })
  const [permissions] = useConfig('permissions')
  const [settings] = useConfig('settings')

  const saveSession = (s) => {
    if (s) sessionStorage.setItem(KEY, JSON.stringify(s)); else sessionStorage.removeItem(KEY)
    setSession(s)
  }

  const login = useCallback(async (creds) => {
    const res = await api.login(creds)
    if (res.mfaRequired) return res
    saveSession({ token: res.token, user: res.user, at: Date.now() })
    return res
  }, [])

  const verifyMfa = useCallback(async (payload) => {
    const res = await api.verifyMfa(payload)
    saveSession({ token: res.token, user: res.user, at: Date.now() })
    return res
  }, [])

  const logout = useCallback(() => {
    api.logout(session?.user)
    saveSession(null)
  }, [session])

  // Session timeout on inactivity
  useEffect(() => {
    if (!session) return
    const minutes = settings?.sessionTimeoutMinutes || 30
    let t
    const reset = () => { clearTimeout(t); t = setTimeout(() => { saveSession(null); window.location.assign('/login?timeout=1') }, minutes * 60000) }
    const events = ['mousemove', 'keydown', 'click', 'scroll']
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }))
    reset()
    return () => { clearTimeout(t); events.forEach((e) => window.removeEventListener(e, reset)) }
  }, [session, settings?.sessionTimeoutMinutes])

  const can = useCallback((module, action = 'view') => {
    const role = session?.user?.role
    if (!role) return false
    const matrix = permissions || DEFAULT_PERMISSIONS
    return (matrix[role]?.[module] || []).includes(action)
  }, [session, permissions])

  const value = useMemo(() => ({ user: session?.user || null, login, verifyMfa, logout, can, settings }), [session, login, verifyMfa, logout, can, settings])
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>
}

export const useAuth = () => useContext(AuthCtx)

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { api, subscribe } from './client'

// Load one or more collections and keep them fresh when they change.
// const { crew, vessels, loading } = useData('crew', 'vessels')
export function useData(...resources) {
  const key = resources.join('|')
  const [state, setState] = useState(() => Object.fromEntries(resources.map((r) => [r, []])))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const mounted = useRef(true)

  const load = useCallback(async (only) => {
    const list = only ? [only] : key.split('|')
    try {
      const results = await Promise.all(list.map((r) => api.list(r)))
      if (!mounted.current) return
      setState((s) => ({ ...s, ...Object.fromEntries(list.map((r, i) => [r, results[i]])) }))
      setError(null)
    } catch (e) {
      if (mounted.current) setError(e.message)
    } finally {
      if (mounted.current) setLoading(false)
    }
  }, [key])

  useEffect(() => {
    mounted.current = true
    load()
    const unsub = subscribe((res) => {
      if (res === '*') load()
      else if (key.split('|').includes(res)) load(res)
    })
    return () => { mounted.current = false; unsub() }
  }, [key, load])

  return { ...state, loading, error, reload: load }
}

export function useConfig(key) {
  const [value, setValue] = useState(null)
  useEffect(() => {
    let alive = true
    const get = () => api.getObject(key).then((v) => alive && setValue(v))
    get()
    const unsub = subscribe((r) => (r === key || r === '*') && get())
    return () => { alive = false; unsub() }
  }, [key])
  const save = useCallback((v) => api.setObject(key, v), [key])
  return [value, save]
}

// Build id -> record lookup maps
export function useLookup(list) {
  return useMemo(() => Object.fromEntries((list || []).map((x) => [x.id, x])), [list])
}

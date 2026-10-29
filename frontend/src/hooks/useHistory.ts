import { useCallback, useEffect, useRef, useState } from 'react'
import { api, ApiError } from '../api/client'
import type { Prediction } from '../api/types'

export function useHistory() {
  const [items, setItems] = useState<Prediction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const ctrl = useRef<AbortController | null>(null)

  const load = useCallback(async () => {
    ctrl.current?.abort()
    const c = new AbortController()
    ctrl.current = c
    setLoading(true)
    setError(null)
    try {
      const data = await api.history(c.signal)
      setItems(Array.isArray(data) ? data : [])
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return
      if (e instanceof ApiError && e.status === 401) return // session handler routes to sign-in
      setError(e instanceof Error ? e.message : 'Could not load history.')
    } finally {
      if (ctrl.current === c) setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
    return () => ctrl.current?.abort()
  }, [load])

  return { items, loading, error, reload: load }
}

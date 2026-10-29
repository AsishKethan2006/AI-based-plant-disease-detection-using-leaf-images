import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, session, setUnauthorizedHandler } from '../api/client'
import type { RegisterPayload } from '../api/types'

interface AuthState {
  token: string | null
  username: string | null
  login: (username: string, password: string) => Promise<void>
  register: (payload: RegisterPayload) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => session.getToken())
  const [username, setUsername] = useState<string | null>(() => session.getUsername())

  const logout = useCallback(() => {
    session.clear()
    setToken(null)
    setUsername(null)
  }, [])

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setToken(null)
      setUsername(null)
    })
    return () => setUnauthorizedHandler(null)
  }, [])

  const login = useCallback(async (user: string, password: string) => {
    const name = user.trim()
    const res = await api.login(name, password)
    session.save(res.access_token, name)
    setToken(res.access_token)
    setUsername(name)
  }, [])

  const register = useCallback(async (payload: RegisterPayload) => {
    await api.register(payload)
  }, [])

  const value = useMemo(
    () => ({ token, username, login, register, logout }),
    [token, username, login, register, logout],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

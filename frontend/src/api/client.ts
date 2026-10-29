import { API_BASE_URL } from '../lib/config'
import type { Prediction, RegisterPayload, TokenResponse } from './types'

const TOKEN_KEY = 'leafscope.token'
const USER_KEY = 'leafscope.username'

export const session = {
  getToken: () => sessionStorage.getItem(TOKEN_KEY),
  getUsername: () => sessionStorage.getItem(USER_KEY),
  save(token: string, username: string) {
    sessionStorage.setItem(TOKEN_KEY, token)
    sessionStorage.setItem(USER_KEY, username)
  },
  clear() {
    sessionStorage.removeItem(TOKEN_KEY)
    sessionStorage.removeItem(USER_KEY)
  },
}

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

let onUnauthorized: (() => void) | null = null
export function setUnauthorizedHandler(fn: (() => void) | null) {
  onUnauthorized = fn
}

/** FastAPI returns `detail` as a string, or as a list of validation errors. */
function extractMessage(body: unknown, fallback: string): string {
  if (body && typeof body === 'object' && 'detail' in body) {
    const detail = (body as { detail: unknown }).detail
    if (typeof detail === 'string') return detail
    if (Array.isArray(detail)) {
      const msgs = detail
        .map((d) => {
          if (d && typeof d === 'object' && 'msg' in d) {
            return String((d as { msg: unknown }).msg).replace(/^Value error,\s*/i, '')
          }
          return ''
        })
        .filter(Boolean)
      if (msgs.length) return msgs.join(' ')
    }
  }
  return fallback
}

interface RequestOptions {
  method?: 'GET' | 'POST'
  body?: BodyInit
  headers?: Record<string, string>
  /** Attach bearer token and treat 401 as an expired session. */
  authenticated?: boolean
  signal?: AbortSignal
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json', ...opts.headers }
  if (opts.authenticated) {
    const token = session.getToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }

  let res: Response
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method: opts.method ?? 'GET',
      body: opts.body,
      headers,
      signal: opts.signal,
    })
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err
    throw new ApiError(
      `Cannot reach the diagnosis server at ${API_BASE_URL}. Check that the backend is running and your connection is working.`,
      0,
    )
  }

  let data: unknown = null
  const text = await res.text()
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = null
    }
  }

  if (!res.ok) {
    if (res.status === 401 && opts.authenticated) {
      session.clear()
      onUnauthorized?.()
      throw new ApiError('Your session has expired. Please sign in again.', 401)
    }
    const fallbacks: Record<number, string> = {
      429: 'Too many requests. Please wait a moment and try again.',
      500: 'The server hit an unexpected error. Please try again.',
      503: 'The diagnosis service is temporarily unavailable.',
    }
    throw new ApiError(
      extractMessage(data, fallbacks[res.status] ?? `Request failed (HTTP ${res.status}).`),
      res.status,
    )
  }
  return data as T
}

export const api = {
  health: (signal?: AbortSignal) => request<{ status: string }>('/health', { signal }),

  register: (payload: RegisterPayload) =>
    request<{ message: string }>('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),

  // The login endpoint expects OAuth2 form encoding, never JSON.
  login: (username: string, password: string) =>
    request<TokenResponse>('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ username, password }).toString(),
    }),

  predict: (file: File, signal?: AbortSignal) => {
    const form = new FormData()
    form.append('file', file)
    return request<Prediction>('/predict', { method: 'POST', body: form, authenticated: true, signal })
  },

  history: (signal?: AbortSignal) =>
    request<Prediction[]>('/predict/history', { authenticated: true, signal }),
}

/** Resolve `/static/uploads/...` against the backend origin. */
export function assetUrl(path: string | null | undefined): string | null {
  if (!path) return null
  if (/^https?:\/\//i.test(path)) return path
  return `${API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`
}

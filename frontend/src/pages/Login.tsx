import { Loader2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AuthLayout } from '../components/AuthLayout'
import { Alert, Field } from '../components/ui'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as { from?: string; registered?: boolean } | null
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (busy) return
    if (!username.trim() || !password) {
      setError('Enter your username and password.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await login(username, password)
      navigate(state?.from && state.from !== '/login' ? state.from : '/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed.')
      setBusy(false)
    }
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to continue your diagnoses."
      footer={<>New to LeafScope? <Link to="/register" className="font-semibold text-forest underline underline-offset-4">Create an account</Link></>}
    >
      <form onSubmit={submit} className="space-y-5" noValidate>
        {state?.registered && <Alert tone="success">Account created. Sign in to get started.</Alert>}
        {error && <Alert>{error}</Alert>}
        <Field label="Username" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoFocus required />
        <Field label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
        <button type="submit" disabled={busy} className="btn-primary w-full !py-3">
          {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </AuthLayout>
  )
}

import { Check, Circle, Loader2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthLayout } from '../components/AuthLayout'
import { Alert, Field } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { LANGUAGES, type LanguageCode } from '../lib/config'

// Mirrors backend/routes/auth.py validators.
const USERNAME_RE = /^[a-zA-Z0-9_-]{3,30}$/
const EMAIL_RE = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+$/

export default function Register() {
  const { register, login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', email: '', password: '', lang: 'en' as LanguageCode })
  const [touched, setTouched] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }))
  const pwBytes = new TextEncoder().encode(form.password).length
  const rules = [
    { ok: form.password.length >= 8, text: 'At least 8 characters' },
    { ok: pwBytes <= 72, text: 'No longer than 72 bytes' },
  ]
  const errs = {
    username: USERNAME_RE.test(form.username.trim()) ? null : '3–30 characters: letters, numbers, underscores or hyphens.',
    email: form.email.trim().length <= 254 && EMAIL_RE.test(form.email.trim()) ? null : 'Enter a valid email address.',
    password: rules.every((r) => r.ok) ? null : 'Password does not meet the requirements.',
  }
  const valid = !errs.username && !errs.email && !errs.password

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (busy) return
    setTouched(true)
    if (!valid) return
    setBusy(true)
    setError(null)
    try {
      await register({
        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password,
        preferred_language: form.lang,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed.')
      setBusy(false)
      return
    }
    try {
      await login(form.username, form.password)
      navigate('/', { replace: true })
    } catch {
      navigate('/login', { replace: true, state: { registered: true } })
    }
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Diagnoses and advisories are saved to your account."
      footer={<>Already registered? <Link to="/login" className="font-semibold text-forest underline underline-offset-4">Sign in</Link></>}
    >
      <form onSubmit={submit} className="space-y-5" noValidate>
        {error && <Alert>{error}</Alert>}
        <Field label="Username" value={form.username} onChange={(e) => set('username', e.target.value)} error={touched ? errs.username : null} autoComplete="username" autoFocus required />
        <Field label="Email" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} error={touched ? errs.email : null} autoComplete="email" required />
        <div>
          <Field label="Password" type="password" value={form.password} onChange={(e) => set('password', e.target.value)} autoComplete="new-password" required />
          <ul className="mt-2 space-y-1" aria-label="Password requirements">
            {rules.map((r) => (
              <li key={r.text} className={`flex items-center gap-2 text-xs ${r.ok ? 'text-forest' : 'text-ink-400'}`}>
                {r.ok ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Circle className="h-3.5 w-3.5" aria-hidden="true" />}
                {r.text}
              </li>
            ))}
          </ul>
        </div>
        <fieldset>
          <legend className="mb-1.5 text-[13px] font-semibold text-forest">Advisory language</legend>
          <div className="grid grid-cols-2 gap-2">
            {LANGUAGES.map((l) => (
              <label
                key={l.code}
                className={`flex cursor-pointer items-center justify-between rounded-[10px] border px-3.5 py-2.5 text-sm transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-forest ${
                  form.lang === l.code ? 'border-forest bg-leaf/25 text-forest' : 'border-line bg-white hover:border-forest/40'
                }`}
              >
                <span className="font-medium">{l.label}</span>
                <span className="text-ink-500">{l.native}</span>
                <input type="radio" name="lang" value={l.code} checked={form.lang === l.code} onChange={() => set('lang', l.code)} className="sr-only" />
              </label>
            ))}
          </div>
          <p className="mt-2 text-xs text-ink-400">Chosen once at registration. It cannot be changed later from this app.</p>
        </fieldset>
        <button type="submit" disabled={busy} className="btn-primary w-full !py-3">
          {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          {busy ? 'Creating account…' : 'Create account'}
        </button>
      </form>
    </AuthLayout>
  )
}

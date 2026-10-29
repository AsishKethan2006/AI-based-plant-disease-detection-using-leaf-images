import { AlertCircle, CheckCircle2, type LucideIcon } from 'lucide-react'
import type { InputHTMLAttributes, ReactNode } from 'react'

export function Alert({
  tone = 'error',
  children,
  action,
}: {
  tone?: 'error' | 'success'
  children: ReactNode
  action?: ReactNode
}) {
  const isErr = tone === 'error'
  const Icon = isErr ? AlertCircle : CheckCircle2
  return (
    <div
      role={isErr ? 'alert' : 'status'}
      className={`flex items-start gap-3 rounded-[12px] border px-4 py-3 text-sm ${
        isErr ? 'border-clay/40 bg-clay-100 text-clay-700' : 'border-leaf-600/40 bg-leaf/25 text-forest'
      }`}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div className="flex-1 leading-relaxed">{children}</div>
      {action}
    </div>
  )
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-md bg-forest/[0.07] ${className}`} />
}

export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
}: {
  icon: LucideIcon
  title: string
  body: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-[16px] rounded-br-[4px] bg-leaf/30 text-forest">
        <Icon className="h-6 w-6" aria-hidden="true" />
      </div>
      <h3 className="text-xl">{title}</h3>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink-500">{body}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string | null
  hint?: string
}

export function Field({ label, error, hint, id, ...rest }: FieldProps) {
  const fid = id ?? `f-${label.toLowerCase().replace(/\W+/g, '-')}`
  const describedBy = error ? `${fid}-err` : hint ? `${fid}-hint` : undefined
  return (
    <div>
      <label htmlFor={fid} className="mb-1.5 block text-[13px] font-semibold text-forest">
        {label}
      </label>
      <input
        id={fid}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`input ${error ? 'border-clay focus:border-clay focus:ring-clay/20' : ''}`}
        {...rest}
      />
      {error ? (
        <p id={`${fid}-err`} className="mt-1.5 text-xs text-clay-700">
          {error}
        </p>
      ) : hint ? (
        <p id={`${fid}-hint`} className="mt-1.5 text-xs text-ink-400">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

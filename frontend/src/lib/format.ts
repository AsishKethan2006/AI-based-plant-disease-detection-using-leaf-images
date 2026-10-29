export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 / 1024).toFixed(2)} MB`
}

export function pct(v: number, digits = 1): string {
  return `${(v * 100).toFixed(digits)}%`
}

/** Backend stores naive UTC timestamps; treat missing offsets as UTC. */
export function parseDate(iso: string | null | undefined): Date | null {
  if (!iso) return null
  const hasTz = /([zZ]|[+-]\d{2}:?\d{2})$/.test(iso)
  const d = new Date(hasTz ? iso : `${iso}Z`)
  return Number.isNaN(d.getTime()) ? null : d
}

export function formatDate(iso: string | null | undefined, withTime = true): string {
  const d = parseDate(iso)
  if (!d) return 'Unknown date'
  return d.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  })
}

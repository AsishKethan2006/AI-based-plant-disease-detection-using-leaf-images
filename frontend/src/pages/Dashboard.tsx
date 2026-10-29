import { Activity, AlertTriangle, ArrowRight, Gauge, ImageIcon, ScanSearch, Sprout } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, assetUrl } from '../api/client'
import { ConfidenceMeter } from '../components/ConfidenceMeter'
import { SafeImage } from '../components/SafeImage'
import { Alert, EmptyState, Skeleton } from '../components/ui'
import { useHistory } from '../hooks/useHistory'
import { formatDate, pct } from '../lib/format'
import { parseClass } from '../lib/taxonomy'

function Stat({ icon: Icon, label, value, sub }: { icon: typeof Activity; label: string; value: string; sub?: string }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <span className="eyebrow">{label}</span>
        <Icon className="h-4 w-4 text-ink-400" aria-hidden="true" />
      </div>
      <p className="mt-3 font-display text-4xl text-forest">{value}</p>
      {sub && <p className="mt-1 text-xs text-ink-500">{sub}</p>}
    </div>
  )
}

function ServiceStatus() {
  const [state, setState] = useState<'checking' | 'ok' | 'down'>('checking')
  useEffect(() => {
    const c = new AbortController()
    api.health(c.signal).then(() => setState('ok')).catch((e) => {
      if (!(e instanceof DOMException)) setState('down')
    })
    return () => c.abort()
  }, [])
  const map = {
    checking: ['bg-ink-400', 'Checking service…'],
    ok: ['bg-leaf-600', 'Diagnosis service online'],
    down: ['bg-clay', 'Diagnosis service unreachable'],
  } as const
  return (
    <span className="inline-flex items-center gap-2 font-mono text-[11px] text-ink-500" role="status">
      <span className={`h-2 w-2 rounded-full ${map[state][0]}`} aria-hidden="true" />
      {map[state][1]}
    </span>
  )
}

export default function Dashboard() {
  const { items, loading, error, reload } = useHistory()

  const stats = useMemo(() => {
    const parsed = items.map((p) => parseClass(p.predicted_class))
    const healthy = parsed.filter((p) => p.healthy).length
    const avg = items.length ? items.reduce((s, p) => s + p.confidence, 0) / items.length : 0
    const crops = new Map<string, number>()
    parsed.forEach((p) => crops.set(p.crop, (crops.get(p.crop) ?? 0) + 1))
    const top = [...crops.entries()].sort((a, b) => b[1] - a[1])[0]
    return { total: items.length, healthy, diseased: items.length - healthy, avg, top, crops: [...crops.entries()].sort((a, b) => b[1] - a[1]) }
  }, [items])

  const latest = items[0]

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <ServiceStatus />
      </div>

      {error && (
        <Alert action={<button type="button" onClick={reload} className="shrink-0 font-semibold underline underline-offset-4">Retry</button>}>
          {error}
        </Alert>
      )}

      {loading ? (
        <div className="space-y-6" aria-busy="true" aria-label="Loading overview">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-32 !rounded-[18px]" />)}</div>
          <Skeleton className="h-72 !rounded-[18px]" />
        </div>
      ) : items.length === 0 && !error ? (
        <div className="card rounded-tl-[4px]">
          <EmptyState
            icon={Sprout}
            title="No diagnoses yet"
            body="Upload your first leaf photo. Results, confidence scores and Grad-CAM maps will appear here as you build up a history."
            action={<Link to="/diagnose" className="btn-primary"><ScanSearch className="h-4 w-4" aria-hidden="true" /> Diagnose a leaf</Link>}
          />
        </div>
      ) : items.length > 0 ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat icon={Activity} label="Total scans" value={String(stats.total)} />
            <Stat icon={AlertTriangle} label="Disease detected" value={String(stats.diseased)} sub={`${stats.healthy} healthy`} />
            <Stat icon={Gauge} label="Avg. confidence" value={pct(stats.avg, 0)} />
            <Stat icon={Sprout} label="Most scanned crop" value={stats.top?.[0] ?? '—'} sub={stats.top ? `${stats.top[1]} scan${stats.top[1] === 1 ? '' : 's'}` : undefined} />
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
            <section className="card overflow-hidden rounded-tl-[4px]" aria-label="Recent activity">
              <div className="flex items-center justify-between border-b border-line px-5 py-4">
                <h2 className="text-xl">Recent activity</h2>
                <Link to="/history" className="flex items-center gap-1 text-sm font-semibold text-forest hover:underline">View all <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></Link>
              </div>
              <ul className="divide-y divide-line">
                {items.slice(0, 5).map((p) => {
                  const c = parseClass(p.predicted_class)
                  return (
                    <li key={p.id}>
                      <Link to={`/history?id=${p.id}`} className="flex items-center gap-4 px-5 py-3.5 hover:bg-paper">
                        <SafeImage src={assetUrl(p.image_path)} alt="" className="h-12 w-12 shrink-0 rounded-[10px] object-cover" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-forest">{p.disease_name || c.condition}</p>
                          <p className="truncate text-xs text-ink-500">{c.crop} · {formatDate(p.created_at)}</p>
                        </div>
                        <span className="font-mono text-xs tabular-nums text-ink-500">{pct(p.confidence)}</span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </section>

            <div className="space-y-6">
              {latest && (
                <section className="card rounded-br-[4px] p-5" aria-label="Latest diagnosis">
                  <p className="eyebrow">Latest diagnosis</p>
                  <div className="mt-3 flex gap-4">
                    <SafeImage src={assetUrl(latest.image_path)} alt="Most recent leaf" className="h-24 w-24 shrink-0 rounded-[12px] object-cover" />
                    <div className="min-w-0">
                      <p className="font-display text-xl leading-tight text-forest">{latest.disease_name || parseClass(latest.predicted_class).condition}</p>
                      <p className="mt-1 text-xs text-ink-500">{formatDate(latest.created_at)}</p>
                    </div>
                  </div>
                  <div className="mt-4"><ConfidenceMeter value={latest.confidence} size="sm" animate={false} /></div>
                </section>
              )}
              <section className="card p-5" aria-label="Crops scanned">
                <p className="eyebrow">Scans by crop</p>
                <ul className="mt-4 space-y-3">
                  {stats.crops.slice(0, 5).map(([crop, n]) => (
                    <li key={crop}>
                      <div className="flex justify-between text-sm"><span className="text-forest">{crop}</span><span className="font-mono text-xs text-ink-500">{n}</span></div>
                      <div className="mt-1 h-1.5 rounded-sm bg-forest/10"><div className="h-full rounded-sm bg-forest" style={{ width: `${(n / stats.total) * 100}%` }} /></div>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          </div>
        </>
      ) : (
        <div className="card"><EmptyState icon={ImageIcon} title="Overview unavailable" body="We couldn't load your history. Try again once the service is reachable." /></div>
      )}
    </div>
  )
}

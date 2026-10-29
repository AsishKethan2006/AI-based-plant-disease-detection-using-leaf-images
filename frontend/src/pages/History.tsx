import { AnimatePresence, motion } from 'framer-motion'
import { ScanSearch, Search, SearchX, Sprout, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { assetUrl } from '../api/client'
import type { Prediction } from '../api/types'
import { ConfidenceMeter } from '../components/ConfidenceMeter'
import { ResultView } from '../components/ResultView'
import { SafeImage } from '../components/SafeImage'
import { Alert, EmptyState, Skeleton } from '../components/ui'
import { useHistory } from '../hooks/useHistory'
import { formatDate, parseDate } from '../lib/format'
import { parseClass } from '../lib/taxonomy'

function DetailDialog({ item, onClose }: { item: Prediction; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
      prev?.focus()
    }
  }, [onClose])

  return (
    <motion.div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-forest-800/60 p-4 sm:p-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label="Diagnosis details" className="relative my-auto w-full max-w-5xl rounded-[22px] rounded-tr-[6px] bg-paper p-5 sm:p-7">
        <div className="mb-5 flex items-center justify-between">
          <p className="eyebrow">Diagnosis #{item.id}</p>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Close details" className="rounded-full border border-line bg-white p-2 text-forest hover:bg-paper"><X className="h-4 w-4" /></button>
        </div>
        <ResultView result={item} />
      </div>
    </motion.div>
  )
}

export default function History() {
  const { items, loading, error, reload } = useHistory()
  const [params, setParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [crop, setCrop] = useState('all')
  const [status, setStatus] = useState<'all' | 'healthy' | 'disease'>('all')
  const [order, setOrder] = useState<'new' | 'old'>('new')

  const crops = useMemo(() => Array.from(new Set(items.map((i) => parseClass(i.predicted_class).crop))).sort(), [items])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = items.filter((p) => {
      const c = parseClass(p.predicted_class)
      if (crop !== 'all' && c.crop !== crop) return false
      if (status === 'healthy' && !c.healthy) return false
      if (status === 'disease' && c.healthy) return false
      if (!q) return true
      return `${p.disease_name} ${c.crop} ${c.condition} ${p.predicted_class}`.toLowerCase().includes(q)
    })
    const t = (p: Prediction) => parseDate(p.created_at)?.getTime() ?? 0
    return list.sort((a, b) => (order === 'new' ? t(b) - t(a) : t(a) - t(b)))
  }, [items, query, crop, status, order])

  const openId = Number(params.get('id'))
  const selected = items.find((p) => p.id === openId) ?? null
  const close = () => setParams({}, { replace: true })
  const filtersActive = query !== '' || crop !== 'all' || status !== 'all'

  return (
    <div className="space-y-6">
      <div className="card flex flex-wrap items-end gap-3 p-4" role="search">
        <div className="min-w-[200px] flex-1">
          <label htmlFor="h-search" className="mb-1.5 block text-[13px] font-semibold text-forest">Search</label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" aria-hidden="true" />
            <input id="h-search" className="input !pl-9" placeholder="Disease or crop" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
        </div>
        <div>
          <label htmlFor="h-crop" className="mb-1.5 block text-[13px] font-semibold text-forest">Crop</label>
          <select id="h-crop" className="input" value={crop} onChange={(e) => setCrop(e.target.value)}>
            <option value="all">All crops</option>
            {crops.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="h-status" className="mb-1.5 block text-[13px] font-semibold text-forest">Result</label>
          <select id="h-status" className="input" value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
            <option value="all">All results</option>
            <option value="disease">Disease detected</option>
            <option value="healthy">Healthy</option>
          </select>
        </div>
        <div>
          <label htmlFor="h-order" className="mb-1.5 block text-[13px] font-semibold text-forest">Sort</label>
          <select id="h-order" className="input" value={order} onChange={(e) => setOrder(e.target.value as typeof order)}>
            <option value="new">Newest first</option>
            <option value="old">Oldest first</option>
          </select>
        </div>
      </div>

      {error && (
        <Alert action={<button type="button" onClick={reload} className="shrink-0 font-semibold underline underline-offset-4">Retry</button>}>{error}</Alert>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-label="Loading history">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="card overflow-hidden"><Skeleton className="aspect-[4/3] !rounded-none" /><div className="space-y-2 p-4"><Skeleton className="h-4 w-2/3" /><Skeleton className="h-3 w-1/2" /></div></div>
          ))}
        </div>
      ) : !error && items.length === 0 ? (
        <div className="card"><EmptyState icon={Sprout} title="Nothing here yet" body="Your analyzed leaves will be listed here with their confidence scores and heatmaps." action={<Link to="/diagnose" className="btn-primary"><ScanSearch className="h-4 w-4" aria-hidden="true" /> Diagnose a leaf</Link>} /></div>
      ) : filtered.length === 0 && items.length > 0 ? (
        <div className="card"><EmptyState icon={SearchX} title="No matching results" body="Try a different search term or clear the filters." action={filtersActive ? <button type="button" className="btn-ghost" onClick={() => { setQuery(''); setCrop('all'); setStatus('all') }}>Clear filters</button> : undefined} /></div>
      ) : (
        <>
          <p className="text-sm text-ink-500" aria-live="polite">{filtered.length} of {items.length} diagnosis{items.length === 1 ? '' : 'es'}</p>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((p) => {
              const c = parseClass(p.predicted_class)
              return (
                <li key={p.id}>
                  <button type="button" onClick={() => setParams({ id: String(p.id) })} className="card group block w-full overflow-hidden text-left transition-shadow hover:shadow-[0_14px_30px_-16px_rgba(23,59,46,0.35)]">
                    <div className="relative">
                      <SafeImage src={assetUrl(p.image_path)} alt={`Leaf analyzed ${formatDate(p.created_at)}`} className="aspect-[4/3] w-full object-cover" />
                      <span className={`absolute left-3 top-3 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${c.healthy ? 'bg-leaf text-forest' : 'bg-clay text-white'}`}>{c.healthy ? 'Healthy' : 'Disease'}</span>
                    </div>
                    <div className="p-4">
                      <p className="eyebrow">{c.crop}</p>
                      <p className="mt-1 truncate font-display text-xl text-forest">{p.disease_name || c.condition}</p>
                      <p className="mt-0.5 text-xs text-ink-500">{formatDate(p.created_at)}</p>
                      <div className="mt-3"><ConfidenceMeter value={p.confidence} size="sm" animate={false} /></div>
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        </>
      )}

      <AnimatePresence>{selected && <DetailDialog item={selected} onClose={close} />}</AnimatePresence>
    </div>
  )
}

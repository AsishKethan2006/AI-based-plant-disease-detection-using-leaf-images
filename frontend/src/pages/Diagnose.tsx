import { History as HistoryIcon, Loader2, ScanSearch, UploadCloud } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, ApiError } from '../api/client'
import type { Prediction } from '../api/types'
import { ResultView } from '../components/ResultView'
import { UploadZone } from '../components/UploadZone'
import { Alert } from '../components/ui'

export default function Diagnose() {
  const navigate = useNavigate()
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<Prediction | null>(null)
  const inFlight = useRef(false)
  const ctrl = useRef<AbortController | null>(null)

  useEffect(() => () => ctrl.current?.abort(), [])

  useEffect(() => {
    if (!busy) return
    setElapsed(0)
    const t = window.setInterval(() => setElapsed((s) => s + 1), 1000)
    return () => window.clearInterval(t)
  }, [busy])

  const analyze = async () => {
    if (!file || inFlight.current) return
    inFlight.current = true
    setBusy(true)
    setError(null)
    const c = new AbortController()
    ctrl.current = c
    try {
      setResult(await api.predict(file, c.signal))
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return
      if (e instanceof ApiError && e.status === 401) return // session handler routes to sign-in
      setError(e instanceof Error ? e.message : 'Analysis failed.')
    } finally {
      inFlight.current = false
      setBusy(false)
    }
  }

  const reset = () => {
    setFile(null)
    setResult(null)
    setError(null)
  }

  if (result) {
    return (
      <ResultView
        result={result}
        actions={
          <>
            <button type="button" className="btn-primary" onClick={reset}>
              <UploadCloud className="h-4 w-4" aria-hidden="true" /> Analyze another image
            </button>
            <button type="button" className="btn-ghost" onClick={() => navigate('/history')}>
              <HistoryIcon className="h-4 w-4" aria-hidden="true" /> View previous results
            </button>
          </>
        }
      />
    )
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
      <div className="space-y-5">
        <UploadZone file={file} onSelect={(f) => { setFile(f); setError(null) }} onRemove={() => setFile(null)} disabled={busy} scanning={busy} />
        {error && (
          <Alert action={file ? <button type="button" onClick={analyze} className="shrink-0 font-semibold underline underline-offset-4">Retry</button> : undefined}>
            {error}
          </Alert>
        )}
        <div className="flex items-center gap-4">
          <button type="button" onClick={analyze} disabled={!file || busy} aria-busy={busy} className="btn-primary !px-6 !py-3">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ScanSearch className="h-4 w-4" aria-hidden="true" />}
            {busy ? 'Analyzing…' : 'Analyze Leaf'}
          </button>
          {busy && (
            <div role="status" className="flex-1">
              <div className="h-1.5 overflow-hidden rounded-sm bg-forest/10">
                <div className="h-full w-1/3 animate-[slide_1.4s_ease-in-out_infinite] rounded-sm bg-forest" />
              </div>
              <p className="mt-1.5 font-mono text-xs text-ink-400">Analyzing leaf… {elapsed}s</p>
            </div>
          )}
        </div>
      </div>

      <aside className="card h-fit rounded-tr-[4px] p-6">
        <p className="eyebrow">For best results</p>
        <ul className="mt-4 space-y-3.5 text-sm leading-relaxed text-ink-500">
          <li><span className="font-semibold text-forest">One leaf, filling the frame.</span> Avoid hands, soil and neighbouring plants.</li>
          <li><span className="font-semibold text-forest">Even daylight.</span> Harsh shadows and flash glare can hide lesion edges.</li>
          <li><span className="font-semibold text-forest">In focus.</span> Lesions, spots and mould should be sharp.</li>
          <li><span className="font-semibold text-forest">Supported crops.</span> The model recognises 38 classes across apple, blueberry, cherry, maize, grape, orange, peach, bell pepper, potato, raspberry, soybean, squash, strawberry and tomato.</li>
        </ul>
      </aside>
    </div>
  )
}

import { motion } from 'framer-motion'
import { Info, Leaf, ScanEye, ShieldAlert, Sprout } from 'lucide-react'
import type { ReactNode } from 'react'
import type { Prediction } from '../api/types'
import { assetUrl } from '../api/client'
import { formatDate, pct } from '../lib/format'
import { parseClass } from '../lib/taxonomy'
import { ConfidenceMeter } from './ConfidenceMeter'
import { SafeImage } from './SafeImage'

function Top3({ result }: { result: Prediction }) {
  const items = result.top3_predictions
  if (!items || items.length === 0) {
    return <p className="text-sm text-ink-500">The server did not return alternative predictions for this scan.</p>
  }
  return (
    <ol className="space-y-3">
      {items.slice(0, 3).map((it, i) => {
        const p = parseClass(it.class)
        return (
          <li key={`${it.class}-${i}`}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className={i === 0 ? 'font-semibold text-forest' : 'text-ink-500'}>
                <span className="mr-2 font-mono text-[11px] text-ink-400">0{i + 1}</span>
                {p.crop} — {p.condition}
              </span>
              <span className="font-mono text-xs tabular-nums text-ink-500">{pct(it.confidence)}</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-sm bg-forest/10" aria-hidden="true">
              <motion.div
                className={`h-full rounded-sm ${i === 0 ? 'bg-forest' : 'bg-forest/35'}`}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, Math.max(0, it.confidence * 100))}%` }}
                transition={{ duration: 0.7, delay: 0.08 * i, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
          </li>
        )
      })}
    </ol>
  )
}

export function ResultView({ result, actions }: { result: Prediction; actions?: ReactNode }) {
  const parsed = parseClass(result.predicted_class)
  const image = assetUrl(result.image_path)
  const heat = assetUrl(result.gradcam_path)
  const name = result.disease_name || `${parsed.crop} — ${parsed.condition}`

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr]">
        {/* Imagery */}
        <section aria-label="Image analysis" className="card overflow-hidden rounded-tl-[4px]">
          <div className="grid grid-cols-2 divide-x divide-line">
            <figure>
              <SafeImage src={image} alt="Uploaded leaf" className="aspect-square w-full object-cover" />
              <figcaption className="eyebrow border-t border-line px-3 py-2.5">Original</figcaption>
            </figure>
            <figure>
              {heat ? (
                <SafeImage src={heat} alt="Grad-CAM heatmap overlay on the leaf" className="aspect-square w-full object-cover" />
              ) : (
                <div className="flex aspect-square w-full flex-col items-center justify-center gap-2 bg-forest/[0.04] px-5 text-center">
                  <ScanEye className="h-6 w-6 text-ink-400" aria-hidden="true" />
                  <p className="text-sm font-semibold text-forest">Heatmap not available</p>
                  <p className="text-xs leading-relaxed text-ink-500">
                    The backend did not return a Grad-CAM image for this prediction.
                  </p>
                </div>
              )}
              <figcaption className="eyebrow border-t border-line px-3 py-2.5">Grad-CAM attention</figcaption>
            </figure>
          </div>
          <div className="flex gap-3 border-t border-line bg-paper px-4 py-3.5 text-xs leading-relaxed text-ink-500">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-forest" aria-hidden="true" />
            <p>
              Warmer regions mark the areas of the leaf that influenced the model most. Check that they fall on the
              leaf tissue itself rather than on the background.
            </p>
          </div>
        </section>

        {/* Diagnosis */}
        <section aria-label="Diagnosis" className="card flex flex-col rounded-br-[4px] p-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="eyebrow flex items-center gap-1.5">
              <Sprout className="h-3.5 w-3.5" aria-hidden="true" /> {parsed.crop}
            </span>
            <span
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                parsed.healthy ? 'bg-leaf/50 text-forest' : 'bg-clay-100 text-clay-700'
              }`}
            >
              {parsed.healthy ? 'No disease detected' : 'Disease detected'}
            </span>
          </div>
          <h2 className="mt-3 text-[34px] leading-[1.1]">{name}</h2>
          <p className="mt-1 font-mono text-[11px] text-ink-400">{formatDate(result.created_at)}</p>

          <div className="mt-6"><ConfidenceMeter value={result.confidence} /></div>

          <div className="mt-6 border-t border-line pt-5">
            <h3 className="mb-2 flex items-center gap-2 font-sans text-sm font-semibold">
              <Leaf className="h-4 w-4" aria-hidden="true" /> Advisory
            </h3>
            {result.disease_description ? (
              <p className="text-[15px] leading-relaxed text-ink">{result.disease_description}</p>
            ) : (
              <p className="text-sm text-ink-500">No advisory text is available for this class.</p>
            )}
          </div>
        </section>
      </div>

      <section aria-label="Top predictions" className="card p-6">
        <div className="mb-4 flex items-baseline justify-between">
          <h3 className="text-xl">Top three predictions</h3>
          <span className="eyebrow">Class names shown in English</span>
        </div>
        <Top3 result={result} />
      </section>

      <div className="flex gap-3 rounded-[14px] border border-clay/30 bg-clay-100/60 px-4 py-3.5 text-[13px] leading-relaxed text-clay-700">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <p>
          AI predictions are decision support, not a substitute for expert agricultural diagnosis. Confirm with an
          agronomist or local extension service before treating a crop.
        </p>
      </div>

      {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
    </motion.div>
  )
}

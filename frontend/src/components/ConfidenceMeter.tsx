import { motion } from 'framer-motion'
import { pct } from '../lib/format'

export function confidenceBand(v: number): { label: string; color: string } {
  if (v >= 0.85) return { label: 'High confidence', color: '#173B2E' }
  if (v >= 0.6) return { label: 'Moderate confidence', color: '#8FB23F' }
  return { label: 'Low confidence', color: '#C77D5B' }
}

export function ConfidenceMeter({
  value,
  size = 'lg',
  animate = true,
}: {
  value: number
  size?: 'sm' | 'lg'
  animate?: boolean
}) {
  const v = Math.min(1, Math.max(0, value))
  const band = confidenceBand(v)
  const big = size === 'lg'
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span
          className={`font-display tabular-nums text-forest ${big ? 'text-5xl' : 'text-lg'}`}
        >
          {pct(v)}
        </span>
        {big && <span className="eyebrow">Model confidence</span>}
      </div>
      <div
        role="meter"
        aria-label="Model confidence"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(v * 100)}
        aria-valuetext={`${pct(v)}, ${band.label.toLowerCase()}`}
        className={`relative mt-2 w-full overflow-hidden rounded-sm bg-forest/10 ${big ? 'h-2.5' : 'h-1.5'}`}
      >
        <motion.div
          className="h-full rounded-sm"
          style={{ background: band.color }}
          initial={{ width: animate ? 0 : `${v * 100}%` }}
          animate={{ width: `${v * 100}%` }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        />
        {[60, 85].map((t) => (
          <span key={t} className="absolute top-0 h-full w-px bg-white/80" style={{ left: `${t}%` }} aria-hidden="true" />
        ))}
      </div>
      {big && <p className="mt-2 text-xs text-ink-500">{band.label}</p>}
    </div>
  )
}

import { ImageOff } from 'lucide-react'
import { useEffect, useState } from 'react'

export function SafeImage({
  src,
  alt,
  className = '',
}: {
  src: string | null
  alt: string
  className?: string
}) {
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [src])

  if (!src || failed) {
    return (
      <div className={`flex flex-col items-center justify-center gap-2 bg-forest/[0.05] text-ink-400 ${className}`} role="img" aria-label={`${alt} (unavailable)`}>
        <ImageOff className="h-5 w-5" aria-hidden="true" />
        <span className="text-xs">Image unavailable</span>
      </div>
    )
  }
  return <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} className={className} />
}

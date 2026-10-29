import { ImagePlus, RefreshCw, Trash2, UploadCloud } from 'lucide-react'
import { useRef, useState, type DragEvent } from 'react'
import { ACCEPTED_EXT, ACCEPTED_MIME, MAX_UPLOAD_BYTES } from '../lib/config'
import { formatBytes } from '../lib/format'
import { useObjectUrl } from '../hooks/useObjectUrl'

export function validateImage(file: File): string | null {
  const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase()
  const typeOk = (ACCEPTED_MIME as readonly string[]).includes(file.type)
  const extOk = (ACCEPTED_EXT as readonly string[]).includes(ext)
  if (!typeOk || !extOk) return 'Only JPEG, JPG or PNG images are supported.'
  if (file.size === 0) return 'This file is empty.'
  if (file.size > MAX_UPLOAD_BYTES) return `This image is ${formatBytes(file.size)}. The maximum is 10 MB.`
  return null
}

interface Props {
  file: File | null
  onSelect: (file: File) => void
  onRemove: () => void
  disabled?: boolean
  scanning?: boolean
}

export function UploadZone({ file, onSelect, onRemove, disabled, scanning }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const preview = useObjectUrl(file)

  const accept = (f: File | undefined) => {
    if (!f || disabled) return
    const err = validateImage(f)
    setError(err)
    if (!err) onSelect(f)
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    accept(e.dataTransfer.files?.[0])
  }

  const input = (
    <input
      ref={inputRef}
      type="file"
      accept=".jpg,.jpeg,.png,image/jpeg,image/png"
      className="sr-only"
      tabIndex={-1}
      aria-hidden="true"
      onChange={(e) => {
        accept(e.target.files?.[0])
        e.target.value = '' // allow re-selecting the same file
      }}
    />
  )

  if (file && preview) {
    return (
      <div>
        {input}
        <div className="card overflow-hidden rounded-tr-[4px]">
          <div className="relative bg-forest-800">
            <img src={preview} alt={`Preview of ${file.name}`} className="mx-auto max-h-[420px] w-full object-contain" />
            {scanning && (
              <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
                <div className="absolute inset-x-0 h-24 animate-[scan_2s_ease-in-out_infinite] bg-gradient-to-b from-transparent via-leaf/35 to-transparent" />
                <div className="absolute inset-0 bg-[linear-gradient(rgba(183,217,107,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(183,217,107,0.12)_1px,transparent_1px)] bg-[size:28px_28px]" />
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3 border-t border-line px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-forest">{file.name}</p>
              <p className="font-mono text-xs text-ink-400">{formatBytes(file.size)}</p>
            </div>
            <button type="button" className="btn-ghost !px-3 !py-2" disabled={disabled} onClick={() => inputRef.current?.click()}>
              <RefreshCw className="h-4 w-4" aria-hidden="true" /> Replace
            </button>
            <button type="button" className="btn-ghost !px-3 !py-2" disabled={disabled} onClick={() => { setError(null); onRemove() }}>
              <Trash2 className="h-4 w-4" aria-hidden="true" /> Remove
            </button>
          </div>
        </div>
        {error && <p role="alert" className="mt-3 text-sm text-clay-700">{error}</p>}
      </div>
    )
  }

  return (
    <div>
      {input}
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`group flex w-full flex-col items-center justify-center rounded-[22px] rounded-bl-[6px] border-2 border-dashed px-6 py-16 text-center transition-colors ${
          dragging ? 'border-forest bg-leaf/25' : 'border-forest/25 bg-white hover:border-forest/60 hover:bg-leaf/10'
        }`}
      >
        <span className="mb-5 flex h-16 w-16 items-center justify-center rounded-[18px] rounded-br-[5px] bg-forest text-leaf">
          {dragging ? <ImagePlus className="h-7 w-7" aria-hidden="true" /> : <UploadCloud className="h-7 w-7" aria-hidden="true" />}
        </span>
        <span className="font-display text-2xl text-forest">Drop a leaf photo here</span>
        <span className="mt-2 text-sm text-ink-500">or <span className="font-semibold text-forest underline underline-offset-4">browse your files</span></span>
        <span className="mt-5 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-400">JPEG · JPG · PNG — up to 10 MB</span>
      </button>
      {error && <p role="alert" className="mt-3 text-sm text-clay-700">{error}</p>}
    </div>
  )
}

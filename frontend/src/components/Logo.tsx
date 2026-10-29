export function LogoMark({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="9" fill="#B7D96B" />
      <path d="M9 22c0-8 5-13 14-13 0 8-5 13-14 13Z" fill="#173B2E" />
      <path d="M9 22 18 13" stroke="#B7D96B" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

export function Wordmark({ light = false }: { light?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark />
      <span className={`font-display text-[22px] font-medium tracking-tight ${light ? 'text-paper' : 'text-forest'}`}>
        LeafScope
      </span>
    </span>
  )
}

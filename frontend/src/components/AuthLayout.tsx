import type { ReactNode } from 'react'
import { Wordmark } from './Logo'
import { CLASS_COUNT } from '../lib/taxonomy'

function VeinArt() {
  return (
    <svg viewBox="0 0 400 520" className="absolute inset-0 h-full w-full" aria-hidden="true" preserveAspectRatio="xMidYMid slice">
      <g fill="none" stroke="#B7D96B" strokeLinecap="round">
        <path d="M200 520C200 380 205 240 200 40" strokeWidth="2" opacity=".5" />
        {[...Array(9)].map((_, i) => {
          const y = 90 + i * 46
          return (
            <g key={i} opacity={0.12 + (i % 3) * 0.06} strokeWidth="1.2">
              <path d={`M200 ${y + 40}C250 ${y + 30} 300 ${y} 350 ${y - 30}`} />
              <path d={`M200 ${y + 40}C150 ${y + 30} 100 ${y} 50 ${y - 30}`} />
            </g>
          )
        })}
        <path d="M200 40C330 90 390 230 330 400C290 480 230 510 200 520C170 510 110 480 70 400C10 230 70 90 200 40Z" strokeWidth="1.5" opacity=".35" />
      </g>
    </svg>
  )
}

export function AuthLayout({ title, subtitle, children, footer }: { title: string; subtitle: string; children: ReactNode; footer: ReactNode }) {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside className="grain relative hidden overflow-hidden bg-forest-800 p-10 text-paper lg:flex lg:flex-col">
        <VeinArt />
        <div className="relative"><Wordmark light /></div>
        <div className="relative mt-auto max-w-md">
          <p className="eyebrow !text-leaf">Agricultural intelligence</p>
          <h2 className="mt-4 text-[44px] leading-[1.05] !text-paper">
            See what the model sees in every leaf.
          </h2>
          <p className="mt-5 text-[15px] leading-relaxed text-paper/70">
            Upload a leaf photo and get a diagnosis with confidence scores, Grad-CAM attention maps and advisories in
            English, Hindi, Kannada or Telugu.
          </p>
          <dl className="mt-10 flex gap-8 border-t border-white/10 pt-6">
            <div><dt className="eyebrow !text-paper/50">Classes</dt><dd className="mt-1 font-display text-3xl">{CLASS_COUNT}</dd></div>
            <div><dt className="eyebrow !text-paper/50">Languages</dt><dd className="mt-1 font-display text-3xl">4</dd></div>
            <div><dt className="eyebrow !text-paper/50">Model</dt><dd className="mt-1 font-display text-3xl">ViT-B/16</dd></div>
          </dl>
        </div>
      </aside>

      <main className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-[420px]">
          <div className="mb-10 lg:hidden"><Wordmark /></div>
          <h1 className="text-[38px] leading-[1.1]">{title}</h1>
          <p className="mt-2 text-[15px] text-ink-500">{subtitle}</p>
          <div className="mt-8">{children}</div>
          <p className="mt-8 text-sm text-ink-500">{footer}</p>
        </div>
      </main>
    </div>
  )
}

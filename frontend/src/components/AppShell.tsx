import { AnimatePresence, motion } from 'framer-motion'
import {
  ChevronsLeft, ChevronsRight, History as HistoryIcon, LayoutDashboard, LogOut, Menu, ScanSearch, X,
} from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { LogoMark, Wordmark } from './Logo'

const NAV = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/diagnose', label: 'New diagnosis', icon: ScanSearch, end: false },
  { to: '/history', label: 'History', icon: HistoryIcon, end: false },
]

const TITLES: Record<string, { title: string; sub: string }> = {
  '/': { title: 'Field overview', sub: 'Your diagnosis activity at a glance' },
  '/diagnose': { title: 'Leaf diagnosis', sub: 'Upload a leaf photo for explainable analysis' },
  '/history': { title: 'Diagnosis history', sub: 'Every analysis saved to your account' },
}

function NavItems({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  return (
    <nav aria-label="Primary" className="flex flex-col gap-1">
      {NAV.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onNavigate}
          title={collapsed ? label : undefined}
          className={({ isActive }) =>
            `group flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-leaf ${
              isActive ? 'bg-leaf text-forest' : 'text-paper/70 hover:bg-white/10 hover:text-paper'
            } ${collapsed ? 'justify-center' : ''}`
          }
        >
          <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
          {!collapsed && <span>{label}</span>}
          {collapsed && <span className="sr-only">{label}</span>}
        </NavLink>
      ))}
    </nav>
  )
}

export function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const [drawer, setDrawer] = useState(false)
  const [menu, setMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const { username, logout } = useAuth()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const meta = TITLES[pathname] ?? TITLES['/']

  useEffect(() => {
    setDrawer(false)
    setMenu(false)
  }, [pathname])

  useEffect(() => {
    if (!menu) return
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenu(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [menu])

  useEffect(() => {
    if (!drawer) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setDrawer(false)
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [drawer])

  const initial = (username ?? '?').charAt(0).toUpperCase()

  return (
    <div className="min-h-screen lg:flex">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-md focus:bg-forest focus:px-3 focus:py-2 focus:text-paper">
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <aside
        className={`grain sticky top-0 hidden h-screen shrink-0 flex-col bg-forest-800 px-3 py-5 transition-[width] duration-300 lg:flex ${
          collapsed ? 'w-[76px]' : 'w-64'
        }`}
      >
        <Link to="/" className={`mb-8 flex px-2 ${collapsed ? 'justify-center' : ''}`} aria-label="LeafScope home">
          {collapsed ? <LogoMark /> : <Wordmark light />}
        </Link>
        <NavItems collapsed={collapsed} />
        <div className="mt-auto">
          {!collapsed && (
            <p className="mb-4 rounded-[12px] rounded-tl-[3px] border border-white/10 bg-white/[0.04] p-3.5 text-xs leading-relaxed text-paper/60">
              Vision Transformer analysis with Grad-CAM, trained on 38 crop-disease classes.
            </p>
          )}
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!collapsed}
            className={`flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm text-paper/60 hover:bg-white/10 hover:text-paper focus-visible:outline-leaf ${collapsed ? 'justify-center' : ''}`}
          >
            {collapsed ? <ChevronsRight className="h-[18px] w-[18px]" /> : <ChevronsLeft className="h-[18px] w-[18px]" />}
            {!collapsed && 'Collapse'}
          </button>
        </div>
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {drawer && (
          <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
            <motion.div
              className="absolute inset-0 bg-forest-800/60"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawer(false)}
            />
            <motion.div
              className="grain absolute inset-y-0 left-0 w-72 bg-forest-800 px-3 py-5"
              initial={{ x: -288 }}
              animate={{ x: 0 }}
              exit={{ x: -288 }}
              transition={{ type: 'tween', duration: 0.22 }}
            >
              <div className="mb-8 flex items-center justify-between px-2">
                <Wordmark light />
                <button type="button" onClick={() => setDrawer(false)} aria-label="Close navigation" className="rounded-md p-1.5 text-paper/70 hover:text-paper focus-visible:outline-leaf">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <NavItems collapsed={false} onNavigate={() => setDrawer(false)} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-paper/90 px-4 py-3.5 backdrop-blur sm:px-8">
          <button
            type="button"
            onClick={() => setDrawer(true)}
            aria-label="Open navigation"
            className="rounded-md p-2 text-forest hover:bg-forest/5 lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-2xl leading-tight">{meta.title}</h1>
            <p className="hidden truncate text-[13px] text-ink-500 sm:block">{meta.sub}</p>
          </div>
          <button type="button" onClick={() => navigate('/diagnose')} className="btn-primary">
            <ScanSearch className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">New diagnosis</span>
            <span className="sm:hidden">New</span>
          </button>
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenu((m) => !m)}
              aria-haspopup="menu"
              aria-expanded={menu}
              aria-label="Account menu"
              className="flex h-10 w-10 items-center justify-center rounded-full rounded-tr-[6px] bg-forest font-display text-lg text-leaf hover:bg-forest-700"
            >
              {initial}
            </button>
            {menu && (
              <div role="menu" className="absolute right-0 mt-2 w-56 overflow-hidden rounded-[14px] border border-line bg-white shadow-[0_12px_30px_-12px_rgba(23,59,46,0.25)]">
                <div className="border-b border-line px-4 py-3">
                  <p className="eyebrow">Signed in as</p>
                  <p className="truncate text-sm font-semibold text-forest">{username ?? 'Account'}</p>
                </div>
                <button
                  role="menuitem"
                  type="button"
                  onClick={logout}
                  className="flex w-full items-center gap-2.5 px-4 py-3 text-left text-sm text-ink hover:bg-paper"
                >
                  <LogOut className="h-4 w-4" aria-hidden="true" /> Sign out
                </button>
              </div>
            )}
          </div>
        </header>

        <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-8">
          {children}
        </main>
      </div>
    </div>
  )
}

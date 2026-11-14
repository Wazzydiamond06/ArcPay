import { useEffect } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { Logo } from '@/components/Logo'
import { MarketingNav } from '@/components/landing/MarketingNav'
import { SiteFooter } from '@/components/landing/SiteFooter'
import { cn } from '@/lib/utils'

const navClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'rounded-full px-4 py-2 text-sm font-semibold transition',
    isActive ? 'bg-bronze text-cream' : 'text-bronze hover:bg-bronze/10',
  )

/** React Router does not scroll to #hash links by itself, so do it here (the navbar offset is scroll-mt on sections). */
function ScrollToHash() {
  const { hash, key } = useLocation()
  useEffect(() => {
    if (!hash) return
    const target = document.getElementById(decodeURIComponent(hash.slice(1)))
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    target?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
  }, [hash, key])
  return null
}

export function Layout() {
  const { pathname } = useLocation()

  // The signed-in sender and receiver dashboards have their own navbar and no public header or footer.
  if (pathname === '/send/dashboard' || pathname === '/receive/dashboard') {
    return (
      <div className="min-h-dvh">
        <Outlet />
      </div>
    )
  }

  // The landing page is a marketing site with its own fixed navbar and full footer.
  if (pathname === '/') {
    return (
      <div className="flex min-h-dvh flex-col">
        <ScrollToHash />
        <MarketingNav />
        <main className="flex-1 pt-16">
          <Outlet />
        </main>
        <SiteFooter />
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b border-bronze/10 bg-cream/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <nav className="flex items-center gap-1">
            <NavLink to="/send" className={navClass}>
              Send
            </NavLink>
            <NavLink to="/receive" className={navClass}>
              Receive
            </NavLink>
          </nav>
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="px-4 py-8 pb-24 text-center text-sm text-bronze/60">
        ArcPay runs on Arc Testnet with test USDC. No real money moves.
      </footer>
    </div>
  )
}

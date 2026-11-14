import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Menu, X } from 'lucide-react'
import { Logo } from '@/components/Logo'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const LINKS = [
  { href: '#who-we-serve', label: 'Who We Serve' },
  { href: '#how-it-works', label: 'How it Works' },
  { href: '#about', label: 'About' },
]

export function MarketingNav() {
  const [open, setOpen] = useState(false)

  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-bronze/10 bg-white/70 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo />

        <nav className="hidden items-center gap-1 md:flex" aria-label="Sections">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              to={l.href}
              className="rounded-full px-4 py-2 text-sm font-semibold text-bronze transition hover:bg-bronze/10"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link to="/get-started" className={cn(buttonVariants({ size: 'sm' }), 'px-5')}>
            Launch App
          </Link>
          <button
            type="button"
            className="grid h-11 w-11 place-items-center rounded-full text-bronze hover:bg-bronze/10 md:hidden"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.nav
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden border-t border-bronze/10 bg-cream/95 md:hidden"
            aria-label="Sections"
          >
            <div className="flex flex-col px-4 py-3">
              {LINKS.map((l) => (
                <Link
                  key={l.href}
                  to={l.href}
                  onClick={() => setOpen(false)}
                  className="flex h-12 items-center rounded-2xl px-3 text-base font-semibold text-bronze hover:bg-bronze/10"
                >
                  {l.label}
                </Link>
              ))}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  )
}

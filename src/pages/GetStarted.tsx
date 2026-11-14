import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Smartphone, Wallet, type LucideIcon } from 'lucide-react'
import { PageLoader, PageTransition } from '@/components/PageState'
import { useSenderSession } from '@/lib/useSenderSession'
import { cn } from '@/lib/utils'

interface Choice {
  id: 'send' | 'receive'
  to: string
  title: string
  body: string
  icon: LucideIcon
}

const CHOICES: Choice[] = [
  {
    id: 'send',
    to: '/send',
    title: 'I want to send money.',
    body: 'Connect a Web3 wallet to send USDC instantly.',
    icon: Wallet,
  },
  {
    id: 'receive',
    to: '/receive',
    title: 'I want to receive money.',
    body: 'Log in with your phone number to cash out to Naira.',
    icon: Smartphone,
  },
]

const SELECT_DELAY_MS = 280

export default function GetStarted() {
  const navigate = useNavigate()
  const [selected, setSelected] = useState<Choice['id'] | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])
  const session = useSenderSession()

  // A wallet that is already connected from a previous session goes straight to the dashboard.
  if (session.active) return <Navigate to="/send/dashboard" replace />
  if (session.settling) return <PageLoader label="Restoring your session" />

  const choose = (e: React.MouseEvent<HTMLAnchorElement>, choice: Choice) => {
    // Let the browser handle new-tab clicks.
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    e.preventDefault()
    setSelected(choice.id)
    // Brief pause so the gold border visibly locks in before the page changes.
    timer.current = setTimeout(() => void navigate(choice.to), SELECT_DELAY_MS)
  }

  return (
    <PageTransition>
    <div className="relative isolate flex min-h-[calc(100dvh-4rem)] items-center justify-center overflow-hidden px-4 py-10">
      <div className="mesh-bg absolute inset-0 -z-20" />
      <div className="absolute -left-24 top-10 -z-10 h-72 w-72 animate-drift rounded-full bg-gold/45 blur-3xl" />
      <div className="absolute -right-20 bottom-10 -z-10 h-80 w-80 animate-drift-slow rounded-full bg-ember/25 blur-3xl" />

      <section
        className="w-full max-w-2xl rounded-[2.5rem] border border-white/70 bg-white/55 p-6 shadow-[0_30px_70px_-30px_rgba(99,64,26,0.45)] backdrop-blur-xl sm:p-10"
      >
        <h1 className="text-balance text-center text-4xl font-extrabold leading-tight tracking-[-0.03em] text-bronze sm:text-5xl">
          How do you want to use ArcPay?
        </h1>
        <p className="mt-3 text-center text-lg text-bronze/70">Pick one to get started. You can always switch later.</p>

        <div className="mt-9 grid gap-4 sm:grid-cols-2">
          {CHOICES.map((choice) => {
            const isSelected = selected === choice.id
            return (
              <motion.div
                key={choice.id}
                whileHover={{ scale: 1.02, y: -5 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 320, damping: 22 }}
                className="group relative"
              >
                {/* Glowing gold-to-amber border: fades in on hover, focus and selection */}
                <span
                  aria-hidden="true"
                  className={cn(
                    'pointer-events-none absolute -inset-[2px] rounded-[2rem] bg-gold-gradient opacity-0 shadow-[0_0_34px_rgba(251,191,36,0.65)] transition-opacity duration-300',
                    'group-hover:opacity-100 group-focus-within:opacity-100',
                    isSelected && 'opacity-100',
                  )}
                />
                <Link
                  to={choice.to}
                  onClick={(e) => choose(e, choice)}
                  aria-current={isSelected ? 'true' : undefined}
                  className="relative flex h-full min-h-[15rem] flex-col rounded-[2rem] bg-cream p-6 text-left outline-none"
                >
                  <span className="grid h-14 w-14 place-items-center rounded-full bg-gold-gradient shadow-glow">
                    <choice.icon className="h-6 w-6 text-bronze-dark" strokeWidth={2.2} />
                  </span>
                  <h2 className="mt-6 text-balance text-2xl font-extrabold leading-snug tracking-tight text-bronze">
                    {choice.title}
                  </h2>
                  <p className="mt-2 flex-1 text-pretty leading-relaxed text-bronze/75">{choice.body}</p>
                  <span
                    className={cn(
                      'mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-ember transition-transform duration-300 group-hover:translate-x-1',
                      isSelected && 'translate-x-1',
                    )}
                  >
                    Continue <ArrowRight className="h-4 w-4" />
                  </span>
                </Link>
              </motion.div>
            )
          })}
        </div>
      </section>
    </div>
    </PageTransition>
  )
}

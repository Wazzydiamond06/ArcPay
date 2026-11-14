import { useEffect, useRef } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { WalletAvatar } from '@/components/WalletAvatar'
import type { UnreadTransfer } from '@/lib/api'
import { USDC_DECIMALS } from '@/onchain-facts'
import { formatUnitsFixed, parseUnitsExact } from '@/onchain-money'
import { groupThousands } from '@/lib/arcpay'

const pretty = (fixed: string) => {
  const [int, dec] = fixed.split('.')
  return `${groupThousands(int)}.${dec}`
}

/** Exact decimal sum of USDC amounts, shown with two decimals. */
function total(transfers: UnreadTransfer[]): string {
  const raw = transfers.reduce((sum, t) => sum + parseUnitsExact(t.amount, USDC_DECIMALS), 0n)
  return pretty(formatUnitsFixed(raw, USDC_DECIMALS, 2))
}

/**
 * Glassmorphic "You received funds!" receipt, shown when the dashboard opens with unread transfers.
 * `onDismiss` is called by the Awesome button (and Escape).
 */
export function NewMoneyModal({
  open,
  transfers,
  onDismiss,
}: {
  open: boolean
  transfers: UnreadTransfer[]
  onDismiss: () => void
}) {
  const reduce = useReducedMotion()
  const button = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    button.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onDismiss])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="new-money"
          className="fixed inset-0 z-50 grid place-items-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div aria-hidden="true" className="absolute inset-0 bg-bronze-dark/30 backdrop-blur-md" />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-money-title"
            className="relative w-full max-w-sm rounded-[2rem] border border-white/60 bg-white/60 p-6 shadow-card backdrop-blur-xl"
            initial={{ opacity: 0, scale: reduce ? 1 : 0.9, y: reduce ? 0 : 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: reduce ? 1 : 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            <div className="flex flex-col items-center text-center">
              <span className="grid h-14 w-14 place-items-center rounded-full bg-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.5)]">
                <Check className="h-8 w-8 text-white" strokeWidth={3.5} />
              </span>
              <h2 id="new-money-title" className="mt-4 text-2xl font-extrabold tracking-tight text-bronze">
                You received funds!
              </h2>
              <p className="mt-3 text-5xl font-extrabold tabular-nums tracking-[-0.04em] text-bronze">
                ${total(transfers)}
              </p>
              <p className="mt-1 text-sm font-semibold uppercase tracking-[0.1em] text-bronze/60">USDC</p>
            </div>

            <div className="my-5 border-b border-dashed border-bronze/25" />

            <ul className="max-h-56 space-y-4 overflow-y-auto pr-1">
              {transfers.map((t) => (
                <li key={t.id} className="flex flex-col items-center text-center">
                  <WalletAvatar address={t.senderWallet} size={64} />
                  <p className="mt-2 text-sm font-semibold uppercase tracking-[0.1em] text-bronze/55">From</p>
                  <p className="text-lg font-extrabold text-bronze">{t.senderName ?? 'Unknown Sender'}</p>
                  {transfers.length > 1 && (
                    <p className="font-bold tabular-nums text-emerald-700">+${pretty(formatUnitsFixed(parseUnitsExact(t.amount, USDC_DECIMALS), USDC_DECIMALS, 2))}</p>
                  )}
                  {t.message && <p className="mt-2 text-pretty text-lg font-bold leading-snug text-bronze">“{t.message}”</p>}
                </li>
              ))}
            </ul>

            <Button ref={button} size="xl" className="mt-6" onClick={onDismiss}>
              Awesome
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

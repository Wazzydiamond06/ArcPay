import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Copy, Info } from 'lucide-react'
import { TokenUSDC } from '@web3icons/react'
import { toast } from 'sonner'
import { CountUp } from '@/components/CountUp'
import { RecentTransfers } from '@/components/send/RecentTransfers'
import { WalletAvatar, shortAddress } from '@/components/WalletAvatar'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CURRENCY_SYMBOL, EUR_PER_USD, fromUsd, type Currency } from '@/lib/currency'
import { groupThousands } from '@/lib/arcpay'

type Tab = 'portfolio' | 'history'

const TABS: { value: Tab; label: string }[] = [
  { value: 'portfolio', label: 'Portfolio' },
  { value: 'history', label: 'History' },
]

const money = (value: number) => {
  const [int, dec] = value.toFixed(2).split('.')
  return `${groupThousands(int)}.${dec}`
}

function Portfolio({ usdc, loading, currency }: { usdc: number | null; loading: boolean; currency: Currency }) {
  const symbol = CURRENCY_SYMBOL[currency]
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.1em] text-bronze/55">Total Balance</p>
      <div className="mt-2 flex h-14 items-center">
        {loading || usdc === null ? (
          <Skeleton className="h-12 w-52 rounded-2xl bg-[#E5D5C5]" />
        ) : (
          <p className="text-5xl font-extrabold leading-none tracking-[-0.04em] text-bronze">
            <CountUp value={fromUsd(usdc, currency)} prefix={symbol} duration={0.8} />
          </p>
        )}
      </div>
      {currency === 'EUR' && (
        <p className="mt-2 text-xs text-bronze/55">Indicative demo rate: 1 USD = {EUR_PER_USD} EUR</p>
      )}

      <h3 className="mt-8 text-sm font-bold uppercase tracking-[0.08em] text-bronze/55">Holdings</h3>
      <ul className="mt-3 space-y-3">
        <li className="flex items-center gap-3 rounded-2xl border border-white/80 bg-white/80 p-4 shadow-card">
          <TokenUSDC variant="branded" size={40} />
          <div className="min-w-0 flex-1">
            <p className="font-bold text-bronze">USDC</p>
            <p className="text-sm text-bronze/60">USD Coin</p>
          </div>
          {loading || usdc === null ? (
            <Skeleton className="h-10 w-24 bg-[#E5D5C5]" />
          ) : (
            <div className="text-right">
              <p className="font-extrabold tabular-nums text-bronze">{money(usdc)} USDC</p>
              <p className="text-sm tabular-nums text-bronze/60">
                {symbol}
                {money(fromUsd(usdc, currency))}
              </p>
            </div>
          )}
        </li>
      </ul>

      <p className="mt-4 flex gap-2 rounded-2xl bg-white/60 p-3 text-xs leading-relaxed text-bronze/65">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        Arc pays network fees in USDC, so there is no separate gas token to hold. USDC is valued at $1.
      </p>
    </div>
  )
}

/** Right-hand slide-over with the wallet's portfolio and transfer history. */
export function PortfolioSheet({
  open,
  onOpenChange,
  address,
  usdcBalance,
  balanceLoading,
  currency,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  address: string
  /** Wallet USDC balance as a plain number (valued 1:1 in USD), or null while unknown */
  usdcBalance: number | null
  balanceLoading: boolean
  currency: Currency
}) {
  const [tab, setTab] = useState<Tab>('portfolio')

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(address)
      toast.success('Wallet address copied')
    } catch {
      toast.error('Could not copy the address')
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right">
        <SheetHeader className="pr-16">
          <div className="flex items-center gap-3">
            <WalletAvatar address={address} size={44} />
            <div className="min-w-0">
              <SheetTitle>My Wallet</SheetTitle>
              <SheetDescription className="flex items-center gap-1.5 tabular-nums">
                {shortAddress(address)} · Arc Testnet
                <button
                  type="button"
                  onClick={() => void copy()}
                  aria-label="Copy wallet address"
                  className="grid h-7 w-7 place-items-center rounded-full text-bronze/70 transition hover:bg-bronze/10"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 pb-[max(2rem,env(safe-area-inset-bottom))]">
          <Tabs value={tab} onValueChange={(v) => setTab(v === 'history' ? 'history' : 'portfolio')}>
            <TabsList aria-label="Wallet sections">
              {TABS.map((t) => (
                <TabsTrigger key={t.value} value={t.value}>
                  {tab === t.value && (
                    <motion.span
                      layoutId="wallet-tab-pill"
                      className="absolute inset-0 -z-10 rounded-full bg-white shadow-card"
                      transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                    />
                  )}
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <div className="mt-6" role="tabpanel" aria-label={tab === 'portfolio' ? 'Portfolio' : 'History'}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={tab}
                initial={{ opacity: 0, x: tab === 'history' ? 24 : -24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: tab === 'history' ? -24 : 24 }}
                transition={{ duration: 0.18 }}
              >
                {tab === 'portfolio' ? (
                  <Portfolio usdc={usdcBalance} loading={balanceLoading} currency={currency} />
                ) : (
                  <RecentTransfers wallet={address} />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

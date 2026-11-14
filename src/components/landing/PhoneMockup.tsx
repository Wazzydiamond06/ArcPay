import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Clean phone frame with an overlapping floating chip. Decorative: hidden from assistive tech. */
export function PhoneMockup({
  children,
  chip,
  chipClassName,
}: {
  children: React.ReactNode
  chip: React.ReactNode
  chipClassName?: string
}) {
  return (
    <div aria-hidden="true" className="relative mx-auto w-[11.5rem] shrink-0 pb-4 pl-6 pr-4 pt-2 md:mx-0">
      {/* offset back card gives the overlapping depth */}
      <div className="absolute -right-1 top-8 h-[19rem] w-[10rem] rotate-[5deg] rounded-[2rem] bg-gold-gradient opacity-40" />
      <div className="relative h-[20rem] w-[10.5rem] overflow-hidden rounded-[2rem] border-[6px] border-bronze-dark bg-cream shadow-[0_24px_40px_-16px_rgba(46,27,8,0.55)]">
        <div className="mx-auto mt-2 h-4 w-16 rounded-full bg-bronze-dark" />
        <div className="px-3 pb-3 pt-3 text-bronze">{children}</div>
      </div>
      <div
        className={cn(
          'absolute -left-3 bottom-12 flex items-center gap-1.5 rounded-full border border-white bg-white px-3 py-1.5 text-xs font-bold shadow-card',
          chipClassName,
        )}
      >
        {chip}
      </div>
    </div>
  )
}

const bar = 'rounded-xl border border-bronze/15 bg-white px-2.5 py-2 text-[11px] font-semibold'
const pill = 'rounded-full bg-gold-gradient py-2 text-center text-[11px] font-extrabold text-bronze-dark'

export function FundScreen() {
  return (
    <div className="space-y-3">
      <p className="text-xs font-extrabold">ArcPay</p>
      <div className="rounded-2xl bg-bronze p-3 text-cream">
        <p className="text-[9px] font-semibold uppercase tracking-wider text-gold">Wallet</p>
        <p className="mt-1 text-xs font-bold">USDC on Arc</p>
      </div>
      <div className={pill}>Connect Wallet</div>
      <p className="text-center text-[10px] text-bronze/60">Zero hidden fees</p>
    </div>
  )
}

export function SendScreen() {
  return (
    <div className="space-y-2.5">
      <p className="text-xs font-extrabold">Send money home</p>
      <div className={bar}>+234 803 ••• 4567</div>
      <div className={cn(bar, 'text-sm font-extrabold tabular-nums')}>50.00 USDC</div>
      <div className="rounded-xl bg-bronze/5 px-2.5 py-2 text-[11px] font-semibold">For school fees</div>
      <div className={pill}>Send USDC</div>
    </div>
  )
}

export function CashOutScreen() {
  return (
    <div className="space-y-2.5">
      <p className="text-xs font-extrabold">Withdraw to Naira</p>
      <div className={cn(bar, 'flex items-center justify-between')}>
        GTBank <ChevronDown className="h-3 w-3" />
      </div>
      <div className={cn(bar, 'tabular-nums')}>•••••• 4567</div>
      <div className={pill}>Confirm Withdrawal</div>
      <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-emerald-700">
        <Check className="h-3 w-3" strokeWidth={3} /> Naira on the way
      </div>
    </div>
  )
}

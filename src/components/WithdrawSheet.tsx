import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeftRight, Check, ShieldAlert } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { resolveBank, withdrawUsdc, type WithdrawResult } from '@/lib/api'
import { namesMatch } from '@/lib/names'
import { amountToPayload, groupThousands, maskAmount } from '@/lib/arcpay'
import { cn } from '@/lib/utils'
import { USDC_DECIMALS } from '@/onchain-facts'
import { formatUnitsExact, formatUnitsFixed, parseUnitsExact } from '@/onchain-money'

const BANKS = [
  { name: 'Access Bank', code: '044' },
  { name: 'First Bank', code: '011' },
  { name: 'GTBank', code: '058' },
  { name: 'Kuda', code: '50211' },
  { name: 'Moniepoint', code: '50515' },
  { name: 'OPay', code: '999992' },
  { name: 'PalmPay', code: '999991' },
  { name: 'Stanbic IBTC', code: '221' },
  { name: 'Sterling Bank', code: '232' },
  { name: 'UBA', code: '033' },
  { name: 'Wema Bank', code: '035' },
  { name: 'Zenith Bank', code: '057' },
]

/** Indicative demo rate (NGN per 1 USDC). Not a live market rate. */
const DEMO_NGN_PER_USDC = 1500
const CONVERT_MS = 2000

type Phase = 'form' | 'converting' | 'success'

function toNaira(usdc: string): string {
  const value = Number(usdc.replace(/,/g, '')) * DEMO_NGN_PER_USDC
  return value.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const withCommas = (fixed: string) => {
  const [int, dec] = fixed.split('.')
  return dec === undefined ? groupThousands(int) : `${groupThousands(int)}.${dec}`
}

interface WithdrawSheetProps {
  open: boolean
  onClose: () => void
  /** Receiver's national phone number (10 digits), used to save the withdrawal. */
  national: string
  /** The receiver's registered legal name. The bank account name must match it. */
  registeredName: string
  /** Balance still available to withdraw, in USDC base units. */
  availableRaw: bigint
  /** Called with the new total withdrawn once the withdrawal is saved. */
  onWithdrawn: (result: WithdrawResult) => void
}

export function WithdrawSheet({ open, onClose, national, registeredName, availableRaw, onWithdrawn }: WithdrawSheetProps) {
  const [amountInput, setAmountInput] = useState('')
  const [bank, setBank] = useState('')
  const [account, setAccount] = useState('')
  const [phase, setPhase] = useState<Phase>('form')
  const [paidNaira, setPaidNaira] = useState('')
  const [paidUsdc, setPaidUsdc] = useState('')
  const resetTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => clearTimeout(resetTimer.current), [])

  const availableText = withCommas(formatUnitsFixed(availableRaw, USDC_DECIMALS, 2))

  const amountRaw = useMemo(() => {
    try {
      return parseUnitsExact(amountToPayload(amountInput), USDC_DECIMALS)
    } catch {
      return null
    }
  }, [amountInput])
  const overBalance = amountRaw !== null && amountRaw > availableRaw
  const amountOk = amountRaw !== null && amountRaw > 0n && !overBalance
  const accountComplete = /^\d{10}$/.test(account)

  // Name enquiry: runs 500ms after the 10th digit is typed (and once a bank is chosen).
  const [debouncedAccount, setDebouncedAccount] = useState('')
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedAccount(accountComplete ? account : ''), 500)
    return () => clearTimeout(timer)
  }, [account, accountComplete])
  const resolveQuery = useQuery({
    queryKey: ['resolve-bank', national, bank, debouncedAccount],
    queryFn: () => resolveBank(national, bank, debouncedAccount),
    enabled: bank !== '' && debouncedAccount !== '',
    retry: false,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  })
  const resolvedName = resolveQuery.data?.accountName ?? null
  const resolveStatus: 'idle' | 'verifying' | 'match' | 'mismatch' | 'error' =
    !accountComplete || bank === ''
      ? 'idle'
      : debouncedAccount !== account || resolveQuery.isFetching
        ? 'verifying'
        : resolvedName !== null
          ? namesMatch(registeredName, resolvedName)
            ? 'match'
            : 'mismatch'
          : resolveQuery.isError
            ? 'error'
            : 'verifying'
  // AML lock: nothing can be confirmed until the account name belongs to the signed-in user.
  const valid = amountOk && resolveStatus === 'match'
  const converting = phase === 'converting'

  const setMax = () => {
    // The input holds two decimals, so round the balance down (never above what is available).
    const [int, frac = ''] = formatUnitsExact(availableRaw, USDC_DECIMALS).split('.')
    setAmountInput(maskAmount(`${int}.${(frac + '00').slice(0, 2)}`))
  }

  const handleOpenChange = (next: boolean) => {
    if (next || converting) return
    onClose()
    resetTimer.current = setTimeout(() => {
      setPhase('form')
      setAmountInput('')
      setAccount('')
      setBank('')
    }, 350)
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!valid) return
    const payload = amountToPayload(amountInput)
    setPhase('converting')
    // The withdrawal is saved while the "converting" screen is shown, for at least 2 seconds.
    const minimumWait = new Promise((resolve) => setTimeout(resolve, CONVERT_MS))
    Promise.all([withdrawUsdc(national, payload, bank, account), minimumWait])
      .then(([result]) => {
        setPaidNaira(toNaira(payload))
        setPaidUsdc(withCommas(Number(payload).toFixed(2)))
        onWithdrawn(result)
        setPhase('success')
      })
      .catch((error: unknown) => {
        toast.error(error instanceof Error && error.message ? error.message : 'The withdrawal could not be completed.')
        setPhase('form')
      })
  }

  return (
    <Drawer open={open} onOpenChange={handleOpenChange} dismissible={!converting}>
      <DrawerContent className="pb-[max(2rem,env(safe-area-inset-bottom))]">
        {phase === 'form' && (
          <form onSubmit={submit}>
            <DrawerHeader>
              <DrawerTitle>Withdraw to Naira</DrawerTitle>
              <DrawerDescription>
                Available: <span className="font-bold tabular-nums text-bronze">${availableText}</span>
                {amountOk && (
                  <>
                    {' '}
                    · you get about <span className="font-bold tabular-nums text-bronze">₦{toNaira(amountToPayload(amountInput))}</span>
                  </>
                )}
              </DrawerDescription>
            </DrawerHeader>

            <div className="space-y-5 px-6 pt-6">
              <div>
                <Label htmlFor="withdraw-amount">Amount to Withdraw (USDC)</Label>
                <div className="relative">
                  <Input
                    id="withdraw-amount"
                    inputMode="decimal"
                    autoComplete="off"
                    placeholder="0.00"
                    value={amountInput}
                    onChange={(e) => setAmountInput(maskAmount(e.target.value))}
                    aria-invalid={overBalance}
                    aria-describedby={overBalance ? 'withdraw-amount-error' : undefined}
                    className={cn(
                      'pr-20 text-2xl font-extrabold tabular-nums',
                      overBalance && 'border-red-400 bg-red-50/60 focus:border-red-500 focus:ring-red-200/70',
                    )}
                  />
                  <button
                    type="button"
                    onClick={setMax}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full px-3 py-1.5 text-sm font-extrabold text-ember transition hover:bg-gold/20"
                  >
                    Max
                  </button>
                </div>
                {overBalance && (
                  <p id="withdraw-amount-error" role="alert" className="mt-2 text-sm font-medium text-red-600">
                    That is more than your available balance (${availableText}).
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="bank">Your bank</Label>
                <Select value={bank} onValueChange={setBank}>
                  <SelectTrigger id="bank" aria-label="Your bank">
                    <SelectValue placeholder="Select your bank" />
                  </SelectTrigger>
                  <SelectContent>
                    {BANKS.map((b) => (
                      <SelectItem key={b.code} value={b.code}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="account">Account number</Label>
                <Input
                  id="account"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={10}
                  placeholder="10-digit account number"
                  value={account}
                  onChange={(e) => setAccount(e.target.value.replace(/\D/g, ''))}
                  className={cn(
                    'tabular-nums',
                    resolveStatus === 'mismatch' && 'border-red-400 bg-red-50/60 focus:border-red-500 focus:ring-red-200/70',
                  )}
                />
                <div className="mt-2 min-h-6 text-sm font-medium" aria-live="polite">
                  {accountComplete && bank === '' && <p className="text-bronze/60">Select your bank to verify this account.</p>}
                  {resolveStatus === 'verifying' && (
                    <span className="inline-block animate-pulse rounded-md bg-bronze/10 px-2.5 py-0.5 text-bronze/70">
                      Verifying account details...
                    </span>
                  )}
                  {resolveStatus === 'match' && resolvedName && (
                    <p className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2.5 py-0.5 font-semibold text-emerald-800">
                      <Check className="h-4 w-4 shrink-0" strokeWidth={3} />
                      {resolvedName}
                    </p>
                  )}
                  {resolveStatus === 'mismatch' && resolvedName && (
                    <p className="font-semibold text-red-600">{resolvedName}</p>
                  )}
                  {resolveStatus === 'error' && (
                    <p className="text-red-600">
                      We could not verify this account.{' '}
                      <button
                        type="button"
                        onClick={() => void resolveQuery.refetch()}
                        className="font-bold underline underline-offset-4"
                      >
                        Try again
                      </button>
                    </p>
                  )}
                </div>
                {resolveStatus === 'mismatch' && (
                  <Alert variant="destructive" className="mt-3">
                    <ShieldAlert aria-hidden="true" />
                    <AlertDescription>
                      Third-party withdrawals are not permitted. Bank account name must match your registered identity.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
              <Button
                type="submit"
                size="xl"
                disabled={!valid}
                className="disabled:pointer-events-auto disabled:cursor-not-allowed disabled:opacity-50"
              >
                Confirm Withdrawal
              </Button>
              <p className="text-center text-xs text-bronze/55">
                Demo only. Naira shown uses an indicative rate of ₦{DEMO_NGN_PER_USDC.toLocaleString()} per $1.
              </p>
            </div>
          </form>
        )}

        {converting && (
          <div className="px-6 pb-6 pt-4" role="status" aria-live="polite">
            <DrawerHeader className="sr-only">
              <DrawerTitle>Converting</DrawerTitle>
              <DrawerDescription>Converting your USDC to Naira.</DrawerDescription>
            </DrawerHeader>
            <div className="flex flex-col items-center py-12 text-center">
              <span className="relative grid h-20 w-20 place-items-center">
                <motion.span
                  className="absolute inset-0 rounded-full bg-gold-gradient opacity-30"
                  animate={{ scale: [1, 1.35, 1], opacity: [0.35, 0, 0.35] }}
                  transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                />
                <span className="relative grid h-16 w-16 place-items-center rounded-full bg-gold-gradient shadow-glow">
                  <motion.span animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>
                    <ArrowLeftRight className="h-7 w-7 text-bronze-dark" />
                  </motion.span>
                </span>
              </span>
              <p className="mt-7 text-xl font-extrabold tracking-tight text-bronze">Converting via Circle StableFX...</p>
              <p className="mt-2 text-bronze/65">Please keep this screen open.</p>
            </div>
          </div>
        )}

        {phase === 'success' && (
          <div className="px-6 pb-6 pt-4" role="status">
            <DrawerHeader className="sr-only">
              <DrawerTitle>Withdrawal complete</DrawerTitle>
              <DrawerDescription>Your Naira is on the way.</DrawerDescription>
            </DrawerHeader>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center py-8 text-center"
            >
              <motion.span
                initial={{ scale: 0.3 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 14 }}
                className="grid h-24 w-24 place-items-center rounded-full bg-emerald-500 shadow-[0_0_40px_rgba(16,185,129,0.45)]"
              >
                <Check className="h-14 w-14 text-white" strokeWidth={3.5} />
              </motion.span>
              <h3 className="mt-6 text-pretty text-2xl font-extrabold tracking-tight text-bronze">
                Success! ₦{paidNaira} is on the way to your bank account.
              </h3>
              <p className="mt-3 text-bronze/70">
                {BANKS.find((b) => b.code === bank)?.name ?? 'Your bank'} · account ending {account.slice(-4)}
              </p>
              <p className="mx-auto mt-4 max-w-xs rounded-2xl bg-white/70 px-4 py-3 text-sm text-bronze/70">
                Demo payout: no real bank transfer is made. Your balance went down by ${paidUsdc}.
              </p>
            </motion.div>
            <Button size="xl" onClick={() => handleOpenChange(false)}>
              Done
            </Button>
          </div>
        )}
      </DrawerContent>
    </Drawer>
  )
}

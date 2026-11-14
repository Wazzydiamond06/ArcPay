import { useEffect, useRef, useState } from 'react'
import { ConnectKitButton } from 'connectkit'
import { motion, useReducedMotion } from 'framer-motion'
import { Check, Wallet } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAccount, useAccountEffect } from 'wagmi'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { ProgressHeader, SlideStage, SlideStep, StepSkeleton } from '@/components/onboarding/Frame'
import { checkSender, registerSender } from '@/lib/api'
import type { SenderProfile } from '@/lib/sender'

const TOTAL_STEPS = 3
const SKELETON_MS = 900
const heading = 'text-balance text-4xl font-extrabold leading-tight tracking-[-0.03em] text-bronze'

const NAME_PATTERN = /^[\p{L}][\p{L}0-9' .-]*$/u
const cleanName = (value: string) => value.replace(/[^\p{L}0-9' .-]/gu, '').slice(0, 30)
const nameOk = (value: string) => {
  const v = value.trim()
  return v.length >= 2 && NAME_PATTERN.test(v)
}

const PERKS = ['Zero hidden FX fees', 'Instant USDC settlement', 'Delivered to a phone number']

export function SenderOnboarding({ onComplete }: { onComplete: (profile: SenderProfile) => void }) {
  const reduce = useReducedMotion()
  const { address, isConnected, status } = useAccount()

  const [profileStep, setProfileStep] = useState<0 | 1>(0)
  const [direction, setDirection] = useState<1 | -1>(1)
  const [pause, setPause] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState('')

  useAccountEffect({
    onDisconnect() {
      setPause(null)
      setProfileStep(0)
      setDirection(-1)
    },
  })

  // The gateway: as soon as a wallet is connected, look it up in the database.
  const lookup = useQuery({
    queryKey: ['sender', address?.toLowerCase()],
    queryFn: () => checkSender(address as string),
    enabled: Boolean(address),
    retry: false,
    staleTime: 0,
    refetchOnWindowFocus: false,
  })
  const returning = lookup.data?.exists === true && Boolean(lookup.data.displayName)

  // A wallet that is already registered skips the name step entirely and goes to the dashboard.
  const routedFor = useRef<string | null>(null)
  useEffect(() => {
    if (!returning || !address || !lookup.data?.displayName || routedFor.current === address) return
    routedFor.current = address
    toast.success(`Welcome back, ${lookup.data.displayName}`)
    onComplete({ displayName: lookup.data.displayName, address })
  }, [returning, address, lookup.data?.displayName, onComplete])

  // Real states: the wallet prompt, the database lookup, or a signed-in sender being routed.
  const walletPending = status === 'connecting' || status === 'reconnecting'
  const loadingLabel = walletPending
    ? 'Connecting your wallet'
    : isConnected && (lookup.isLoading || returning)
      ? returning
        ? 'Signing you in'
        : 'Checking your account'
      : pause
  const stepIndex = !isConnected ? 0 : profileStep === 0 ? 1 : 2

  const nameValid = nameOk(displayName)
  const truncated = address ? `${address.slice(0, 6)}…${address.slice(-4)}` : ''

  // New sender: save the name against the wallet in the database, then show the ready screen.
  const toReady = (e: React.FormEvent) => {
    e.preventDefault()
    if (!nameValid || pause || !address) return
    setDirection(1)
    setPause('Saving your profile')
    const minimumWait = new Promise((resolve) => setTimeout(resolve, SKELETON_MS))
    Promise.all([registerSender(address, displayName.trim()), minimumWait])
      .then(() => setProfileStep(1))
      .catch(() => toast.error('We could not save your profile. Please try again.'))
      .finally(() => setPause(null))
  }

  const back = () => {
    if (loadingLabel) return
    setDirection(-1)
    setProfileStep(0)
  }

  const finish = () => {
    if (!address) return
    onComplete({ displayName: displayName.trim(), address })
  }

  return (
    <div className="flex min-h-[calc(100dvh-14rem)] flex-col">
      <ProgressHeader step={stepIndex} total={TOTAL_STEPS} onBack={back} canGoBack={stepIndex === 2 && !loadingLabel} />

      <SlideStage direction={direction}>
        {loadingLabel ? (
          <SlideStep key="loading" direction={direction}>
            <StepSkeleton variant={stepIndex === 1 ? 'input' : 'card'} label={loadingLabel} />
          </SlideStep>
        ) : !isConnected ? (
          <SlideStep key="hook" direction={direction}>
            <div className="text-center">
              <h1 className={heading}>Send money home with zero hidden fees.</h1>
              <p className="mt-4 text-pretty text-lg text-bronze/70">
                Connect your wallet to send USDC to any Nigerian phone number.
              </p>
              <ul className="mt-6 flex flex-wrap justify-center gap-2">
                {PERKS.map((p) => (
                  <li
                    key={p}
                    className="inline-flex items-center gap-1.5 rounded-full border border-bronze/15 bg-white/70 px-3.5 py-1.5 text-sm font-semibold text-bronze"
                  >
                    <Check className="h-3.5 w-3.5 text-ember" strokeWidth={3} /> {p}
                  </li>
                ))}
              </ul>

              <div className="relative mt-10">
                {/* glow */}
                <motion.span
                  aria-hidden="true"
                  className="absolute inset-x-6 -bottom-1 top-3 rounded-full bg-gold-gradient blur-2xl"
                  animate={reduce ? { opacity: 0.5 } : { opacity: [0.35, 0.75, 0.35], scale: [0.98, 1.04, 0.98] }}
                  transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
                />
                <ConnectKitButton.Custom>
                  {({ show }) => (
                    <Button
                      type="button"
                      size="xl"
                      onClick={show}
                      className="relative shadow-[0_0_44px_rgba(251,191,36,0.65)] ring-1 ring-white/50"
                    >
                      <Wallet className="h-5 w-5" /> Connect Wallet
                    </Button>
                  )}
                </ConnectKitButton.Custom>
              </div>
              <p className="mt-4 text-sm text-bronze/55">Works with MetaMask and other browser wallets.</p>
            </div>
          </SlideStep>
        ) : profileStep === 0 ? (
          <SlideStep key="profile" direction={direction}>
            <form onSubmit={toReady} className="text-center">
              <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-100">
                <motion.span initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 16 }}>
                  <Check className="h-8 w-8 text-emerald-700" strokeWidth={3} />
                </motion.span>
              </span>
              <h1 className={`${heading} mt-6`}>Wallet Connected.</h1>
              <p className="mx-auto mt-3 inline-flex items-center gap-2 rounded-full border border-emerald-300/60 bg-emerald-50 px-4 py-1.5 font-mono text-sm font-semibold text-emerald-800">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> {truncated}
              </p>

              <div className="mt-8 text-left">
                <Label htmlFor="display-name">What should the receiver call you?</Label>
                <Input
                  id="display-name"
                  autoFocus
                  autoComplete="nickname"
                  placeholder="Uncle Babalola"
                  value={displayName}
                  onChange={(e) => setDisplayName(cleanName(e.target.value))}
                  className="h-16 rounded-3xl text-xl"
                />
                <p className="mt-2 text-sm text-bronze/60">This name appears on your digital receipt.</p>
                {lookup.isError && (
                  <p className="mt-2 text-sm font-medium text-red-600">
                    We could not check your account just now. You can still continue.
                  </p>
                )}
              </div>
              <Button type="submit" size="xl" className="mt-6" disabled={!nameValid}>
                Continue
              </Button>
            </form>
          </SlideStep>
        ) : (
          <SlideStep key="ready" direction={direction}>
            <div className="text-center">
              <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-gold-gradient shadow-glow">
                <Check className="h-8 w-8 text-bronze-dark" strokeWidth={3} />
              </span>
              <h1 className={`${heading} mt-6`}>You are ready to send, {displayName.trim()}.</h1>
              <p className="mt-3 text-pretty text-base text-bronze/70">
                Your receipts will show you as “{displayName.trim()}”.
              </p>
              <Button size="xl" className="mt-8" onClick={finish}>
                Continue to Dashboard
              </Button>
            </div>
          </SlideStep>
        )}
      </SlideStage>
    </div>
  )
}

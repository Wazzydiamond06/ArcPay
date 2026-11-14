import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { REGEXP_ONLY_DIGITS } from 'input-otp'
import { Check, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { ProgressHeader, SlideStage, SlideStep, StepSkeleton } from '@/components/onboarding/Frame'
import { formatPhone, formatPhoneInput, isValidNgNumber, maskPhone, nationalDigits } from '@/lib/arcpay'
import type { ReceiverProfile } from '@/lib/receiver'
import { createClient } from '@supabase/supabase-js'

// 1. Initialize Supabase directly inside the component
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseAnonKey)

type PhoneStatus = 'new' | 'returning'
const describeApiError = (error: any) => error?.message || 'Something went wrong. Please try again.'

const NEW_USER_STEPS = 5
const RETURNING_STEPS = 2

const NAME_PATTERN = /^\p{L}[\p{L}' -]*$/u
const cleanName = (value: string) => value.replace(/[^\p{L}' -]/gu, '')
const nameOk = (value: string) => {
  const v = value.trim()
  return v.length >= 2 && NAME_PATTERN.test(v)
}

const VERIFIED_PAUSE_MS = 700
const SKELETON_MS = 1000

const heading = 'text-balance text-4xl font-extrabold leading-tight tracking-[-0.03em] text-bronze'

type LoadingKind = { label: string; variant: 'input' | 'otp' | 'card' }

export function OnboardingWizard({ onComplete }: { onComplete: (profile: ReceiverProfile) => void }) {
  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState<1 | -1>(1)
  const [loading, setLoading] = useState<LoadingKind | null>(null)
  const [status, setStatus] = useState<PhoneStatus | null>(null)

  const [phoneInput, setPhoneInput] = useState('')
  const [otp, setOtp] = useState('')
  const [verified, setVerified] = useState(false)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [bvn, setBvn] = useState('')

  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])

  const national = nationalDigits(phoneInput)
  const phoneValid = isValidNgNumber(national)
  const namesValid = nameOk(firstName) && nameOk(lastName)
  const bvnValid = /^\d{11}$/.test(bvn)
  
  const busy = loading !== null || (step === 1 && verified)
  const returning = status === 'returning'
  const total = returning ? RETURNING_STEPS : NEW_USER_STEPS

  const runWithSkeleton = <T,>(kind: LoadingKind, task: () => Promise<T>, onDone: (result: T) => void, onFail: (error: unknown) => void) => {
    clearTimeout(timer.current)
    setDirection(1)
    setLoading(kind)
    const minimumWait = new Promise((resolve) => setTimeout(resolve, SKELETON_MS))
    void Promise.all([task(), minimumWait])
      .then(([result]) => onDone(result))
      .catch(onFail)
      .finally(() => setLoading(null))
  }

  const go = (next: number, dir: 1 | -1 = 1) => {
    clearTimeout(timer.current)
    setDirection(dir)
    setStep(next)
  }

  // 2. Direct Supabase Call: Check if phone exists
  const sendCode = (e: React.FormEvent) => {
    e.preventDefault()
    if (!phoneValid || busy) return
    runWithSkeleton(
      { label: 'Checking your number', variant: 'otp' },
      async () => {
        const { data, error } = await supabase
          .from('users')
          .select('phone_number')
          .eq('phone_number', national)
          .single()
        if (error || !data) return 'new' as PhoneStatus
        return 'returning' as PhoneStatus
      },
      (result) => {
        setStatus(result)
        setOtp('')
        setVerified(false)
        setStep(1)
      },
      (error) => toast.error(describeApiError(error)),
    )
  }

  // 3. Direct Supabase Call: Fetch returning user data
  const handleOtpComplete = (code: string) => {
    setVerified(true)
    timer.current = setTimeout(() => {
      if (!returning) {
        setVerified(false)
        go(2)
        return
      }
      runWithSkeleton(
        { label: 'Signing you in', variant: 'card' },
        async () => {
          const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('phone_number', national)
            .single()
          if (error || !data) throw new Error('Account not found')
          return { firstName: data.first_name, lastName: data.last_name }
        },
        (account) => {
          toast.success(`Welcome back, ${account.firstName}`)
          onComplete({ national, firstName: account.firstName, lastName: account.lastName })
        },
        (error) => {
          toast.error(describeApiError(error))
          setVerified(false)
          setOtp('')
        },
      )
    }, VERIFIED_PAUSE_MS)
  }

  const submitName = (e: React.FormEvent) => {
    e.preventDefault()
    if (!namesValid || busy) return
    go(3)
  }

  // 4. Direct Supabase Call: Register new user
  const submitBvn = (e: React.FormEvent) => {
    e.preventDefault()
    if (!bvnValid || busy) return
    runWithSkeleton(
      { label: 'Verifying your BVN', variant: 'input' },
      async () => {
        const { data, error } = await supabase
          .from('users')
          .insert([
            { phone_number: national, first_name: firstName.trim(), last_name: lastName.trim(), bvn_hash: bvn }
          ])
        if (error) {
          if (error.code === '23505') throw new Error('phone_exists')
          throw new Error(error.message)
        }
        return true
      },
      () => setStep(4),
      (error: any) => {
        toast.error(describeApiError(error))
        if (error?.message === 'phone_exists') {
          setStatus(null)
          setBvn('')
          setStep(0)
        }
      },
    )
  }

  const finish = () => onComplete({ national, firstName: firstName.trim(), lastName: lastName.trim() })

  const goBack = () => {
    if (busy || step === 0) return
    setOtp('')
    setVerified(false)
    go(step - 1, -1)
  }

  return (
    <div className="flex min-h-[calc(100dvh-14rem)] flex-col">
      <ProgressHeader step={step} total={total} onBack={goBack} canGoBack={step > 0 && !busy} />

      <SlideStage direction={direction}>
        {loading ? (
          <SlideStep key="loading" direction={direction}>
            <StepSkeleton variant={loading.variant} label={loading.label} />
          </SlideStep>
        ) : step === 0 ? (
          <SlideStep key="phone" direction={direction}>
            <form onSubmit={sendCode} className="text-center">
              <h1 className={heading}>Enter your phone number to access your funds.</h1>
              <p className="mt-3 text-pretty text-lg text-bronze/70">We will text you a code to confirm it is you.</p>
              <div className="mt-8 text-left">
                <Label htmlFor="phone" className="sr-only">Phone number</Label>
                <Input
                  id="phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  autoFocus
                  placeholder="+234 803 123 4567"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(formatPhoneInput(e.target.value))}
                  className="h-[4.5rem] rounded-3xl text-center text-3xl font-bold tabular-nums"
                />
                <p className="mt-3 h-5 text-center text-sm font-medium text-bronze/60">
                  {phoneInput === '' ? 'Start with +234 or 0' : phoneValid ? `We will text ${formatPhone(national)}` : 'Keep typing your 10-digit mobile number'}
                </p>
              </div>
              <Button type="submit" size="xl" className="mt-6" disabled={!phoneValid}>Send Code</Button>
            </form>
          </SlideStep>
        ) : step === 1 ? (
          <SlideStep key="otp" direction={direction}>
            <div className="text-center">
              <h1 className={heading}>{returning ? 'Log in to ArcPay' : 'Create your ArcPay Account'}</h1>
              <p className="mt-3 text-pretty text-lg text-bronze/70">Enter the 4-digit code sent to your phone.</p>
              <p className="mt-1 font-semibold tabular-nums text-bronze/80">{maskPhone(national)}</p>
              <div data-verified={verified} className="group mt-8 flex flex-col items-center" role="group" aria-label="Verification code">
                <InputOTP
                  maxLength={4}
                  pattern={REGEXP_ONLY_DIGITS}
                  inputMode="numeric"
                  autoFocus
                  value={otp}
                  onChange={setOtp}
                  onComplete={handleOtpComplete}
                  disabled={verified}
                  containerClassName="justify-center"
                >
                  <InputOTPGroup>
                    {[0, 1, 2, 3].map((i) => (
                      <InputOTPSlot key={i} index={i} className="group-data-[verified=true]:border-emerald-500/60 group-data-[verified=true]:bg-emerald-50" />
                    ))}
                  </InputOTPGroup>
                </InputOTP>

                <div className="mt-6 h-12" aria-live="polite">
                  {verified ? (
                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-5 py-2.5 font-bold text-emerald-800">
                      <Check className="h-5 w-5" strokeWidth={3} /> Code accepted
                    </motion.div>
                  ) : (
                    <button type="button" onClick={() => { setOtp(''); toast('A new code is on its way') }} className="h-12 rounded-full px-5 font-semibold text-ember underline-offset-4 hover:underline">
                      Resend code
                    </button>
                  )}
                </div>
                <p className="text-sm text-bronze/55">Demo mode: any 4 digits will work.</p>
              </div>
            </div>
          </SlideStep>
        ) : step === 2 ? (
          <SlideStep key="name" direction={direction}>
            <form onSubmit={submitName} className="text-center">
              <h1 className={heading}>What is your legal name?</h1>
              <p className="mt-3 text-pretty text-base text-bronze/70">Ensure this exactly matches your local bank account for seamless Naira withdrawals.</p>
              <div className="mt-8 space-y-4 text-left">
                <div>
                  <Label htmlFor="first">First name</Label>
                  <Input id="first" autoComplete="given-name" autoFocus placeholder="Adaeze" value={firstName} onChange={(e) => setFirstName(cleanName(e.target.value))} className="h-16 rounded-3xl text-xl" />
                </div>
                <div>
                  <Label htmlFor="last">Last name</Label>
                  <Input id="last" autoComplete="family-name" placeholder="Okafor" value={lastName} onChange={(e) => setLastName(cleanName(e.target.value))} className="h-16 rounded-3xl text-xl" />
                </div>
              </div>
              <Button type="submit" size="xl" className="mt-8" disabled={!namesValid}>Continue</Button>
            </form>
          </SlideStep>
        ) : step === 3 ? (
          <SlideStep key="bvn" direction={direction}>
            <form onSubmit={submitBvn} className="text-center">
              <h1 className={heading}>Verify your BVN.</h1>
              <p className="mt-3 text-pretty text-base text-bronze/70">Your 11-digit Bank Verification Number confirms your identity for Naira withdrawals.</p>
              <div className="mt-8 text-left">
                <Label htmlFor="bvn">BVN</Label>
                <Input id="bvn" inputMode="numeric" autoComplete="off" autoFocus maxLength={11} placeholder="11 digits" value={bvn} onChange={(e) => setBvn(e.target.value.replace(/\D/g, '').slice(0, 11))} className="h-[4.5rem] rounded-3xl text-center text-3xl font-bold tabular-nums tracking-[0.12em]" />
                <p className="mt-3 flex items-start gap-2 text-sm text-bronze/65">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                  We store only a secure hash, never the number itself. Dial *565*0# from your registered phone to get your BVN.
                </p>
              </div>
              <Button type="submit" size="xl" className="mt-6" disabled={!bvnValid}>Verify BVN</Button>
              <p className="mt-3 text-xs text-bronze/50">Demo mode: the BVN is format-checked, not verified with a bank.</p>
            </form>
          </SlideStep>
        ) : (
          <SlideStep key="done" direction={direction}>
            <div className="text-center">
              <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-gold-gradient shadow-glow">
                <Check className="h-8 w-8 text-bronze-dark" strokeWidth={3} />
              </span>
              <h1 className={`${heading} mt-6`}>You are all set.</h1>
              <p className="mt-3 text-pretty text-base text-bronze/70">Your account is ready. Open your balance to continue.</p>
              <dl className="mt-8 space-y-3 rounded-3xl border border-white/80 bg-white/80 p-6 text-left shadow-card">
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="text-xs font-semibold uppercase tracking-[0.1em] text-bronze/55">Name</dt>
                  <dd className="text-lg font-bold">{firstName.trim()} {lastName.trim()}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="text-xs font-semibold uppercase tracking-[0.1em] text-bronze/55">Phone</dt>
                  <dd className="text-lg font-bold tabular-nums">{formatPhone(national)}</dd>
                </div>
              </dl>
              <Button size="xl" className="mt-8" onClick={finish}>Complete Setup</Button>
            </div>
          </SlideStep>
        )}
      </SlideStage>
    </div>
  )
}

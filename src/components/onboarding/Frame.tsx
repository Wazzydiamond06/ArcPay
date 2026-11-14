import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

/** Top bar: back arrow, segmented progress, step counter. */
export function ProgressHeader({
  step,
  total,
  onBack,
  canGoBack,
}: {
  step: number
  total: number
  onBack: () => void
  canGoBack: boolean
}) {
  const reduce = useReducedMotion()
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={onBack}
        disabled={!canGoBack}
        aria-label="Back"
        className={`grid h-11 w-11 place-items-center rounded-full text-bronze transition hover:bg-bronze/10 disabled:pointer-events-none ${
          step === 0 ? 'invisible' : ''
        } ${canGoBack ? '' : 'opacity-40'}`}
      >
        <ArrowLeft className="h-5 w-5" />
      </button>
      <div
        className="flex flex-1 gap-2"
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={step + 1}
        aria-label="Setup progress"
      >
        {Array.from({ length: total }, (_, i) => (
          <span key={i} className="h-1.5 flex-1 overflow-hidden rounded-full bg-bronze/10">
            <motion.span
              className="block h-full rounded-full bg-gold-gradient"
              initial={false}
              animate={{ width: i <= step ? '100%' : '0%' }}
              transition={{ duration: reduce ? 0 : 0.4, ease: 'easeOut' }}
            />
          </span>
        ))}
      </div>
      <span className="w-11 text-right text-sm font-semibold tabular-nums text-bronze/60">
        {step + 1}/{total}
      </span>
    </div>
  )
}

/** Horizontal slide stage. Its single child must be a keyed <SlideStep>. */
export function SlideStage({ direction, children }: { direction: 1 | -1; children: React.ReactNode }) {
  return (
    <div className="relative flex flex-1 items-center overflow-x-clip px-1 py-8">
      <AnimatePresence mode="wait" custom={direction} initial={false}>
        {children}
      </AnimatePresence>
    </div>
  )
}

export function SlideStep({ direction, children }: { direction: 1 | -1; children: React.ReactNode }) {
  const reduce = useReducedMotion()
  const variants = {
    enter: (d: number) => ({ x: reduce ? 0 : d * 56, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: reduce ? 0 : d * -56, opacity: 0 }),
  }
  return (
    <motion.div
      custom={direction}
      variants={variants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ type: 'spring', stiffness: 320, damping: 34 }}
      className="w-full"
    >
      {children}
    </motion.div>
  )
}

/** Skeleton shaped like a step: two-line heading, subtitle, input (or OTP boxes) and a pill button. */
export function StepSkeleton({ variant = 'input', label }: { variant?: 'input' | 'otp' | 'card'; label: string }) {
  return (
    <div role="status" aria-label={label} className="flex flex-col items-center">
      <Skeleton className="h-10 w-4/5" />
      <Skeleton className="mt-3 h-10 w-3/5" />
      <Skeleton className="mt-5 h-5 w-2/3" />

      {variant === 'otp' ? (
        <div className="mt-10 flex gap-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-14 rounded-2xl sm:h-[4.5rem] sm:w-16" />
          ))}
        </div>
      ) : variant === 'card' ? (
        <Skeleton className="mt-8 h-32 w-full rounded-3xl" />
      ) : (
        <Skeleton className="mt-8 h-[4.5rem] w-full rounded-3xl" />
      )}

      <Skeleton className="mt-6 h-16 w-full rounded-full" />
      <span className="sr-only">{label}</span>
    </div>
  )
}

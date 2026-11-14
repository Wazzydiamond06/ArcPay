import * as React from 'react'
import { OTPInput, OTPInputContext } from 'input-otp'
import { cn } from '@/lib/utils'

const InputOTP = React.forwardRef<React.ElementRef<typeof OTPInput>, React.ComponentPropsWithoutRef<typeof OTPInput>>(
  ({ className, containerClassName, ...props }, ref) => (
    <OTPInput
      ref={ref}
      containerClassName={cn('flex items-center gap-2 has-[:disabled]:opacity-70', containerClassName)}
      className={cn('disabled:cursor-not-allowed', className)}
      {...props}
    />
  ),
)
InputOTP.displayName = 'InputOTP'

const InputOTPGroup = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<'div'>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn('flex items-center gap-3', className)} {...props} />,
)
InputOTPGroup.displayName = 'InputOTPGroup'

const InputOTPSlot = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<'div'> & { index: number }>(
  ({ index, className, ...props }, ref) => {
    const ctx = React.useContext(OTPInputContext)
    const slot = ctx.slots[index]
    const char = slot?.char
    const hasFakeCaret = slot?.hasFakeCaret
    const isActive = slot?.isActive

    return (
      <div
        ref={ref}
        className={cn(
          'relative grid h-16 w-14 place-items-center rounded-2xl border-2 border-bronze/15 bg-white/80 text-3xl font-extrabold tabular-nums text-bronze transition-all sm:h-[4.5rem] sm:w-16',
          isActive && 'z-10 border-ember ring-4 ring-gold/30',
          className,
        )}
        {...props}
      >
        {char}
        {hasFakeCaret && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <div className="h-7 w-0.5 animate-pulse bg-bronze" />
          </div>
        )}
      </div>
    )
  },
)
InputOTPSlot.displayName = 'InputOTPSlot'

export { InputOTP, InputOTPGroup, InputOTPSlot }

import * as React from 'react'
import { cn } from '@/lib/utils'

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'h-14 w-full rounded-2xl border-2 border-bronze/15 bg-white/80 px-4 text-lg font-medium text-bronze placeholder:text-bronze/35 transition focus:border-ember focus:outline-none focus:ring-4 focus:ring-gold/30',
        className,
      )}
      {...props}
    />
  ),
)
Input.displayName = 'Input'

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'w-full resize-none rounded-2xl border-2 border-bronze/15 bg-white/80 px-4 py-3 text-lg font-medium text-bronze placeholder:text-bronze/35 transition focus:border-ember focus:outline-none focus:ring-4 focus:ring-gold/30',
        className,
      )}
      {...props}
    />
  ),
)
Textarea.displayName = 'Textarea'

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn('mb-2 block text-sm font-semibold uppercase tracking-[0.08em] text-bronze/70', className)}
      {...props}
    />
  )
}

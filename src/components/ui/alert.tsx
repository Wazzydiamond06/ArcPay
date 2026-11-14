import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const alertVariants = cva(
  'relative flex w-full gap-3 rounded-2xl border-2 p-4 [&>svg]:mt-0.5 [&>svg]:h-5 [&>svg]:w-5 [&>svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'border-bronze/15 bg-white/80 text-bronze',
        destructive: 'border-red-300 bg-red-50 text-red-900 [&>svg]:text-red-600',
        warning: 'border-amber-400 bg-amber-50 text-amber-950 shadow-[0_0_0_4px_rgba(251,191,36,0.15)] [&>svg]:text-amber-600',
      },
    },
    defaultVariants: { variant: 'default' },
  },
)

export const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <div ref={ref} role="alert" className={cn(alertVariants({ variant }), className)} {...props} />
))
Alert.displayName = 'Alert'

export const AlertTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => <h5 ref={ref} className={cn('font-bold leading-tight', className)} {...props} />,
)
AlertTitle.displayName = 'AlertTitle'

export const AlertDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => <p ref={ref} className={cn('text-pretty text-sm leading-relaxed', className)} {...props} />,
)
AlertDescription.displayName = 'AlertDescription'

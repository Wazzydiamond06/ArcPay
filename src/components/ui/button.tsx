import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold tracking-tight transition-all duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold/50 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]',
  {
    variants: {
      variant: {
        primary:
          'bg-gold-gradient text-bronze-dark shadow-glow hover:brightness-105 hover:shadow-[0_14px_36px_-8px_rgba(217,119,6,0.7)]',
        dark: 'bg-bronze text-cream hover:bg-bronze-dark',
        outline: 'border-2 border-bronze/20 bg-white/60 text-bronze hover:bg-white hover:border-bronze/40',
        ghost: 'text-bronze hover:bg-bronze/10',
      },
      size: {
        sm: 'h-10 px-5 text-sm',
        default: 'h-12 px-6 text-base',
        lg: 'h-14 px-8 text-lg',
        xl: 'h-16 px-10 text-lg w-full',
      },
    },
    defaultVariants: { variant: 'primary', size: 'default' },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  ),
)
Button.displayName = 'Button'

export { buttonVariants }

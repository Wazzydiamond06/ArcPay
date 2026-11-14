import * as React from 'react'
import * as SheetPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

const Sheet = SheetPrimitive.Root
const SheetTrigger = SheetPrimitive.Trigger
const SheetClose = SheetPrimitive.Close
const SheetPortal = SheetPrimitive.Portal

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Overlay
    ref={ref}
    className={cn('overlay-fade fixed inset-0 z-50 bg-bronze-dark/40 backdrop-blur-sm', className)}
    {...props}
  />
))
SheetOverlay.displayName = 'SheetOverlay'

type Side = 'right' | 'left'

const SheetContent = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content> & { side?: Side }
>(({ side = 'right', className, children, ...props }, ref) => (
  <SheetPortal>
    <SheetOverlay />
    <SheetPrimitive.Content
      ref={ref}
      data-side={side}
      className={cn(
        'sheet-slide fixed inset-y-0 z-50 flex h-dvh w-[92vw] max-w-md flex-col gap-0 bg-cream shadow-2xl focus:outline-none',
        side === 'right' ? 'right-0 rounded-l-[2rem] border-l border-white/70' : 'left-0 rounded-r-[2rem] border-r border-white/70',
        className,
      )}
      {...props}
    >
      {children}
      <SheetPrimitive.Close
        aria-label="Close"
        className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full text-bronze transition hover:bg-bronze/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold/50"
      >
        <X className="h-5 w-5" />
      </SheetPrimitive.Close>
    </SheetPrimitive.Content>
  </SheetPortal>
))
SheetContent.displayName = 'SheetContent'

const SheetHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col gap-1 px-6 pb-4 pt-6', className)} {...props} />
)

const SheetTitle = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Title>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Title ref={ref} className={cn('text-xl font-extrabold tracking-tight text-bronze', className)} {...props} />
))
SheetTitle.displayName = 'SheetTitle'

const SheetDescription = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Description>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Description ref={ref} className={cn('text-sm text-bronze/65', className)} {...props} />
))
SheetDescription.displayName = 'SheetDescription'

export { Sheet, SheetTrigger, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetDescription }

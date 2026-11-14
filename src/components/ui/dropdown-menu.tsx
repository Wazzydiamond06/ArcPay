import * as React from 'react'
import * as MenuPrimitive from '@radix-ui/react-dropdown-menu'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

const DropdownMenu = MenuPrimitive.Root
const DropdownMenuTrigger = MenuPrimitive.Trigger
const DropdownMenuRadioGroup = MenuPrimitive.RadioGroup

const DropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof MenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof MenuPrimitive.Content>
>(({ className, sideOffset = 8, ...props }, ref) => (
  <MenuPrimitive.Portal>
    <MenuPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        'menu-pop z-50 min-w-[14rem] overflow-hidden rounded-2xl border border-white/70 bg-white/90 p-1.5 text-bronze shadow-card backdrop-blur-xl',
        className,
      )}
      {...props}
    />
  </MenuPrimitive.Portal>
))
DropdownMenuContent.displayName = 'DropdownMenuContent'

const itemClass =
  'relative flex cursor-pointer select-none items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold outline-none transition-colors focus:bg-bronze/10 data-[disabled]:pointer-events-none data-[disabled]:opacity-50'

const DropdownMenuItem = React.forwardRef<
  React.ElementRef<typeof MenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof MenuPrimitive.Item>
>(({ className, ...props }, ref) => <MenuPrimitive.Item ref={ref} className={cn(itemClass, className)} {...props} />)
DropdownMenuItem.displayName = 'DropdownMenuItem'

const DropdownMenuRadioItem = React.forwardRef<
  React.ElementRef<typeof MenuPrimitive.RadioItem>,
  React.ComponentPropsWithoutRef<typeof MenuPrimitive.RadioItem>
>(({ className, children, ...props }, ref) => (
  <MenuPrimitive.RadioItem ref={ref} className={cn(itemClass, 'pl-9', className)} {...props}>
    <span className="absolute left-3 grid h-4 w-4 place-items-center">
      <MenuPrimitive.ItemIndicator>
        <Check className="h-4 w-4 text-ember" strokeWidth={3} />
      </MenuPrimitive.ItemIndicator>
    </span>
    {children}
  </MenuPrimitive.RadioItem>
))
DropdownMenuRadioItem.displayName = 'DropdownMenuRadioItem'

const DropdownMenuLabel = React.forwardRef<
  React.ElementRef<typeof MenuPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof MenuPrimitive.Label>
>(({ className, ...props }, ref) => (
  <MenuPrimitive.Label
    ref={ref}
    className={cn('px-3 pb-1 pt-2 text-xs font-bold uppercase tracking-[0.08em] text-bronze/55', className)}
    {...props}
  />
))
DropdownMenuLabel.displayName = 'DropdownMenuLabel'

const DropdownMenuSeparator = React.forwardRef<
  React.ElementRef<typeof MenuPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof MenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <MenuPrimitive.Separator ref={ref} className={cn('-mx-1.5 my-1.5 h-px bg-bronze/10', className)} {...props} />
))
DropdownMenuSeparator.displayName = 'DropdownMenuSeparator'

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
}

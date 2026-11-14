import { ChevronDown, CircleUserRound, Landmark, LifeBuoy, LogOut } from 'lucide-react'
import { Logo } from '@/components/Logo'
import { NameAvatar } from '@/components/NameAvatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { ReceiverPanel } from '@/components/receive/ReceiverInfoDialog'
import type { ReceiverProfile } from '@/lib/receiver'

/** Navbar for the signed-in receiver: logo on the left, profile menu on the right. No marketing links. */
export function ReceiverNavbar({
  profile,
  onOpenPanel,
  onLogOut,
}: {
  profile: ReceiverProfile
  onOpenPanel: (panel: ReceiverPanel) => void
  onLogOut: () => void
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-bronze/10 bg-white/70 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Logo />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={`Open profile menu for ${profile.firstName}`}
              className="group inline-flex h-11 items-center gap-2.5 rounded-full border border-bronze/15 bg-white/80 py-1 pl-1.5 pr-3.5 text-sm font-bold text-bronze transition hover:border-bronze/30 hover:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold/50"
            >
              <NameAvatar name={`${profile.firstName} ${profile.lastName}`} size={32} />
              <span className="max-w-[8rem] truncate">{profile.firstName}</span>
              <ChevronDown className="h-4 w-4 text-bronze/55 transition group-data-[state=open]:rotate-180" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => onOpenPanel('profile')}>
              <CircleUserRound className="h-4 w-4" /> My Profile
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onOpenPanel('banks')}>
              <Landmark className="h-4 w-4" /> Saved Banks
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onOpenPanel('help')}>
              <LifeBuoy className="h-4 w-4" /> Help &amp; Support
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={onLogOut} className="text-red-700 focus:bg-red-50 focus:text-red-800">
              <LogOut className="h-4 w-4" /> Log Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}

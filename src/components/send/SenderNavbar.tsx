import { ConnectKitButton } from 'connectkit'
import { BookUser, Settings, Unplug, Wallet } from 'lucide-react'
import { Logo } from '@/components/Logo'
import { WalletAvatar, shortAddress } from '@/components/WalletAvatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { CURRENCY_SYMBOL, type Currency } from '@/lib/currency'

/** Navbar for the signed-in sender: logo on the left, settings and wallet badge on the right. No marketing links. */
export function SenderNavbar({
  address,
  currency,
  disabled,
  onCurrencyChange,
  onOpenWallet,
  onOpenAddressBook,
  onDisconnect,
}: {
  address: string | undefined
  currency: Currency
  disabled: boolean
  onCurrencyChange: (currency: Currency) => void
  onOpenWallet: () => void
  onOpenAddressBook: () => void
  onDisconnect: () => void
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-bronze/10 bg-white/70 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Logo />

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Settings"
                className="grid h-11 w-11 place-items-center rounded-full border border-bronze/15 bg-white/70 text-bronze transition hover:border-bronze/30 hover:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold/50"
              >
                <Settings className="h-5 w-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={onOpenAddressBook}>
                <BookUser className="h-4 w-4" /> Address Book
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Display Currency</DropdownMenuLabel>
              <DropdownMenuRadioGroup value={currency} onValueChange={(v) => onCurrencyChange(v === 'EUR' ? 'EUR' : 'USD')}>
                {(['USD', 'EUR'] as const).map((c) => (
                  <DropdownMenuRadioItem key={c} value={c}>
                    {c} ({CURRENCY_SYMBOL[c]})
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                disabled={disabled}
                onSelect={onDisconnect}
                className="text-red-700 focus:bg-red-50 focus:text-red-800"
              >
                <Unplug className="h-4 w-4" /> Disconnect Wallet
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {address ? (
            <button
              type="button"
              onClick={onOpenWallet}
              aria-label="Open wallet"
              className="inline-flex h-11 items-center gap-2.5 rounded-full border border-bronze/15 bg-white/80 py-1 pl-1.5 pr-4 text-sm font-bold tabular-nums text-bronze transition hover:border-bronze/30 hover:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold/50"
            >
              <WalletAvatar address={address} size={32} />
              {shortAddress(address)}
            </button>
          ) : (
            <ConnectKitButton.Custom>
              {({ show }) => (
                <button
                  type="button"
                  onClick={show}
                  className="inline-flex h-11 items-center gap-2 rounded-full bg-gold-gradient px-5 text-sm font-bold text-bronze-dark shadow-glow transition hover:brightness-105"
                >
                  <Wallet className="h-4 w-4" /> Connect Wallet
                </button>
              )}
            </ConnectKitButton.Custom>
          )}
        </div>
      </div>
    </header>
  )
}

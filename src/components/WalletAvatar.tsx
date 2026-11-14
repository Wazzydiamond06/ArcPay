import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

export const shortAddress = (address: string) => `${address.slice(0, 6)}…${address.slice(-4)}`

const byte = (address: string, index: number) => parseInt(address.slice(2 + index * 2, 4 + index * 2), 16) || 0

/** Gradient generated from the wallet address, so the same wallet always gets the same colors. */
export function walletGradient(address: string): string {
  const hueA = (byte(address, 0) * 256 + byte(address, 1)) % 360
  const hueB = (hueA + 50 + (byte(address, 2) % 110)) % 360
  const angle = byte(address, 3) % 360
  return `radial-gradient(circle at 30% 25%, rgba(255,255,255,0.55), transparent 55%), linear-gradient(${angle}deg, hsl(${hueA} 85% 58%), hsl(${hueB} 80% 50%))`
}

/** Wallet-based avatar (no image files): a deterministic gradient from the address hash. */
export function WalletAvatar({ address, size = 28, className }: { address: string; size?: number; className?: string }) {
  return (
    <Avatar aria-hidden="true" className={cn('ring-2 ring-white/80', className)} style={{ width: size, height: size }}>
      <AvatarFallback style={{ backgroundImage: walletGradient(address) }} />
    </Avatar>
  )
}

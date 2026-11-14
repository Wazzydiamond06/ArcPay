import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

/** "Babalola Fawaz" becomes "BF"; a single name gives one letter. */
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '?'
  const first = words[0][0]
  const last = words.length > 1 ? words[words.length - 1][0] : ''
  return `${first}${last}`.toUpperCase()
}

/** Name-based avatar: initials on the brand gold-to-amber gradient with deep bronze text. No image files involved. */
export function NameAvatar({ name, size = 40, className }: { name: string; size?: number; className?: string }) {
  return (
    <Avatar aria-hidden="true" className={cn('ring-2 ring-white/80', className)} style={{ width: size, height: size }}>
      <AvatarFallback
        className="bg-gradient-to-br from-[#FBBF24] to-[#D97706] font-extrabold tracking-tight text-[#63401A]"
        style={{ fontSize: Math.max(11, Math.round(size * 0.38)) }}
      >
        {initialsOf(name)}
      </AvatarFallback>
    </Avatar>
  )
}

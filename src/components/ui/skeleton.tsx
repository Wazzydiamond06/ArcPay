import { cn } from '@/lib/utils'

/** Placeholder block. Size it to match the content it stands in for. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn('animate-pulse rounded-lg bg-[#222]', className)} />
}

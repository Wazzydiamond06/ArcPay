import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

export function Logo({ className, light }: { className?: string; light?: boolean }) {
  return (
    <Link to="/" className={cn('flex items-center gap-2.5', className)} aria-label="ArcPay home">
      <span className="grid h-9 w-9 place-items-center rounded-full bg-gold-gradient shadow-glow">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2E1B08" strokeWidth="2.6" strokeLinecap="round">
          <path d="M4 17c2-8 6-12 8-12s6 4 8 12" />
        </svg>
      </span>
      <span className={cn('text-xl font-extrabold tracking-tight', light ? 'text-cream' : 'text-bronze')}>ArcPay</span>
    </Link>
  )
}

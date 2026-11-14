import { motion, useReducedMotion } from 'framer-motion'

/** Full-screen cream hold screen while a session is being resolved. Nothing else renders behind it. */
export function PageLoader({ label = 'Loading ArcPay' }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="fixed inset-0 z-[100] grid place-items-center bg-[#FDF5EB] text-[#63401A]">
      <div className="flex animate-pulse flex-col items-center gap-4 motion-reduce:animate-none">
        <span className="grid h-16 w-16 place-items-center rounded-full bg-gold-gradient shadow-glow">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#2E1B08" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
            <path d="M4 17c2-8 6-12 8-12s6 4 8 12" />
          </svg>
        </span>
        <span className="text-3xl font-extrabold tracking-tight">ArcPay</span>
      </div>
      <span className="sr-only">{label}</span>
    </div>
  )
}

/** Eases a finished page onto the screen: a short fade and a 10px slide up. */
export function PageTransition({ children, className }: { children: React.ReactNode; className?: string }) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: reduce ? 0 : 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {children}
    </motion.div>
  )
}

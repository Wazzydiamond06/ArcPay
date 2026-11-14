import { motion, useReducedMotion } from 'framer-motion'
import { ArrowUpRight, CheckCircle2, MessageCircleHeart } from 'lucide-react'
import { TokenUSDC } from '@web3icons/react'

/** Decorative hero stage: sample cards simulating money moving home. */
export function FloatingCards() {
  const reduce = useReducedMotion()
  const bob = (delay: number, amount = 10) =>
    reduce
      ? {}
      : {
          animate: { y: [0, -amount, 0] },
          transition: { duration: 5 + delay, repeat: Infinity, ease: 'easeInOut' as const, delay },
        }

  return (
    <div className="relative mx-auto h-[420px] w-full max-w-md sm:h-[480px]" aria-hidden="true">
      {/* Sender card */}
      <motion.div
        initial={{ opacity: 0, y: 30, rotate: -4 }}
        whileInView={{ opacity: 1, y: 0, rotate: -4 }}
        viewport={{ once: true }}
        transition={{ type: 'spring', stiffness: 120, damping: 16, delay: 0.1 }}
        className="absolute left-0 top-4 w-[78%]"
      >
        <motion.div {...bob(0)} className="rounded-[1.75rem] border border-white/80 bg-white/90 p-5 shadow-card backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-[0.1em] text-bronze/60">You send</span>
            <span className="grid h-8 w-8 place-items-center rounded-full bg-gold-gradient">
              <ArrowUpRight className="h-4 w-4 text-bronze-dark" />
            </span>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <TokenUSDC variant="branded" size={30} />
            <span className="text-4xl font-extrabold tabular-nums tracking-tight text-bronze">50.00</span>
          </div>
          <p className="mt-2 text-sm text-bronze/70">To Mama · +234 803 ••• 4567</p>
        </motion.div>
      </motion.div>

      {/* Coins travelling from sender to receiver */}
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="absolute left-[34%] top-[40%] h-5 w-5 rounded-full bg-gold-gradient shadow-glow ring-2 ring-white/70"
          initial={{ opacity: 0 }}
          animate={
            reduce
              ? { opacity: 0.9, x: 60, y: 40 }
              : { opacity: [0, 1, 1, 0], x: [0, 70, 130], y: [0, 40, 110], scale: [0.7, 1, 0.8] }
          }
          transition={{ duration: 3.2, repeat: Infinity, delay: i * 1.05, ease: 'easeInOut' }}
        />
      ))}

      {/* Receiver card */}
      <motion.div
        initial={{ opacity: 0, y: 30, rotate: 3 }}
        whileInView={{ opacity: 1, y: 0, rotate: 3 }}
        viewport={{ once: true }}
        transition={{ type: 'spring', stiffness: 120, damping: 16, delay: 0.3 }}
        className="absolute bottom-24 right-0 w-[72%]"
      >
        <motion.div {...bob(0.8, 12)} className="rounded-[1.75rem] bg-bronze p-5 text-cream shadow-card">
          <div className="flex items-center gap-2 text-sm font-semibold text-gold">
            <CheckCircle2 className="h-4 w-4" />
            Money received
          </div>
          <p className="mt-2 text-4xl font-extrabold tabular-nums tracking-tight">$50.00</p>
          <p className="mt-1 text-sm text-cream/70">Ready to withdraw to Naira</p>
        </motion.div>
      </motion.div>

      {/* Message chip */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.6 }}
        className="absolute bottom-2 left-2 w-[80%]"
      >
        <motion.div {...bob(1.6, 8)} className="flex items-start gap-3 rounded-3xl border border-white/80 bg-cream-deep/95 p-4 shadow-card">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gold-gradient">
            <MessageCircleHeart className="h-4 w-4 text-bronze-dark" />
          </span>
          <p className="text-sm font-medium leading-snug text-bronze">“For rent and a little extra. Love you, call Sunday.”</p>
        </motion.div>
      </motion.div>
    </div>
  )
}

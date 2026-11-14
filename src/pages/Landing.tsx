import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { buttonVariants } from '@/components/ui/button'
import { FloatingCards } from '@/components/FloatingCards'
import { FlowLines } from '@/components/FlowLines'
import { About } from '@/components/landing/About'
import { Audience } from '@/components/landing/Audience'
import { HowItWorks } from '@/components/landing/HowItWorks'
import { cn } from '@/lib/utils'

export default function Landing() {
  return (
    <>
      <section className="relative isolate overflow-hidden">
        {/* Dynamic mesh background */}
        <div className="mesh-bg absolute inset-0 -z-10" />
        <div className="absolute -left-24 top-10 -z-10 h-80 w-80 animate-drift rounded-full bg-gold/50 blur-3xl" />
        <div className="absolute -right-24 top-40 -z-10 h-96 w-96 animate-drift-slow rounded-full bg-ember/30 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 -z-10 h-72 w-72 animate-drift rounded-full bg-gold/40 blur-3xl" />
        <FlowLines />

        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-12 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:pb-24 lg:pt-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-bronze/15 bg-white/70 px-4 py-1.5 text-sm font-semibold text-bronze backdrop-blur">
              <span className="h-2 w-2 rounded-full bg-ember" />
              Live on Arc Testnet
            </span>
            <h1 className="mt-6 text-balance text-5xl font-extrabold leading-[1.02] tracking-[-0.04em] text-bronze sm:text-6xl lg:text-7xl">
              Send Money Home.{' '}
              <span className="text-gold-gradient">At the Speed of a Text Message.</span>
            </h1>
            <p className="mt-6 max-w-xl text-pretty text-lg leading-relaxed text-bronze/80 sm:text-xl">
              Send USDC from anywhere to a phone number in Nigeria. Your family sees it instantly, reads your message, and
              cashes out in Naira.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link to="/get-started" className={cn(buttonVariants({ size: 'lg' }), 'w-full sm:w-auto')}>
                Launch App
              </Link>
              <Link to="#how-it-works" className={cn(buttonVariants({ size: 'lg', variant: 'outline' }), 'w-full sm:w-auto')}>
                See How It Works
              </Link>
            </div>
          </motion.div>

          <FloatingCards />
        </div>
      </section>

      <Audience />
      <HowItWorks />
      <About />
    </>
  )
}

import { motion } from 'framer-motion'
import { Gauge, Layers, ShieldCheck } from 'lucide-react'
import { FlowLines } from '@/components/FlowLines'

const PILLARS = [
  { icon: Gauge, title: 'Sub-second finality', body: 'Deterministic settlement, so a transfer is either final or it is not.' },
  { icon: Layers, title: 'Institutional liquidity', body: 'Naira routing backed by Circle StableFX.' },
  { icon: ShieldCheck, title: 'USDC-native fees', body: 'Network fees are paid in USDC, so costs stay predictable.' },
]

export function About() {
  return (
    <section id="about" className="relative isolate scroll-mt-20 overflow-hidden bg-[#63401A] py-24 text-cream">
      <div className="pointer-events-none absolute inset-0 opacity-40">
        <FlowLines />
      </div>
      <div className="pointer-events-none absolute -right-20 -top-20 -z-10 h-80 w-80 rounded-full bg-gold/15 blur-3xl" />

      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <p className="text-sm font-semibold uppercase tracking-[0.1em] text-gold">About us</p>
        <h2 className="mt-3 max-w-3xl text-balance text-4xl font-extrabold tracking-[-0.03em] sm:text-5xl">
          Enterprise-Grade Infrastructure.
        </h2>
        <p className="mt-6 max-w-3xl text-pretty text-xl leading-relaxed text-cream/85">
          ArcPay is powered by the Arc Network and Circle StableFX, delivering sub-second deterministic finality and
          institutional liquidity for African remittances.
        </p>

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {PILLARS.map((p, i) => (
            <motion.div
              key={p.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="rounded-3xl border border-cream/15 bg-cream/5 p-6 backdrop-blur"
            >
              <span className="grid h-11 w-11 place-items-center rounded-full bg-gold-gradient">
                <p.icon className="h-5 w-5 text-bronze-dark" />
              </span>
              <h3 className="mt-5 text-lg font-bold tracking-tight">{p.title}</h3>
              <p className="mt-1.5 text-pretty text-cream/70">{p.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Check, Globe2, HeartHandshake } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const AUDIENCES = [
  {
    eyebrow: 'The Sender',
    title: 'For the Diaspora.',
    icon: Globe2,
    points: [
      'Zero hidden FX fees. The amount you send is the amount that lands.',
      'Instant USDC settlement, with no waiting on bank cut-off times.',
      'Transparent Web3 routing. Every transfer is verifiable onchain.',
    ],
    cta: { to: '/send', label: 'Start sending' },
    image: {
      src: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=800&q=80',
      alt: 'Three friends laughing around a café table with laptops',
      position: 'object-center',
    },
  },
  {
    eyebrow: 'The Receiver',
    title: 'For Family Back Home.',
    icon: HeartHandshake,
    points: [
      'Zero crypto jargon. No wallets, no long addresses to copy.',
      'Phone-number logins. If you can text, you can sign in.',
      'Instant cash-outs to local Nigerian bank accounts.',
    ],
    cta: { to: '/receive', label: 'Check my balance' },
    image: {
      src: 'https://images.unsplash.com/photo-1589156191108-c762ff4b96ab?auto=format&fit=crop&w=800&q=80',
      alt: 'Portrait of a young woman in a white fleece jacket in front of a red arrow',
      position: 'object-[50%_15%]',
    },
  },
]

export function Audience() {
  return (
    <section id="who-we-serve" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6">
      <div className="max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-[0.1em] text-ember">Who we serve</p>
        <h2 className="mt-3 text-balance text-4xl font-extrabold tracking-[-0.03em] text-bronze sm:text-5xl">
          Built for both sides of the border.
        </h2>
      </div>

      <div className="mt-12 grid gap-6 md:grid-cols-2">
        {AUDIENCES.map((a, i) => (
          <motion.article
            key={a.title}
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ delay: i * 0.1, duration: 0.5 }}
            whileHover={{ y: -8, scale: 1.01 }}
            className="relative isolate flex min-h-[36rem] flex-col justify-end overflow-hidden rounded-2xl border border-white/80 bg-cream-deep shadow-card transition-shadow duration-300 hover:shadow-[0_30px_50px_-20px_rgba(99,64,26,0.38)]"
          >
            <img
              src={a.image.src}
              alt={a.image.alt}
              width={800}
              height={600}
              loading="lazy"
              decoding="async"
              className={cn('absolute inset-0 -z-10 h-full w-full rounded-2xl object-cover', a.image.position)}
            />
            {/* Bottom-anchored white fade keeps the bronze text readable */}
            <div
              aria-hidden="true"
              className="absolute inset-x-0 bottom-0 -z-10 h-[78%] rounded-b-2xl bg-gradient-to-t from-white from-50% via-white/90 to-transparent"
            />

            <span className="absolute right-5 top-5 grid h-12 w-12 place-items-center rounded-full bg-gold-gradient shadow-glow">
              <a.icon className="h-5 w-5 text-bronze-dark" />
            </span>

            <div className="p-7 sm:p-8">
              <span className="text-sm font-semibold uppercase tracking-[0.1em] text-bronze/70">{a.eyebrow}</span>
              <h3 className="mt-2 text-3xl font-extrabold tracking-tight text-bronze">{a.title}</h3>
              <ul className="mt-5 space-y-3">
                {a.points.map((p) => (
                  <li key={p} className="flex gap-3 text-pretty leading-snug text-bronze">
                    <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-bronze text-gold">
                      <Check className="h-3.5 w-3.5" strokeWidth={3} />
                    </span>
                    {p}
                  </li>
                ))}
              </ul>
              <Link to={a.cta.to} className={cn(buttonVariants({ variant: 'dark' }), 'mt-7 w-fit')}>
                {a.cta.label} <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </motion.article>
        ))}
      </div>
    </section>
  )
}

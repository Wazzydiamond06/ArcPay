import { motion } from 'framer-motion'
import { Check, Landmark, Smartphone, Wallet, type LucideIcon } from 'lucide-react'
import { CashOutScreen, FundScreen, PhoneMockup, SendScreen } from '@/components/landing/PhoneMockup'

interface Step {
  icon: LucideIcon
  title: string
  body: string
  tag: string
  screen: React.ReactNode
  chip: React.ReactNode
  chipClassName?: string
  background?: { src: string; alt: string }
}

const STEPS: Step[] = [
  {
    icon: Wallet,
    title: 'Fund with USDC.',
    body: 'Connect your Web3 wallet and use USDC on Arc. Settlement is near-instant, and fees are paid in USDC too.',
    tag: 'Web3 wallet connection',
    screen: <FundScreen />,
    chip: (
      <>
        <Check className="h-3.5 w-3.5 text-emerald-600" strokeWidth={3} /> Wallet connected
      </>
    ),
  },
  {
    icon: Smartphone,
    title: 'Send to a Phone Number.',
    body: 'Type a Nigerian phone number and a message. A smart contract maps the number to a destination, so nobody copies a wallet address.',
    tag: 'Smart contract mapping',
    screen: <SendScreen />,
    chip: (
      <>
        <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(52,211,153,0.9)]" /> Settled
      </>
    ),
  },
  {
    icon: Landmark,
    title: 'Cash Out to Naira.',
    body: 'Your family picks their bank and enters a 10-digit NUBAN account number. Circle StableFX routes the swap to Naira.',
    tag: 'StableFX routing to a local NUBAN',
    screen: <CashOutScreen />,
    chip: <>₦ Naira</>,
    background: {
      src: 'https://images.unsplash.com/photo-1618828665011-0abd973f7bb8?auto=format&fit=crop&w=800&q=80',
      alt: 'Aerial view of the Lagos waterfront and skyline',
    },
  },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-20 bg-cream-deep/60 py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.1em] text-ember">How it works</p>
          <h2 className="mt-3 text-balance text-4xl font-extrabold tracking-[-0.03em] text-bronze sm:text-5xl">
            How ArcPay Moves Money.
          </h2>
          <p className="mt-4 text-pretty text-lg text-bronze/75">
            Three steps from a wallet abroad to a bank account at home.
          </p>
        </div>

        <ol className="mt-14 space-y-8">
          {STEPS.map((s, i) => (
            <motion.li
              key={s.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.5 }}
              className="relative pl-14 sm:pl-16"
            >
              {/* timeline marker and connector */}
              <span className="absolute left-0 top-6 z-10 grid h-12 w-12 place-items-center rounded-full bg-gold-gradient shadow-glow ring-8 ring-cream-deep/60">
                <s.icon className="h-5 w-5 text-bronze-dark" />
              </span>
              {i < STEPS.length - 1 && (
                <span
                  aria-hidden="true"
                  className="absolute -bottom-8 left-6 top-[4.5rem] border-l-2 border-dashed border-ember/40"
                />
              )}

              <div className="relative isolate grid items-center gap-6 overflow-hidden rounded-2xl border border-white/80 bg-white/60 p-6 shadow-card md:grid-cols-[1fr_auto] md:gap-12 md:p-8">
                {s.background && (
                  <>
                    <img
                      src={s.background.src}
                      alt=""
                      width={800}
                      height={450}
                      loading="lazy"
                      decoding="async"
                      className="absolute inset-0 -z-20 h-full w-full rounded-2xl object-cover"
                    />
                    {/* heavy cream overlay at 80% keeps the text readable */}
                    <div aria-hidden="true" className="absolute inset-0 -z-10 rounded-2xl" style={{ backgroundColor: 'rgba(253, 245, 235, 0.8)' }} />
                  </>
                )}

                <div>
                  <p className="text-sm font-bold tabular-nums text-ember">Step {i + 1}</p>
                  <h3 className="mt-1 text-2xl font-extrabold tracking-tight text-bronze sm:text-3xl">{s.title}</h3>
                  <p className="mt-3 max-w-md text-pretty leading-relaxed text-bronze/80">{s.body}</p>
                  <span className="mt-5 inline-block rounded-full border border-bronze/15 bg-white/80 px-3.5 py-1.5 text-xs font-semibold text-bronze">
                    {s.tag}
                  </span>
                </div>

                <PhoneMockup chip={s.chip} chipClassName={s.chipClassName}>
                  {s.screen}
                </PhoneMockup>
              </div>
            </motion.li>
          ))}
        </ol>

        <p className="mt-12 text-sm text-bronze/55">
          ArcPay is running on Arc Testnet. Naira cash-outs are simulated until the live payout rail is connected.
        </p>
      </div>
    </section>
  )
}

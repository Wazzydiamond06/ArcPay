import { Linkedin } from 'lucide-react'
import { Logo } from '@/components/Logo'

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M18.244 2H21.5l-7.19 8.22L22.75 22h-6.62l-5.18-6.77L4.99 22H1.73l7.69-8.8L1.25 2h6.79l4.68 6.19L18.244 2Zm-1.16 18h1.83L6.99 3.9H5.03L17.084 20Z" />
    </svg>
  )
}

const SOCIALS = [
  { label: 'ArcPay on X', icon: <XIcon className="h-4 w-4" /> },
  { label: 'ArcPay on LinkedIn', icon: <Linkedin className="h-4 w-4" /> },
]

export function SiteFooter() {
  return (
    <footer className="border-t border-bronze/10 bg-cream px-4 pb-24 pt-12 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 md:flex-row md:items-center md:justify-between">
        <div>
          <Logo />
          <p className="mt-3 max-w-xs text-sm text-bronze/65">Send money home at the speed of a text message.</p>
        </div>

        <div className="flex flex-col gap-5 md:items-end">
          <span className="inline-flex w-fit items-center gap-2.5 rounded-full bg-gold-gradient p-[2px] shadow-glow">
            <span className="flex items-center gap-2 rounded-full bg-cream px-5 py-2.5 text-sm font-bold text-bronze">
              <span className="h-2 w-2 rounded-full bg-ember" />
              Powered by Circle &amp; Arc
            </span>
          </span>
          <div className="flex items-center gap-2">
            {SOCIALS.map((s) => (
              <a
                key={s.label}
                href="#"
                onClick={(e) => e.preventDefault()}
                aria-label={s.label}
                className="grid h-11 w-11 place-items-center rounded-full border-2 border-bronze/15 text-bronze transition hover:border-ember hover:bg-white"
              >
                {s.icon}
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto mt-10 max-w-6xl border-t border-bronze/10 pt-6 text-sm text-bronze/60">
        © 2026 ArcPay. Runs on Arc Testnet with test USDC. No real money moves.
      </div>
    </footer>
  )
}

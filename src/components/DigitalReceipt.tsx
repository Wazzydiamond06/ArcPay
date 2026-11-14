import { useRef, useState } from 'react'
import { toBlob } from 'html-to-image'
import { Check, Copy, ExternalLink, Loader2, Share2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { WalletAvatar } from '@/components/WalletAvatar'
import { buildTxExplorerUrl } from '@/onchain-facts'
import { ARC_CHAIN_ID, formatPhone } from '@/lib/arcpay'

export interface Receipt {
  hash: string
  senderName: string
  /** The sender's wallet, used to generate their avatar. */
  senderAddress: string
  national: string
  /** Display amount with commas, e.g. "2,500.00" */
  amount: string
  note: string
  at: number
}

const CAPTURE_BG = '#FDF5EB'

export function DigitalReceipt({ receipt, onReset }: { receipt: Receipt; onReset: () => void }) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [copied, setCopied] = useState(false)
  const [sharing, setSharing] = useState(false)

  const explorer = buildTxExplorerUrl(ARC_CHAIN_ID, receipt.hash)
  const when = new Date(receipt.at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'medium' })
  const summary = `ArcPay receipt\n${receipt.senderName} sent ${receipt.amount} USDC to ${formatPhone(receipt.national)}\n${
    receipt.note ? `For: ${receipt.note}\n` : ''
  }${when}\n${explorer}`

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(summary)
      setCopied(true)
      toast.success('Receipt copied')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Could not copy. Select the text manually.')
    }
  }

  /** Native share: screenshot of the card when the device can share files, otherwise text + link. */
  const shareReceipt = async () => {
    setSharing(true)
    try {
      if (typeof navigator.share !== 'function') {
        window.open(`https://wa.me/?text=${encodeURIComponent(summary)}`, '_blank', 'noopener,noreferrer')
        return
      }
      let file: File | null = null
      try {
        if (cardRef.current) {
          const blob = await toBlob(cardRef.current, { pixelRatio: 2, cacheBust: true, skipFonts: true, backgroundColor: CAPTURE_BG })
          if (blob) file = new File([blob], 'arcpay-receipt.png', { type: 'image/png' })
        }
      } catch {
        file = null
      }
      if (file && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'ArcPay receipt', text: summary })
      } else {
        await navigator.share({ title: 'ArcPay receipt', text: summary })
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      await copy()
    } finally {
      setSharing(false)
    }
  }

  return (
    <div className="w-full">
      <div
        ref={cardRef}
        className="overflow-hidden rounded-[2rem] border border-white bg-gradient-to-b from-white to-cream shadow-[0_30px_60px_-24px_rgba(99,64,26,0.45)]"
      >
        {/* Top half */}
        <div className="px-8 pb-8 pt-8 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/50 bg-emerald-50 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-emerald-700 shadow-[0_0_24px_rgba(52,211,153,0.5)]">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            Settled
          </span>
          <p className="mt-6 text-5xl font-extrabold tabular-nums tracking-[-0.03em] text-bronze">{receipt.amount}</p>
          <p className="mt-1 text-sm font-semibold uppercase tracking-[0.1em] text-bronze/55">USDC sent</p>
          <p className="mt-3 text-sm tabular-nums text-bronze/65">{when}</p>
        </div>

        {/* Perforation */}
        <div className="relative">
          <span className="absolute -left-3 -top-3 h-6 w-6 rounded-full bg-cream shadow-[inset_-1px_0_2px_rgba(99,64,26,0.12)]" />
          <span className="absolute -right-3 -top-3 h-6 w-6 rounded-full bg-cream shadow-[inset_1px_0_2px_rgba(99,64,26,0.12)]" />
          <div className="mx-6 border-b border-dashed border-[#ccc]" />
        </div>

        {/* Bottom half */}
        <dl className="space-y-4 px-8 pb-8 pt-7 text-bronze">
          <div className="flex flex-col items-center text-center">
            <dt className="sr-only">From:</dt>
            <WalletAvatar address={receipt.senderAddress} size={64} />
            <dd className="mt-2 text-xl font-extrabold">{receipt.senderName}</dd>
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-bronze/55" aria-hidden="true">
              Sender
            </p>
          </div>
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-sm font-semibold text-bronze/60">To:</dt>
            <dd className="text-lg font-bold tabular-nums">{formatPhone(receipt.national)}</dd>
          </div>
          {receipt.note && (
            <div className="rounded-2xl bg-bronze/5 p-4">
              <dt className="sr-only">Message</dt>
              <dd className="text-pretty text-lg font-bold leading-snug">{receipt.note}</dd>
            </div>
          )}
        </dl>
      </div>

      <a
        href={explorer}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 flex items-center justify-center gap-1.5 text-sm font-semibold text-ember underline-offset-4 hover:underline"
      >
        View transaction <ExternalLink className="h-3.5 w-3.5" />
      </a>

      <Button onClick={() => void shareReceipt()} size="xl" className="mt-4" disabled={sharing}>
        {sharing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Share2 className="h-5 w-5" />}
        Share Receipt
      </Button>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <Button onClick={() => void copy()} variant="outline">
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} Copy details
        </Button>
        <Button onClick={onReset} variant="ghost">
          Send another
        </Button>
      </div>
    </div>
  )
}

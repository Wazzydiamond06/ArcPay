import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Inbox } from 'lucide-react'
import { fetchTransactions, type TransferRecord } from '@/lib/api'
import { NameAvatar } from '@/components/NameAvatar'
import { formatPhone } from '@/lib/arcpay'
import { cn } from '@/lib/utils'

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

const formatAmount = (amount: string) =>
  Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** Same shape as a transfer row so nothing jumps when the data arrives. */
function RowSkeleton() {
  return (
    <div className="flex animate-pulse items-center gap-3 rounded-2xl border border-transparent bg-[#E5D5C5] p-4">
      <div className="h-10 w-10 shrink-0 rounded-full bg-white/40" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="h-4 w-32 rounded-md bg-white/40" />
        <div className="h-3.5 w-20 rounded-md bg-white/40" />
      </div>
      <div className="flex flex-col items-end gap-1.5">
        <div className="h-4 w-20 rounded-md bg-white/40" />
        <div className="h-5 w-16 rounded-full bg-white/40" />
      </div>
    </div>
  )
}

function TransferRow({ tx }: { tx: TransferRecord }) {
  const name = tx.recipientName ?? formatPhone(tx.receiverPhone.replace(/^\+234/, ''))
  const success = tx.status === 'success'
  return (
    <motion.li
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 rounded-2xl border border-white/80 bg-white/80 p-4 shadow-card"
    >
      <NameAvatar name={tx.recipientName ?? 'NG'} size={40} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-bold text-bronze">{name}</p>
        <p className="text-sm text-bronze/60">{formatDate(tx.createdAt)}</p>
      </div>
      <div className="flex flex-col items-end gap-1">
        <p className="font-extrabold tabular-nums text-bronze">{formatAmount(tx.amount)} USDC</p>
        <span
          className={cn(
            'rounded-full px-2.5 py-0.5 text-xs font-bold',
            success ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-700',
          )}
        >
          {success ? 'Success' : tx.status}
        </span>
      </div>
    </motion.li>
  )
}

/** The sender's own transfers, read from the transactions table by connected wallet. */
export function RecentTransfers({ wallet }: { wallet: string }) {
  const query = useQuery({
    queryKey: ['transactions', wallet.toLowerCase()],
    queryFn: () => fetchTransactions(wallet),
    staleTime: 15_000,
  })

  return (
    <section className="w-full" aria-label="Transfer history">
      <div>
        {query.isLoading && (
          <div role="status" aria-label="Loading transfers" className="space-y-3">
            {[0, 1, 2].map((i) => (
              <RowSkeleton key={i} />
            ))}
          </div>
        )}

        {query.isError && (
          <div className="rounded-2xl border border-red-200 bg-red-50/80 p-4 text-sm text-red-700">
            Could not load your transfers.{' '}
            <button type="button" onClick={() => void query.refetch()} className="font-semibold underline underline-offset-4">
              Try again
            </button>
          </div>
        )}

        {query.data && query.data.length === 0 && (
          <div className="flex flex-col items-center rounded-2xl border border-white/80 bg-white/70 px-6 py-8 text-center">
            <Inbox className="h-7 w-7 text-bronze/40" />
            <p className="mt-2 font-bold text-bronze">No transfers yet</p>
            <p className="mt-1 text-sm text-bronze/65">Your completed transfers will show up here.</p>
          </div>
        )}

        {query.data && query.data.length > 0 && (
          <ul className="space-y-3">
            {query.data.map((tx) => (
              <TransferRow key={tx.id} tx={tx} />
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

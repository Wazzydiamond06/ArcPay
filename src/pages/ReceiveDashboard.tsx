import { useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Navigate, useNavigate } from 'react-router-dom'
import { erc20Abi } from 'viem'
import { useReadContract } from 'wagmi'
import { motion } from 'framer-motion'
import { ArrowDown, ArrowUp, Banknote, Inbox, Landmark } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { WithdrawSheet } from '@/components/WithdrawSheet'
import { clearProfile, loadProfile, type ReceiverProfile } from '@/lib/receiver'
import { fetchReceiverState, fetchSenderNames, markTransfersRead, verifyPhone, type ReceiverState, type WithdrawResult } from '@/lib/api'
import { NewMoneyModal } from '@/components/receive/NewMoneyModal'
import { toast } from 'sonner'
import { CountUp } from '@/components/CountUp'
import { NameAvatar } from '@/components/NameAvatar'
import { PageLoader, PageTransition } from '@/components/PageState'
import { ReceiverInfoDialog, type ReceiverPanel } from '@/components/receive/ReceiverInfoDialog'
import { ReceiverNavbar } from '@/components/receive/ReceiverNavbar'
import { WalletAvatar } from '@/components/WalletAvatar'
import { Amount, parseUnitsExact, usdcDecimalsFor } from '@/onchain-money'
import {
  ARC_CHAIN_ID,
  REMIT_ADDRESS,
  USDC_ADDRESS,
  formatPhone,
  registryAddress,
  remitAbi,
  timeAgo,
} from '@/lib/arcpay'

type HistoryItem =
  | { type: 'deposit'; key: string; at: number; from: `0x${string}`; amountRaw: bigint; note: string }
  | { type: 'withdrawal'; key: string; at: number; amountRaw: bigint; note: string }

/** Mirrors the transfer card: same padding, avatar, two text rows, amount and one note line. */
function TransferSkeleton({ withNote }: { withNote: boolean }) {
  return (
    <div className="animate-pulse rounded-3xl border border-transparent bg-[#E5D5C5] p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-white/40" />
          <div>
            <div className="flex h-6 items-center">
              <div className="h-4 w-28 rounded-md bg-white/40" />
            </div>
            <div className="flex h-5 items-center">
              <div className="h-3.5 w-16 rounded-md bg-white/40" />
            </div>
          </div>
        </div>
        <div className="flex h-7 items-center">
          <div className="h-6 w-20 rounded-md bg-white/40" />
        </div>
      </div>
      {withNote && (
        <div className="mt-3 flex h-[1.55rem] items-center">
          <div className="h-5 w-4/5 rounded-md bg-white/40" />
        </div>
      )}
    </div>
  )
}

function Dashboard({ profile }: { profile: ReceiverProfile }) {
  const { national } = profile
  const [withdrawOpen, setWithdrawOpen] = useState(false)
  const [alertDismissed, setAlertDismissed] = useState(false)
  const queryClient = useQueryClient()

  const owner = useMemo(() => registryAddress(national), [national])
  const decimals = usdcDecimalsFor(ARC_CHAIN_ID)

  const balanceQuery = useReadContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [owner],
    chainId: ARC_CHAIN_ID,
    query: { refetchInterval: 6_000 },
  })
  const messagesQuery = useReadContract({
    address: REMIT_ADDRESS,
    abi: remitAbi,
    functionName: 'recordsOf',
    args: [owner, 0n, 20n],
    chainId: ARC_CHAIN_ID,
    query: { refetchInterval: 6_000 },
  })

  // Mock withdrawals so far and unread "you received funds" alerts, read once when the dashboard opens.
  const stateKey = ['receiver-state', national]
  const stateQuery = useQuery({
    queryKey: stateKey,
    queryFn: () => fetchReceiverState(national),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    retry: false,
  })
  const unread = stateQuery.data?.unread ?? []

  // Displayed balance = on-chain balance minus what was already "withdrawn" to a bank (mock, saved in the database).
  const balanceRaw = balanceQuery.data
  const withdrawnRaw = parseUnitsExact(stateQuery.data?.withdrawnUsdc ?? '0', decimals)
  const availableRaw =
    balanceRaw === undefined ? undefined : balanceRaw > withdrawnRaw ? balanceRaw - withdrawnRaw : 0n
  const balanceText = availableRaw !== undefined ? Amount.fromRaw(availableRaw, decimals).toFixed(2) : null
  const balanceLoading = balanceQuery.isLoading || stateQuery.isLoading
  const messages = messagesQuery.data ?? []
  // The ledger merges chain transfers and database withdrawals, so wait for both before drawing any row.
  const ledgerLoading = messagesQuery.isLoading || stateQuery.isLoading

  // Registered sender names for the wallets that sent money. The wallet itself is only used for the avatar.
  const senderWallets = [...new Set(messages.map((m) => m.from.toLowerCase()))].sort()
  const namesQuery = useQuery({
    queryKey: ['sender-names', senderWallets.join(',')],
    queryFn: () => fetchSenderNames(senderWallets),
    enabled: senderWallets.length > 0,
    staleTime: 60_000,
    retry: false,
    refetchOnWindowFocus: false,
  })
  const senderNames = namesQuery.data ?? {}

  // One list for the history: transfers read from the chain are deposits, cash-outs come from the database.
  // Anything that is not explicitly a withdrawal is treated as a deposit.
  const history: HistoryItem[] = [
    ...messages.map((m, i): HistoryItem => ({
      type: 'deposit',
      key: `d-${m.timestamp}-${i}`,
      at: Number(m.timestamp),
      from: m.from,
      amountRaw: m.amount,
      note: m.note,
    })),
    ...(stateQuery.data?.withdrawals ?? []).map((w): HistoryItem => ({
      type: 'withdrawal',
      key: `w-${w.id}`,
      at: Math.floor(Date.parse(w.createdAt) / 1000),
      amountRaw: parseUnitsExact(w.amount, decimals),
      note: w.message,
    })),
  ].sort((a, b) => b.at - a.at)
  const canWithdraw = availableRaw !== undefined && availableRaw > 0n

  const dismissAlert = () => {
    setAlertDismissed(true)
    markTransfersRead(
      national,
      unread.map((t) => t.id),
    ).catch(() => toast('We could not update your alerts, so they may show again.'))
  }

  // Deduct a saved withdrawal from the displayed balance right away.
  const onWithdrawn = ({ withdrawnUsdc, transaction }: WithdrawResult) => {
    queryClient.setQueryData<ReceiverState>(stateKey, (old) =>
      old ? { ...old, withdrawnUsdc, withdrawals: [transaction, ...(old.withdrawals ?? [])] } : old,
    )
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <NameAvatar name={`${profile.firstName} ${profile.lastName}`} size={52} />
          <div>
            <p className="text-sm font-semibold tabular-nums text-bronze/60">{formatPhone(national)}</p>
            <p className="text-2xl font-extrabold tracking-tight text-bronze">Welcome back, {profile.firstName}</p>
          </div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-5 overflow-hidden rounded-[2rem] bg-bronze p-7 text-cream shadow-card"
      >
        <p className="text-sm font-semibold uppercase tracking-[0.1em] text-gold">Your balance</p>
        {/* Fixed-height row so skeleton and number occupy identical space */}
        <div className="mt-3 flex h-12 items-baseline gap-2">
          {balanceLoading ? (
            <div role="status" aria-label="Loading balance" className="h-12 w-[13rem] animate-pulse rounded-lg bg-[#E5D5C5]" />
          ) : balanceText === null ? (
            <p className="text-5xl font-extrabold leading-none tabular-nums tracking-[-0.04em]">--</p>
          ) : (
            <>
              <p className="text-5xl font-extrabold leading-none tracking-[-0.04em] tabular-nums">
                <CountUp value={Number(balanceText)} duration={1.2} />
              </p>
              <span className="text-xl font-bold text-gold">USDC</span>
            </>
          )}
        </div>
        <p className="mt-2 text-cream/70">
          {balanceQuery.isError ? 'Could not load your balance. Retrying…' : 'Available to withdraw'}
        </p>
      </motion.div>

      <section className="mt-8">
        <h2 className="text-xl font-extrabold tracking-tight text-bronze">Transaction History</h2>
        <div className="mt-3 space-y-3">
          {ledgerLoading && (
            <div role="status" aria-label="Loading transactions" className="space-y-3">
              {[0, 1, 2, 3].map((i) => (
                <TransferSkeleton key={i} withNote={i % 2 === 0} />
              ))}
            </div>
          )}
          {!ledgerLoading && history.length === 0 && (
            <Card className="flex flex-col items-center py-10 text-center">
              <Inbox className="h-8 w-8 text-bronze/40" />
              <p className="mt-3 text-lg font-bold text-bronze">No transactions yet</p>
              <p className="mt-1 text-pretty text-bronze/70">Money you receive and cash out shows up here.</p>
            </Card>
          )}
          {!ledgerLoading && history.map((item, i) => (
            <motion.div
              key={item.key}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i, 6) * 0.05 }}
              className="rounded-3xl border border-white/80 bg-white/80 p-5 shadow-card"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {item.type === 'withdrawal' ? (
                    <span className="grid h-10 w-10 place-items-center rounded-full bg-bronze/10 text-[#63401A]">
                      <Landmark className="h-5 w-5" aria-hidden="true" />
                    </span>
                  ) : (
                    <WalletAvatar address={item.from} size={40} />
                  )}
                  <div>
                    <p className="font-bold text-bronze">
                      {item.type === 'withdrawal' ? (
                        'Withdrawal to Bank'
                      ) : namesQuery.isLoading ? (
                        <span
                          role="status"
                          aria-label="Loading sender"
                          className="inline-block h-4 w-32 animate-pulse rounded-md bg-[#E5D5C5] align-middle"
                        />
                      ) : (
                        `From: ${senderNames[item.from.toLowerCase()] ?? 'Unknown Sender'}`
                      )}
                    </p>
                    <p className="text-sm text-bronze/60">{timeAgo(item.at)}</p>
                  </div>
                </div>
                {item.type === 'withdrawal' ? (
                  <p className="flex items-center gap-1 text-xl font-extrabold tabular-nums text-[#9B4A2F]">
                    <ArrowUp className="h-4 w-4 opacity-70" strokeWidth={3} aria-label="Money out" />- {Amount.fromRaw(item.amountRaw, decimals).toFixed(2)} USDC
                  </p>
                ) : (
                  <p className="flex items-center gap-1 text-xl font-extrabold tabular-nums text-green-600">
                    <ArrowDown className="h-4 w-4 opacity-70" strokeWidth={3} aria-label="Money in" />+ {Amount.fromRaw(item.amountRaw, decimals).toFixed(2)} USDC
                  </p>
                )}
              </div>
              {item.type === 'deposit' && item.note && (
                <p className="mt-3 text-pretty text-lg font-medium leading-snug text-bronze">“{item.note}”</p>
              )}
            </motion.div>
          ))}
        </div>
      </section>

      <div className="mt-8">
        <Button size="xl" disabled={!canWithdraw} onClick={() => setWithdrawOpen(true)}>
          <Banknote className="h-5 w-5" /> Withdraw to Naira Account
        </Button>
      </div>

      <WithdrawSheet
        open={withdrawOpen}
        onClose={() => setWithdrawOpen(false)}
        national={national}
        registeredName={`${profile.firstName} ${profile.lastName}`}
        availableRaw={availableRaw ?? 0n}
        onWithdrawn={onWithdrawn}
      />

      <NewMoneyModal open={!alertDismissed && unread.length > 0} transfers={unread} onDismiss={dismissAlert} />
    </>
  )
}

/**
 * Nothing renders until the session is resolved: a saved profile exists AND the database confirms the account.
 * Profiles saved before accounts lived in the database have no row; those users go through onboarding once.
 */
export default function ReceiveDashboard() {
  const navigate = useNavigate()
  const profile = loadProfile()
  const account = useQuery({
    queryKey: ['account-check', profile?.national],
    queryFn: () => verifyPhone(profile?.national ?? ''),
    enabled: Boolean(profile),
    retry: false,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  })
  const missingAccount = account.data === 'new'
  useEffect(() => {
    if (!missingAccount) return
    clearProfile()
    toast('Please finish setting up your account')
    void navigate('/receive', { replace: true })
  }, [missingAccount, navigate])

  if (!profile) return <Navigate to="/receive" replace />
  // If the API is offline the check fails; the saved profile is still valid, so the dashboard opens and shows its own errors.
  if (account.isLoading || missingAccount) return <PageLoader label="Checking your account" />

  return (
    <PageTransition>
      <ReceiverShell profile={profile} />
    </PageTransition>
  )
}

/** Navbar, dashboard and the profile-menu panels. */
function ReceiverShell({ profile }: { profile: ReceiverProfile }) {
  const navigate = useNavigate()
  const [panel, setPanel] = useState<ReceiverPanel | null>(null)

  // Log out: forget the saved session, then go back to the unified gateway.
  const logOut = () => {
    clearProfile()
    void navigate('/get-started')
  }

  return (
    <>
      <ReceiverNavbar profile={profile} onOpenPanel={setPanel} onLogOut={logOut} />
      <div className="relative isolate">
        <div className="mesh-bg absolute inset-x-0 top-0 -z-10 h-72 opacity-70" />
        <div className="mx-auto max-w-md px-4 pb-10 pt-8">
          <Dashboard profile={profile} />
        </div>
      </div>
      <ReceiverInfoDialog panel={panel} onClose={() => setPanel(null)} profile={profile} />
    </>
  )
}

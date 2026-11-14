import { useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ConnectKitButton } from 'connectkit'
import { erc20Abi } from 'viem'
import { useAccount, useDisconnect, usePublicClient, useReadContract, useSwitchChain, useWriteContract } from 'wagmi'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import Confetti from 'react-confetti'
import { AlertTriangle, BookmarkPlus, Check, Loader2, MessageCircle, Wallet } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Input, Label, Textarea } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { DigitalReceipt, type Receipt } from '@/components/DigitalReceipt'
import { Amount, formatUnitsExact, parseAmount, parseUnitsExact, usdcDecimalsFor } from '@/onchain-money'
import { toast } from 'sonner'
import { clearToast, errorToast } from '@/lib/toast'
import { LookupError, NotRegisteredError, lookupRecipient, recordTransaction, type TransferRecord } from '@/lib/api'
import { PageLoader, PageTransition } from '@/components/PageState'
import { useSenderSession } from '@/lib/useSenderSession'
import { AddressBookDialog } from '@/components/send/AddressBookDialog'
import { PortfolioSheet } from '@/components/send/PortfolioSheet'
import { SenderNavbar } from '@/components/send/SenderNavbar'
import { loadContacts, saveContacts, type Contact } from '@/lib/addressBook'
import { loadCurrency, saveCurrency, type Currency } from '@/lib/currency'
import { WalletAuthError, ensureWalletAuthorized } from '@/lib/wallet'
import { buildShareLink } from '@/lib/share'
import { clearSenderProfile, type SenderProfile } from '@/lib/sender'
import { cn } from '@/lib/utils'
import {
  ARC_CHAIN_ID,
  NOTE_MAX_BYTES,
  REMIT_ADDRESS,
  USDC_ADDRESS,
  amountToPayload,
  formatPhoneInput,
  groupThousands,
  isValidNgNumber,
  maskAmount,
  nationalDigits,
  noteBytes,
  describeTxError,
  remitAbi,
} from '@/lib/arcpay'

type Step = 'idle' | 'authorize' | 'lookup' | 'switching' | 'approving' | 'sending'

const STEP_LABEL: Record<Step, string> = {
  idle: '',
  authorize: 'Checking your wallet…',
  lookup: 'Finding your recipient…',
  switching: 'Switching to Arc Testnet…',
  approving: 'Approve USDC in your wallet…',
  sending: 'Sending…',
}

const now = () => Date.now()
const MIN_SPINNER_MS = 1500
/** Kept back on "Max" so the wallet can still pay network fees (fees are paid in USDC on Arc). */
const FEE_RESERVE_USDC = 0.1

const withCommas = (fixed: string) => {
  const [int, dec] = fixed.split('.')
  return dec === undefined ? groupThousands(int) : `${groupThousands(int)}.${dec}`
}

function RequiredMark() {
  return (
    <span aria-hidden="true" className="text-red-600">
      *
    </span>
  )
}

function NigerianFlag({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 16" className={className} aria-label="Nigeria" role="img">
      <rect width="24" height="16" rx="3" fill="#fff" />
      <path d="M0 3a3 3 0 0 1 3-3h5v16H3a3 3 0 0 1-3-3V3Z" fill="#008751" />
      <path d="M16 0h5a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3h-5V0Z" fill="#008751" />
      <rect x="0.5" y="0.5" width="23" height="15" rx="2.5" fill="none" stroke="#63401A" strokeOpacity="0.15" />
    </svg>
  )
}

function Dashboard({ profile }: { profile: SenderProfile }) {
  const navigate = useNavigate()
  const reduce = useReducedMotion()
  const { address, chainId, isConnected, connector } = useAccount()
  const publicClient = usePublicClient({ chainId: ARC_CHAIN_ID })
  const { writeContractAsync } = useWriteContract()
  const { switchChainAsync } = useSwitchChain()
  const { disconnectAsync } = useDisconnect()
  const queryClient = useQueryClient()

  const [phoneInput, setPhoneInput] = useState('')
  const [amountInput, setAmountInput] = useState('')
  const [note, setNote] = useState('')
  const [step, setStep] = useState<Step>('idle')
  const [receipt, setReceipt] = useState<Receipt | null>(null)
  const [viewport, setViewport] = useState({ w: 0, h: 0 })
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)
  const [walletOpen, setWalletOpen] = useState(false)
  const [bookOpen, setBookOpen] = useState(false)
  const [contacts, setContacts] = useState<Contact[]>(loadContacts)
  const [currency, setCurrency] = useState<Currency>(loadCurrency)

  const decimals = usdcDecimalsFor(ARC_CHAIN_ID)
  const national = nationalDigits(phoneInput)
  const phoneValid = isValidNgNumber(national)

  // Name enquiry: look the number up 500ms after the user stops typing a valid number.
  const [debounced, setDebounced] = useState('')
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(phoneValid ? national : ''), 500)
    return () => clearTimeout(timer)
  }, [phoneValid, national])

  const recipientQuery = useQuery({
    queryKey: ['recipient', debounced],
    queryFn: () => lookupRecipient(debounced),
    enabled: debounced !== '',
    retry: false,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })
  const lookupStatus: 'idle' | 'verifying' | 'found' | 'notfound' | 'error' = !phoneValid
    ? 'idle'
    : debounced !== national || recipientQuery.isFetching
      ? 'verifying'
      : recipientQuery.data
        ? 'found'
        : recipientQuery.error instanceof NotRegisteredError
          ? 'notfound'
          : recipientQuery.error
            ? 'error'
            : 'verifying'
  const recipientName =
    lookupStatus === 'found' && recipientQuery.data ? `${recipientQuery.data.firstName} ${recipientQuery.data.lastName}` : null

  const { data: balance, isLoading: balanceLoading, refetch: refetchBalance } = useReadContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: ARC_CHAIN_ID,
    query: { enabled: Boolean(address), refetchInterval: 10_000 },
  })
  const balanceText = balance !== undefined ? withCommas(Amount.fromRaw(balance, decimals).toFixed(2)) : null

  const sending = step !== 'idle'
  const showInvite = lookupStatus === 'notfound'

  // Resolve the shareable app link once (the share helper is async inside Arc Studio).
  useEffect(() => {
    buildShareLink('/receive')
      .then(setInviteUrl)
      .catch(() => setInviteUrl(null))
  }, [])

  // Live validation. The amount payload has the commas stripped.
  const amountRaw = useMemo(() => {
    try {
      return parseAmount(ARC_CHAIN_ID, amountToPayload(amountInput)).raw
    } catch {
      return null
    }
  }, [amountInput])
  const amountPositive = amountRaw !== null && amountRaw > 0n
  const overBalance = amountRaw !== null && balance !== undefined && amountRaw > balance
  const noteOk = noteBytes(note) <= NOTE_MAX_BYTES
  const phoneBad = !phoneValid && national.length > 0 && (national.length === 10 || !/^[789]/.test(national))
  const noteFilled = note.trim().length > 0
  const formValid =
    isConnected &&
    phoneValid &&
    recipientName !== null && // security lock: the recipient's legal name must be on screen
    amountPositive &&
    !overBalance &&
    balance !== undefined &&
    noteFilled &&
    noteOk

  useEffect(() => {
    const timer = setTimeout(() => {
      if (phoneInput !== '' && phoneBad) {
        errorToast('send-phone', 'That is not a valid Nigerian phone number. Try 0803 123 4567 or +234 803 123 4567.')
      } else clearToast('send-phone')
    }, 600)
    return () => clearTimeout(timer)
  }, [phoneInput, phoneBad])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (overBalance && balanceText !== null) {
        errorToast('send-amount', `Not enough USDC. You have ${balanceText} USDC available.`)
      } else clearToast('send-amount')
    }, 400)
    return () => clearTimeout(timer)
  }, [overBalance, balanceText])

  const setMax = () => {
    if (balance === undefined) return
    const reserve = BigInt(Math.round(FEE_RESERVE_USDC * 10 ** decimals))
    const maxRaw = balance > reserve ? balance - reserve : 0n
    const [int, frac = ''] = formatUnitsExact(maxRaw, decimals).split('.')
    setAmountInput(maskAmount(`${int}.${(frac + '00').slice(0, 2)}`))
  }

  const handleSend = async () => {
    if (sending) return
    if (!address || !publicClient || amountRaw === null || !formValid) return

    const started = now()
    try {
      // The wallet may have dropped its authorization (error 4100) while the app still looks connected.
      setStep('authorize')
      const account = await ensureWalletAuthorized(connector, address)

      // Resolve the phone number to its wallet. The address stays in memory only.
      setStep('lookup')
      const recipient = await lookupRecipient(national)
      if (recipientName && `${recipient.firstName} ${recipient.lastName}` !== recipientName) {
        void recipientQuery.refetch()
        throw new LookupError('The recipient details changed. Please check the name and try again.')
      }

      if (chainId !== ARC_CHAIN_ID) {
        setStep('switching')
        await switchChainAsync({ chainId: ARC_CHAIN_ID })
      }

      // Parse the typed amount with the decimals the USDC contract itself reports (6 on Arc),
      // with commas already stripped. This is the exact value sent to the contract.
      const tokenDecimals = await publicClient.readContract({ address: USDC_ADDRESS, abi: erc20Abi, functionName: 'decimals' })
      const sendRaw = parseUnitsExact(amountToPayload(amountInput), tokenDecimals)
      if (sendRaw <= 0n) throw new LookupError('Enter an amount greater than zero.')
      if (balance !== undefined && sendRaw > balance) throw new LookupError('Not enough USDC in your wallet for this amount.')

      const allowance = await publicClient.readContract({
        address: USDC_ADDRESS,
        abi: erc20Abi,
        functionName: 'allowance',
        args: [address, REMIT_ADDRESS],
      })
      if (allowance < sendRaw) {
        setStep('approving')
        const approveHash = await writeContractAsync({
          address: USDC_ADDRESS,
          abi: erc20Abi,
          functionName: 'approve',
          args: [REMIT_ADDRESS, sendRaw],
          account,
          chainId: ARC_CHAIN_ID,
        })
        const approved = await publicClient.waitForTransactionReceipt({ hash: approveHash })
        if (approved.status !== 'success') throw new Error('reverted: approval failed')
      }

      setStep('sending')
      const hash = await writeContractAsync({
        address: REMIT_ADDRESS,
        abi: remitAbi,
        functionName: 'remit',
        args: [recipient.address, sendRaw, note.trim()],
        account,
        chainId: ARC_CHAIN_ID,
      })
      const done = await publicClient.waitForTransactionReceipt({ hash })
      if (done.status !== 'success') throw new Error('reverted: transfer failed')

      // Show the transfer in the History tab right away; the saved row replaces this once it is stored.
      const historyKey = ['transactions', address.toLowerCase()]
      queryClient.setQueryData<TransferRecord[]>(historyKey, (old) => [
        {
          id: `pending-${hash}`,
          receiverPhone: `+234${national}`,
          recipientName: `${recipient.firstName} ${recipient.lastName}`,
          amount: formatUnitsExact(sendRaw, tokenDecimals),
          message: note.trim(),
          status: 'success',
          createdAt: new Date(now()).toISOString(),
          txHash: hash,
        },
        ...(old ?? []),
      ])

      // Save the transfer to the history table (the server re-checks it on-chain). Runs while the
      // spinner is still on screen, which stays for at least 1.5s so a fast confirmation does not flash.
      const saved = recordTransaction(hash, profile.displayName).then(
        () => true,
        () => false,
      )
      const remaining = MIN_SPINNER_MS - (now() - started)
      if (remaining > 0) await new Promise((r) => setTimeout(r, remaining))
      if (await saved) {
        // Reload the list from the database so the placeholder row is replaced by the stored one.
        void queryClient.invalidateQueries({ queryKey: historyKey })
      } else {
        toast('Transfer sent, but we could not save it to your history yet.')
      }

      setViewport({ w: window.innerWidth, h: window.innerHeight })
      setReceipt({
        hash,
        senderName: profile.displayName,
        senderAddress: address,
        national,
        amount: withCommas(Amount.fromRaw(sendRaw, tokenDecimals).toFixed(2)),
        note: note.trim(),
        at: now(),
      })
      void refetchBalance()
    } catch (error) {
      if (error instanceof NotRegisteredError) {
        // Stop before any wallet prompt: this number has no ArcPay account yet.
        void recipientQuery.refetch()
        errorToast('send-error', error.message)
        return
      }
      if (error instanceof LookupError) {
        errorToast('send-error', error.message)
        return
      }
      if (error instanceof WalletAuthError) {
        errorToast('send-error', error.message, 7000)
        return
      }
      const failure = describeTxError(error)
      if (failure.silent) toast(failure.message)
      else errorToast('send-error', failure.message, 7000)
    } finally {
      setStep('idle')
    }
  }

  const inviteViaWhatsApp = () => {
    if (!inviteUrl || !phoneValid) return
    const text = `Hi! ${profile.displayName} wants to send you money with ArcPay. Create your free account to claim it: ${inviteUrl}`
    window.open(`https://wa.me/234${national}?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer')
  }

  const reset = () => {
    setReceipt(null)
    setAmountInput('')
    setNote('')
  }

  // Clear the wallet connection and the saved sender profile, then return to the gateway.
  const disconnect = async () => {
    if (sending) return
    // Leave first, so the dashboard never re-renders in a signed-out state while the wallet disconnects.
    clearSenderProfile()
    void navigate('/get-started')
    try {
      await disconnectAsync()
    } catch {
      /* already disconnected */
    }
  }

  const changeCurrency = (next: Currency) => {
    setCurrency(next)
    saveCurrency(next)
  }

  const updateContacts = (next: Contact[]) => {
    setContacts(next)
    saveContacts(next)
  }

  const recipientSaved = contacts.some((c) => c.national === national)
  const saveRecipient = () => {
    if (!recipientName || recipientSaved) return
    updateContacts([{ national, name: recipientName }, ...contacts])
    toast.success(`${recipientName} saved to your address book`)
  }

  const useContact = (contact: Contact) => {
    setPhoneInput(formatPhoneInput(`0${contact.national}`))
    setBookOpen(false)
  }

  const usdcNumber = balance !== undefined ? Number(Amount.fromRaw(balance, decimals).toFixed(2)) : null

  return (
    <>
      <SenderNavbar
        address={address}
        currency={currency}
        disabled={sending}
        onCurrencyChange={changeCurrency}
        onOpenWallet={() => setWalletOpen(true)}
        onOpenAddressBook={() => setBookOpen(true)}
        onDisconnect={() => void disconnect()}
      />
    <div className="relative isolate flex min-h-[calc(100dvh-4rem)] flex-col items-center justify-center gap-8 px-4 py-8">
      <div className="mesh-bg absolute inset-0 -z-20 opacity-70" />

      {receipt && !reduce && (
        <Confetti
          width={viewport.w}
          height={viewport.h}
          recycle={false}
          numberOfPieces={180}
          gravity={0.28}
          colors={['#FBBF24', '#D97706', '#63401A', '#FDE68A', '#34D399']}
          style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}
        />
      )}

      <AnimatePresence mode="wait" initial={false}>
        {receipt ? (
          <motion.div
            key="receipt"
            className="relative z-10 w-full max-w-md"
            initial={{ y: reduce ? 0 : 180, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            <DigitalReceipt receipt={receipt} onReset={reset} />
          </motion.div>
        ) : (
          <motion.form
            key="form"
            className="relative z-10 w-full max-w-md rounded-[2rem] border border-white/80 bg-white/80 p-8 shadow-[0_30px_60px_-24px_rgba(99,64,26,0.4)] backdrop-blur-xl"
            exit={{ opacity: 0, scale: 0.95, y: 16, transition: { duration: 0.25, ease: 'easeIn' } }}
            onSubmit={(e) => {
              e.preventDefault()
              void handleSend()
            }}
          >
            {/* Balance */}
            <div className="flex items-center justify-between gap-3">
              {!isConnected ? (
                <ConnectKitButton.Custom>
                  {({ show }) => (
                    <button
                      type="button"
                      onClick={show}
                      className={cn(buttonVariants({ size: 'sm' }), 'px-4')}
                    >
                      <Wallet className="h-4 w-4" /> Connect Wallet
                    </button>
                  )}
                </ConnectKitButton.Custom>
              ) : balanceLoading || balanceText === null ? (
                <Skeleton className="h-9 w-52 rounded-full" />
              ) : (
                <span className="inline-flex h-9 items-center rounded-full bg-bronze/10 px-4 text-sm font-semibold tabular-nums text-bronze/80 backdrop-blur">
                  Available: {balanceText} USDC
                </span>
              )}
            </div>

            <h1 className="mt-6 text-3xl font-extrabold tracking-[-0.03em] text-bronze">Send money home</h1>
            <p className="mt-1 text-sm text-bronze/65">
              Sending as <span className="font-bold text-bronze">{profile.displayName}</span>
            </p>

            <div className="mt-8 space-y-7">
              {/* Recipient */}
              <div>
                <Label htmlFor="phone">
                  Recipient phone number <RequiredMark />
                </Label>
                <div className="relative">
                  <NigerianFlag className="pointer-events-none absolute left-4 top-1/2 h-4 w-6 -translate-y-1/2" />
                  <Input
                    id="phone"
                    required
                    aria-required="true"
                    type="tel"
                    inputMode="tel"
                    autoComplete="off"
                    placeholder="0803 123 4567"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(formatPhoneInput(e.target.value))}
                    disabled={sending}
                    aria-invalid={phoneBad}
                    className={cn(
                      'h-16 rounded-3xl pl-14 text-xl tabular-nums',
                      phoneBad && 'border-red-300 bg-red-50/50 focus:border-red-400 focus:ring-red-200/60',
                    )}
                  />
                </div>
                <div className="mt-2 min-h-6 text-sm font-medium" aria-live="polite">
                  {lookupStatus === 'verifying' && (
                    <span className="inline-block animate-pulse rounded-md bg-bronze/10 px-2.5 py-0.5 text-bronze/70">
                      Verifying recipient...
                    </span>
                  )}
                  {lookupStatus === 'found' && recipientName && (
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <p className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2.5 py-0.5 font-semibold text-emerald-800">
                        <Check className="h-4 w-4 shrink-0" strokeWidth={3} />
                        Verified Recipient: {recipientName}
                      </p>
                      {!recipientSaved && (
                        <button
                          type="button"
                          onClick={saveRecipient}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-bronze/70 underline-offset-4 hover:underline"
                        >
                          <BookmarkPlus className="h-3.5 w-3.5" /> Save contact
                        </button>
                      )}
                    </div>
                  )}
                  {lookupStatus === 'notfound' && <p className="text-red-600">Account not found</p>}
                  {lookupStatus === 'error' && (
                    <p className="text-red-600">
                      Could not verify this number.{' '}
                      <button type="button" onClick={() => void recipientQuery.refetch()} className="font-semibold underline underline-offset-4">
                        Try again
                      </button>
                    </p>
                  )}
                </div>
              </div>

              {/* Amount */}
              <div>
                <Label htmlFor="amount">
                  Amount (USDC) <RequiredMark />
                </Label>
                <div className="relative">
                  <Input
                    id="amount"
                    required
                    aria-required="true"
                    inputMode="decimal"
                    autoComplete="off"
                    placeholder="0.00"
                    value={amountInput}
                    onChange={(e) => setAmountInput(maskAmount(e.target.value))}
                    disabled={sending}
                    aria-invalid={overBalance}
                    className={cn(
                      'h-24 rounded-3xl pr-24 text-5xl font-extrabold tabular-nums tracking-tight',
                      overBalance && 'border-red-300 bg-red-50/50 text-red-700 focus:border-red-400 focus:ring-red-200/60',
                    )}
                  />
                  <button
                    type="button"
                    onClick={setMax}
                    disabled={sending || balance === undefined}
                    className="absolute right-3 top-1/2 h-9 -translate-y-1/2 rounded-full bg-bronze/10 px-4 text-sm font-bold text-bronze transition hover:bg-bronze/20 disabled:opacity-40"
                  >
                    Max
                  </button>
                </div>
                <p className={cn('mt-2 h-5 text-sm font-medium', overBalance ? 'text-red-600' : 'text-bronze/55')}>
                  {overBalance ? 'That is more than your available balance.' : 'Max keeps a little back for network fees.'}
                </p>
              </div>

              {/* Message */}
              <div>
                <Label htmlFor="note">
                  What is this for? <RequiredMark />
                </Label>
                <Textarea
                  id="note"
                  required
                  aria-required="true"
                  rows={3}
                  placeholder="LAUTECH school fees"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  disabled={sending}
                  className="rounded-3xl"
                />
                <p
                  className={cn(
                    'mt-1 text-right text-xs font-medium tabular-nums',
                    noteOk ? 'text-bronze/55' : 'text-red-600',
                  )}
                >
                  {noteBytes(note)}/{NOTE_MAX_BYTES}
                </p>
              </div>
            </div>


            <AnimatePresence initial={false}>
              {showInvite && (
                <motion.div
                  key="not-on-arcpay"
                  initial={{ opacity: 0, height: 0, y: -8 }}
                  animate={{ opacity: 1, height: 'auto', y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-5 overflow-hidden"
                >
                  <Alert variant="warning">
                    <AlertTriangle aria-hidden="true" />
                    <div>
                      <AlertTitle>Not on ArcPay yet</AlertTitle>
                      <AlertDescription className="mt-1">
                        This phone number isn&apos;t on ArcPay yet. Send them an invite link to claim their wallet first.
                      </AlertDescription>
                      <button
                        type="button"
                        onClick={() => void recipientQuery.refetch()}
                        className="mt-2 text-sm font-semibold text-amber-800 underline underline-offset-4"
                      >
                        They already signed up? Try again
                      </button>
                    </div>
                  </Alert>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Send button morphs into a spinner */}
            <div className="mt-8 flex flex-col items-center">
              <motion.button
                layout
                type={showInvite ? 'button' : 'submit'}
                onClick={showInvite ? inviteViaWhatsApp : undefined}
                aria-busy={sending}
                aria-label={sending ? 'Sending' : showInvite ? 'Invite via WhatsApp' : 'Send USDC'}
                disabled={showInvite ? !inviteUrl : !sending && !formValid}
                transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                style={{ borderRadius: 9999 }}
                className={cn(
                  buttonVariants({ size: 'xl' }),
                  'disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none disabled:hover:brightness-100',
                  // pointer-events-none on disabled would hide the not-allowed cursor
                  'disabled:pointer-events-auto',
                  sending && '!w-16 !px-0',
                  sending && 'pointer-events-none disabled:opacity-100',
                )}
              >
                {sending ? (
                  <motion.span layout="position" className="grid place-items-center">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </motion.span>
                ) : (
                  <motion.span layout="position" className="inline-flex items-center gap-2">
                    {showInvite ? (
                      <>
                        <MessageCircle className="h-5 w-5" /> Invite via WhatsApp
                      </>
                    ) : (
                      'Send USDC'
                    )}
                  </motion.span>
                )}
              </motion.button>
              <p className="mt-3 h-5 text-sm font-medium text-bronze/65" aria-live="polite">
                {sending ? STEP_LABEL[step] : ''}
              </p>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

    </div>

      {address && (
        <PortfolioSheet
          open={walletOpen}
          onOpenChange={setWalletOpen}
          address={address}
          usdcBalance={usdcNumber}
          balanceLoading={balanceLoading}
          currency={currency}
        />
      )}
      <AddressBookDialog
        open={bookOpen}
        onOpenChange={setBookOpen}
        contacts={contacts}
        onSelect={useContact}
        onRemove={(n) => updateContacts(contacts.filter((c) => c.national !== n))}
      />
    </>
  )
}

/**
 * Nothing renders until the identity is fully resolved: wagmi has finished restoring the wallet AND a saved
 * profile belongs to that wallet. While that is pending we hold on a full-screen loader, never the dashboard.
 */
export default function SendDashboard() {
  const session = useSenderSession()
  if (session.settling) return <PageLoader label="Restoring your session" />
  if (!session.active || !session.profile) return <Navigate to="/send" replace />
  return (
    <PageTransition>
      <Dashboard profile={session.profile} />
    </PageTransition>
  )
}

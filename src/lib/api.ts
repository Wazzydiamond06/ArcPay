import { isAddress, type Address } from 'viem'

export class LookupError extends Error {}
/** The phone number has not created an ArcPay account yet (API answered 404). */
export class NotRegisteredError extends LookupError {}

export interface Recipient {
  /** Used only to build the transaction. Never rendered. */
  address: Address
  firstName: string
  lastName: string
}

/**
 * "Name enquiry": ask the ArcPay API who owns a Nigerian phone number.
 * Returns the legal name to show the sender, plus the wallet used for the transfer.
 */
export async function lookupRecipient(national: string): Promise<Recipient> {
  let res: Response
  try {
    res = await fetch('/api/wallet/lookup', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ phone: `+234${national}` }),
    })
  } catch {
    throw new LookupError('Could not reach ArcPay. Check your connection and try again.')
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string }
    if (res.status === 404) throw new NotRegisteredError(body.message ?? 'Wallet address not found for this number')
    throw new LookupError(body.message ?? 'We could not look up that number. Please try again.')
  }

  const data = (await res.json()) as { walletAddress?: unknown; firstName?: unknown; lastName?: unknown }
  if (
    typeof data.walletAddress !== 'string' ||
    !isAddress(data.walletAddress) ||
    typeof data.firstName !== 'string' ||
    typeof data.lastName !== 'string' ||
    !data.firstName.trim() ||
    !data.lastName.trim()
  ) {
    throw new LookupError('We could not verify the recipient name for that number.')
  }
  return { address: data.walletAddress, firstName: data.firstName.trim(), lastName: data.lastName.trim() }
}

/* ------------------------------------------------------------------ */
/* Receiver authentication                                             */
/* ------------------------------------------------------------------ */

/** `code` is the API error code, e.g. "bvn_in_use", "phone_exists", or "network". */
export class ApiError extends Error {
  constructor(
    public code: string,
    message?: string,
  ) {
    super(message ?? code)
  }
}

async function post<T>(path: string, body: unknown): Promise<T> {
  let res: Response
  try {
    res = await fetch(`/api${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch {
    throw new ApiError('network')
  }
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string }
    throw new ApiError(data.error ?? 'server')
  }
  return (await res.json()) as T
}

/** Registered names for sender wallets, keyed by lowercase wallet. Wallets with no name are simply absent. */
export async function fetchSenderNames(wallets: string[]): Promise<Record<string, string>> {
  const data = await post<{ names: Record<string, string> }>('/receiver/sender-names', { wallets })
  return data.names
}

/** Is this wallet already a registered sender? When it is, the saved display name comes back with it. */
export async function checkSender(wallet: string): Promise<{ exists: boolean; displayName?: string }> {
  return post('/auth/check-sender', { wallet })
}

export async function registerSender(wallet: string, displayName: string): Promise<void> {
  await post('/auth/register-sender', { wallet, displayName })
}

export type PhoneStatus = 'new' | 'returning'

export interface AccountName {
  firstName: string
  lastName: string
}

/** First onboarding screen: does this phone number already have an account? */
export async function verifyPhone(national: string): Promise<PhoneStatus> {
  const data = await post<{ status: PhoneStatus }>('/auth/verify-phone', { phone: `+234${national}` })
  return data.status
}

/** Returning user, after the OTP step. (The code check is mocked: any 4 digits pass.) */
export function loginWithOtp(national: string, code: string): Promise<AccountName> {
  return post<AccountName>('/auth/login', { phone: `+234${national}`, code })
}

/** New user: create the account (wallet + saved row). The BVN is hashed on the server. */
export function registerAccount(input: { national: string; firstName: string; lastName: string; bvn: string }): Promise<AccountName> {
  return post<AccountName>('/auth/register', {
    phone: `+234${input.national}`,
    firstName: input.firstName,
    lastName: input.lastName,
    bvn: input.bvn,
  })
}

export function describeApiError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === 'network') return 'Could not reach ArcPay. Check your connection and try again.'
    if (error.code === 'bvn_in_use') return 'This BVN is already linked to another ArcPay account.'
    if (error.code === 'phone_exists') return 'This phone number already has an account. Please log in.'
    if (error.code === 'invalid_bvn') return 'Enter a valid 11-digit BVN.'
    if (error.code === 'bvn_unverified') return 'We could not verify that BVN. Check the number and try again.'
  }
  return 'Something went wrong. Please try again.'
}

/* ------------------------------------------------------------------ */
/* Sender transaction history                                          */
/* ------------------------------------------------------------------ */

export interface TransferRecord {
  id: string
  receiverPhone: string
  recipientName: string | null
  /** USDC, decimal string such as "25.000000" */
  amount: string
  message: string
  status: string
  createdAt: string
  txHash: string | null
}

/** Save a confirmed transfer. The server re-reads it from the chain before storing it. */
export async function recordTransaction(txHash: string, senderName: string): Promise<void> {
  await post<{ id: string | null }>('/transactions', { txHash, senderName })
}

export async function fetchTransactions(wallet: string): Promise<TransferRecord[]> {
  let res: Response
  try {
    res = await fetch(`/api/transactions?wallet=${encodeURIComponent(wallet)}`)
  } catch {
    throw new ApiError('network')
  }
  if (!res.ok) throw new ApiError('server')
  const data = (await res.json()) as { transactions: TransferRecord[] }
  return data.transactions
}

/* ------------------------------------------------------------------ */
/* Receiver dashboard: unread alerts and mock withdrawals              */
/* ------------------------------------------------------------------ */

export interface UnreadTransfer {
  id: string
  amount: string
  message: string
  senderName: string | null
  /** The sender's wallet, used only to generate their avatar. Never shown as text. */
  senderWallet: string
  createdAt: string
}

/** A saved mock cash-out. Same table as deposits, told apart by `type`. */
export interface WithdrawalRecord {
  id: string
  type: 'withdrawal'
  /** USDC, decimal string */
  amount: string
  message: string
  createdAt: string
}

export interface WithdrawResult {
  withdrawnUsdc: string
  transaction: WithdrawalRecord
}

export interface ReceiverState {
  /** USDC already "withdrawn" to a bank (mock), decimal string */
  withdrawnUsdc: string
  withdrawals: WithdrawalRecord[]
  unread: UnreadTransfer[]
}

export async function fetchReceiverState(national: string): Promise<ReceiverState> {
  let res: Response
  try {
    res = await fetch(`/api/receiver/state?phone=${encodeURIComponent(`+234${national}`)}`)
  } catch {
    throw new ApiError('network')
  }
  if (!res.ok) throw new ApiError(res.status === 404 ? 'not_registered' : 'server')
  return (await res.json()) as ReceiverState
}

export async function markTransfersRead(national: string, ids: string[]): Promise<void> {
  await post<{ marked: number }>('/receiver/mark-read', { phone: `+234${national}`, ids })
}

/** Records a mock withdrawal. Resolves with the new total withdrawn. */
export async function resolveBank(national: string, bankCode: string, accountNumber: string): Promise<{ accountName: string }> {
  let res: Response
  try {
    res = await fetch('/api/wallet/resolve-bank', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ phone: `+234${national}`, account_number: accountNumber, bank_code: bankCode }),
    })
  } catch {
    throw new ApiError('network', 'Could not reach ArcPay. Check your connection and try again.')
  }
  const data = (await res.json().catch(() => ({}))) as { accountName?: string; message?: string; error?: string }
  if (!res.ok || typeof data.accountName !== 'string') {
    throw new ApiError(data.error ?? 'server', data.message ?? 'We could not verify this account. Please try again.')
  }
  return { accountName: data.accountName }
}

export async function withdrawUsdc(
  national: string,
  amount: string,
  bankCode: string,
  accountNumber: string,
): Promise<WithdrawResult> {
  let res: Response
  try {
    res = await fetch('/api/receiver/withdraw', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ phone: `+234${national}`, amount, account_number: accountNumber, bank_code: bankCode }),
    })
  } catch {
    throw new ApiError('network', 'Could not reach ArcPay. Check your connection and try again.')
  }
  const data = (await res.json().catch(() => ({}))) as Partial<WithdrawResult> & { message?: string; error?: string }
  if (!res.ok || typeof data.withdrawnUsdc !== 'string' || !data.transaction) {
    throw new ApiError(data.error ?? 'server', data.message ?? 'The withdrawal could not be saved. Please try again.')
  }
  return { withdrawnUsdc: data.withdrawnUsdc, transaction: data.transaction }
}

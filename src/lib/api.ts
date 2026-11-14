import { isAddress, type Address } from 'viem'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export class LookupError extends Error {}
export class NotRegisteredError extends LookupError {}

export interface Recipient {
  address: Address
  firstName: string
  lastName: string
}

export async function lookupRecipient(national: string): Promise<Recipient> {
  const { data, error } = await supabase
    .from('users')
    .select('first_name, last_name, arc_wallet_address')
    .eq('phone_number', national)
    .single()

  if (error || !data) {
    throw new NotRegisteredError('Phone number not registered yet. Please check the number.')
  }

  const mockWallet = data.arc_wallet_address && isAddress(data.arc_wallet_address)
    ? data.arc_wallet_address
    : '0x1234567890123456789012345678901234567890'

  return {
    address: mockWallet as Address,
    firstName: data.first_name.trim(),
    lastName: data.last_name.trim()
  }
}

export class ApiError extends Error {
  constructor(public code: string, message?: string) {
    super(message ?? code)
  }
}

export function describeApiError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === 'network') return 'Could not reach ArcPay. Check your connection and try again.'
    if (error.code === 'bvn_in_use') return 'This BVN is already linked to another ArcPay account.'
    if (error.code === 'phone_exists') return 'This phone number already has an account. Please log in.'
    if (error.code === 'wallet_exists') return 'This wallet is already registered. Please login.'
    if (error.code === 'invalid_bvn') return 'Enter a valid 11-digit BVN.'
    if (error.code === 'bvn_unverified') return 'We could not verify that BVN. Check the number and try again.'
  }
  return (error as any)?.message || 'Something went wrong. Please try again.'
}

export async function checkSender(wallet: string): Promise<{ exists: boolean; displayName?: string }> {
  const { data, error } = await supabase
    .from('users')
    .select('first_name, last_name')
    .eq('arc_wallet_address', wallet.toLowerCase())
    .single()

  if (error || !data) return { exists: false }
  return { exists: true, displayName: `${data.first_name} ${data.last_name}`.trim() }
}

export async function registerSender(wallet: string, displayName: string): Promise<void> {
  const [firstName, ...rest] = displayName.trim().split(' ')
  const lastName = rest.join(' ') || ''

  const { error } = await supabase
    .from('users')
    .insert([{ arc_wallet_address: wallet.toLowerCase(), first_name: firstName, last_name: lastName }])

  if (error) {
    if (error.code === '23505') throw new ApiError('wallet_exists')
    throw new ApiError('server', error.message)
  }
}

export async function fetchSenderNames(wallets: string[]): Promise<Record<string, string>> {
  if (!wallets || wallets.length === 0) return {}
  const { data, error } = await supabase
    .from('users')
    .select('arc_wallet_address, first_name, last_name')
    .in('arc_wallet_address', wallets.map(w => w.toLowerCase()))

  if (error || !data) return {}
  return data.reduce((acc, user) => {
    acc[user.arc_wallet_address.toLowerCase()] = `${user.first_name} ${user.last_name}`.trim()
    return acc
  }, {} as Record<string, string>)
}

export type PhoneStatus = 'new' | 'returning'

export interface AccountName {
  firstName: string
  lastName: string
}

export async function verifyPhone(national: string): Promise<PhoneStatus> {
  const { data, error } = await supabase
    .from('users')
    .select('phone_number')
    .eq('phone_number', national)
    .single()

  if (error || !data) return 'new'
  return 'returning'
}

export async function loginWithOtp(national: string, code: string): Promise<AccountName> {
  const { data, error } = await supabase
    .from('users')
    .select('first_name, last_name')
    .eq('phone_number', national)
    .single()

  if (error || !data) throw new ApiError('server', 'Account not found')
  return { firstName: data.first_name, lastName: data.last_name }
}

export async function registerAccount(input: { national: string; firstName: string; lastName: string; bvn: string }): Promise<AccountName> {
  const { data, error } = await supabase
    .from('users')
    .insert([{
      phone_number: input.national,
      first_name: input.firstName.trim(),
      last_name: input.lastName.trim(),
      bvn_hash: input.bvn
    }])
    .select('first_name, last_name')
    .single()

  if (error) {
    if (error.code === '23505') throw new ApiError('phone_exists')
    throw new ApiError('server', error.message)
  }

  if (!data) throw new ApiError('server', 'Failed to register account')
  return { firstName: data.first_name, lastName: data.last_name }
}

export interface TransferRecord {
  id: string
  receiverPhone: string
  recipientName: string | null
  amount: string
  message: string
  status: string
  createdAt: string
  txHash: string | null
}

export async function recordTransaction(txHash: string, senderName: string): Promise<void> {
  console.log('Mock recording transaction hash:', txHash, senderName)
}

export async function fetchTransactions(wallet: string): Promise<TransferRecord[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('sender_wallet', wallet.toLowerCase())
    .order('created_at', { ascending: false })

  if (error) throw new ApiError('server', error.message)

  return (data || []).map(tx => ({
    id: tx.id,
    receiverPhone: tx.receiver_phone || '',
    recipientName: null,
    amount: tx.amount || '0',
    message: tx.message || '',
    status: 'completed',
    createdAt: tx.created_at,
    txHash: tx.tx_hash
  }))
}

export interface UnreadTransfer {
  id: string
  amount: string
  message: string
  senderName: string | null
  senderWallet: string
  createdAt: string
}

export interface WithdrawalRecord {
  id: string
  type: 'withdrawal'
  amount: string
  message: string
  createdAt: string
}

export interface WithdrawResult {
  withdrawnUsdc: string
  transaction: WithdrawalRecord
}

export interface ReceiverState {
  withdrawnUsdc: string
  withdrawals: WithdrawalRecord[]
  unread: UnreadTransfer[]
}

export async function fetchReceiverState(national: string): Promise<ReceiverState> {
  const { data: withdrawals } = await supabase
    .from('transactions')
    .select('*')
    .eq('receiver_phone', national)
    .eq('type', 'withdrawal')
    .order('created_at', { ascending: false })

  const { data: unread } = await supabase
    .from('transactions')
    .select('*')
    .eq('receiver_phone', national)
    .eq('type', 'deposit')
    .eq('is_read_by_receiver', false)
    .order('created_at', { ascending: false })

  let withdrawnTotal = 0n
  const wRecords: WithdrawalRecord[] = []

  if (withdrawals) {
    withdrawals.forEach((tx) => {
      withdrawnTotal += BigInt(tx.amount || 0)
      wRecords.push({
        id: tx.id,
        type: 'withdrawal',
        amount: String(tx.amount),
        message: tx.message || '',
        createdAt: tx.created_at
      })
    })
  }

  const uRecords: UnreadTransfer[] = (unread || []).map(tx => ({
    id: tx.id,
    amount: String(tx.amount),
    message: tx.message || '',
    senderName: null,
    senderWallet: tx.sender_wallet || '',
    createdAt: tx.created_at
  }))

  return {
    withdrawnUsdc: withdrawnTotal.toString(),
    withdrawals: wRecords,
    unread: uRecords
  }
}

export async function markTransfersRead(national: string, ids: string[]): Promise<void> {
  if (!ids || ids.length === 0) return
  await supabase
    .from('transactions')
    .update({ is_read_by_receiver: true })
    .in('id', ids)
}

export async function resolveBank(national: string, bankCode: string, accountNumber: string): Promise<{ accountName: string }> {
  await new Promise(resolve => setTimeout(resolve, 1000));
  if (accountNumber.length < 10) {
    throw new ApiError('server', 'Account number must be 10 digits.');
  }
  return { accountName: "Verified Hackathon Account" };
}

export async function withdrawUsdc(
  national: string,
  amount: string,
  bankCode: string,
  accountNumber: string,
): Promise<WithdrawResult> {
  await new Promise(resolve => setTimeout(resolve, 1000));

  const { data, error } = await supabase
    .from('transactions')
    .insert([{
      receiver_phone: national,
      amount: amount,
      type: 'withdrawal',
      message: `Withdrawal to ${bankCode} / ${accountNumber}`,
      sender_wallet: '0x0000000000000000000000000000000000000000'
    }])
    .select()
    .single()

  if (error || !data) {
    console.error(error);
    throw new ApiError('server', 'The withdrawal could not be saved to the database.');
  }

  return {
    withdrawnUsdc: amount,
    transaction: {
      id: data.id,
      type: 'withdrawal',
      amount: String(data.amount),
      message: data.message,
      createdAt: data.created_at
    }
  }
}

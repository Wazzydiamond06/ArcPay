import { arcTestnet } from 'viem/chains'
import { BaseError, ContractFunctionRevertedError, InsufficientFundsError, type Address } from 'viem'
import { WALLET_REJECTED_MESSAGE } from '@/lib/wallet'
import { getUsdc } from '@/onchain-facts'

export const ARC_CHAIN_ID = arcTestnet.id

const usdcFact = getUsdc(ARC_CHAIN_ID)
if (!usdcFact) throw new Error('USDC is not registered for Arc Testnet')
export const USDC_ADDRESS = usdcFact.address as Address

/** ArcPayRemit contract, set via VITE_ARCPAY_CONTRACT in .env */
export const REMIT_ADDRESS = import.meta.env.VITE_ARCPAY_CONTRACT as Address

export const NOTE_MAX_BYTES = 140

export const remitAbi = [
  {
    type: 'function',
    name: 'remit',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'note', type: 'string' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'recordCount',
    stateMutability: 'view',
    inputs: [{ name: 'to', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'recordsOf',
    stateMutability: 'view',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'offset', type: 'uint256' },
      { name: 'limit', type: 'uint256' },
    ],
    outputs: [
      {
        name: '',
        type: 'tuple[]',
        components: [
          { name: 'from', type: 'address' },
          { name: 'timestamp', type: 'uint64' },
          { name: 'amount', type: 'uint256' },
          { name: 'note', type: 'string' },
        ],
      },
    ],
  },
  { type: 'error', name: 'ZeroTokenAddress', inputs: [] },
  { type: 'error', name: 'ZeroRecipient', inputs: [] },
  { type: 'error', name: 'ZeroAmount', inputs: [] },
  { type: 'error', name: 'NoteTooLong', inputs: [] },
] as const

/* ------------------------------------------------------------------ */
/* Mock phone registry (Nigerian numbers -> Arc EVM addresses)         */
/* ------------------------------------------------------------------ */

/** Reduce any typed Nigerian number to its 10 national digits (e.g. 8031234567). */
export function nationalDigits(input: string): string {
  let digits = input.replace(/\D/g, '')
  if (digits.startsWith('234')) digits = digits.slice(3)
  if (digits.startsWith('0')) digits = digits.slice(1)
  return digits.slice(0, 10)
}

function group(digits: string, sizes: number[]): string {
  const parts: string[] = []
  let i = 0
  for (const size of sizes) {
    if (i >= digits.length) break
    parts.push(digits.slice(i, i + size))
    i += size
  }
  return parts.join(' ')
}

/**
 * Live-format a Nigerian number as the user types.
 * "+234 803 123 4567" for international input, "0803 123 4567" for local (080/090/070...).
 */
export function formatPhoneInput(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  const international = raw.trim().startsWith('+') || digits.startsWith('234')
  if (international) {
    if (digits.length <= 3 && '234'.startsWith(digits)) return digits ? `+${digits}` : '+'
    const national = (digits.startsWith('234') ? digits.slice(3) : digits).slice(0, 10)
    return national ? `+234 ${group(national, [3, 3, 4])}` : '+234'
  }
  return group(digits.slice(0, 11), [4, 3, 4])
}

export function isValidNgNumber(national: string): boolean {
  return /^[789]\d{9}$/.test(national)
}

export function formatPhone(national: string): string {
  const a = national.slice(0, 3)
  const b = national.slice(3, 6)
  const c = national.slice(6, 10)
  return ['+234', a, b, c].filter(Boolean).join(' ')
}

export function maskPhone(national: string): string {
  return `+234 ${national.slice(0, 3)} ••• ${national.slice(6, 10)}`
}

export { registryAddress } from '@/lib/registry'

/* ------------------------------------------------------------------ */
/* Formatting                                                          */
/* ------------------------------------------------------------------ */

/** Insert thousands separators into a plain digit string: "2500" -> "2,500". */
export function groupThousands(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

/**
 * Strict USDC amount mask: digits and one dot only, thousands commas, at most two decimals.
 * "1000" -> "1,000", "12.345" -> "12.34", ".5" -> "0.5".
 */
export function maskAmount(input: string): string {
  const cleaned = input.replace(/[^\d.]/g, '')
  const dot = cleaned.indexOf('.')
  let int = (dot === -1 ? cleaned : cleaned.slice(0, dot)).slice(0, 12)
  const dec = dot === -1 ? null : cleaned.slice(dot + 1).replace(/\./g, '').slice(0, 2)
  int = int.replace(/^0+(?=\d)/, '')
  if (int === '' && dec !== null) int = '0'
  const grouped = groupThousands(int)
  return dec === null ? grouped : `${grouped}.${dec}`
}

/** Masked display value -> plain decimal string for the transaction ("1,000." -> "1000"). */
export function amountToPayload(masked: string): string {
  const plain = masked.replace(/,/g, '')
  return plain.endsWith('.') ? plain.slice(0, -1) : plain
}

export function noteBytes(note: string): number {
  return new TextEncoder().encode(note).length
}

export function timeAgo(unixSeconds: number): string {
  const diff = Math.max(0, Math.floor(Date.now() / 1000) - unixSeconds)
  if (diff < 60) return 'Just now'
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`
  return new Date(unixSeconds * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

/** Turn a wallet / contract failure into the real reason, in plain words. */
/** Text of an error and everything it wraps, lower-cased, for matching wallet failures. */
function errorChainText(error: unknown): string {
  const text = (value: unknown) => (typeof value === 'string' || typeof value === 'number' ? String(value) : '')
  const parts: string[] = []
  let current: unknown = error
  for (let depth = 0; depth < 6 && current && typeof current === 'object'; depth++) {
    const e = current as { name?: unknown; message?: unknown; shortMessage?: unknown; code?: unknown; cause?: unknown }
    parts.push(text(e.name), text(e.message), text(e.shortMessage), `code ${text(e.code)}`)
    current = e.cause
  }
  return parts.join(' ').toLowerCase()
}

/** EIP-1193: 4001 user rejected, 4100 unauthorized, 4900/4901 disconnected. */
function isWalletRefusal(error: unknown): boolean {
  const text = errorChainText(error)
  return (
    /code (4001|4100|4900|4901)\b/.test(text) ||
    text.includes('user rejected') ||
    text.includes('user denied') ||
    text.includes('rejected the request') ||
    text.includes('not been authorized') ||
    text.includes('connector not connected') ||
    text.includes('provider is disconnected') ||
    text.includes('walletautherror')
  )
}

/** Turn a wallet / contract failure into the real reason, in plain words. */
export function describeTxError(error: unknown): { message: string; silent: boolean } {
  if (isWalletRefusal(error)) return { message: WALLET_REJECTED_MESSAGE, silent: false }

  if (error instanceof BaseError) {
    if (error.walk((e) => e instanceof InsufficientFundsError)) {
      return { message: 'Insufficient gas. Keep a little USDC in your wallet to pay the network fee.', silent: false }
    }
    const revert = error.walk((e) => e instanceof ContractFunctionRevertedError)
    if (revert instanceof ContractFunctionRevertedError) {
      const name = revert.data?.errorName
      if (name === 'ZeroAmount') return { message: 'The amount must be more than zero.', silent: false }
      if (name === 'ZeroRecipient') return { message: 'The recipient wallet is invalid for this number.', silent: false }
      if (name === 'NoteTooLong') return { message: 'Your message is too long (140 bytes maximum).', silent: false }
      if (revert.reason) return { message: describeRevertReason(revert.reason), silent: false }
    }
    const text = `${error.shortMessage} ${error.details ?? ''}`.toLowerCase()
    if (text.includes('exceeds the balance') || text.includes('insufficient funds') || text.includes('gas required exceeds')) {
      return { message: 'Insufficient gas. Keep a little USDC in your wallet to pay the network fee.', silent: false }
    }
    if (text.includes('chain') && text.includes('mismatch')) {
      return { message: 'Your wallet is on the wrong network. Switch to Arc Testnet and try again.', silent: false }
    }
    if (text.includes('http request failed') || text.includes('timed out') || text.includes('network')) {
      return { message: 'Network issue while talking to Arc Testnet. Please try again.', silent: false }
    }
    return { message: describeRevertReason(error.shortMessage), silent: false }
  }
  if (error instanceof Error && error.message) return { message: describeRevertReason(error.message), silent: false }
  return { message: 'The transaction failed for an unknown reason. Please try again.', silent: false }
}

function describeRevertReason(reason: string): string {
  const text = reason.toLowerCase()
  if (text.includes('exceeds allowance')) return 'USDC spending approval is too low for this amount. Please try again.'
  if (text.includes('exceeds balance')) return 'Insufficient USDC balance for this amount.'
  if (text.includes('blacklist')) return 'This wallet cannot send USDC right now.'
  return reason.length > 160 ? `${reason.slice(0, 157)}…` : reason
}

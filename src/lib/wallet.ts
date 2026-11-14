import type { Address } from 'viem'

export const WALLET_REJECTED_MESSAGE = 'Action rejected by wallet. Please ensure your wallet is connected and try again.'

/** The wallet is not connected, not authorized for this site, or the user declined to authorize it. */
export class WalletAuthError extends Error {
  constructor(message = WALLET_REJECTED_MESSAGE) {
    super(message)
    this.name = 'WalletAuthError'
  }
}

interface Eip1193Provider {
  request: (args: { method: string }) => Promise<unknown>
}

interface ConnectorLike {
  getProvider: () => Promise<unknown>
}

const asAccounts = (value: unknown): string[] => (Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [])

/**
 * Make sure the wallet still has this site authorized right before a transaction.
 * Browser wallets can drop the permission (error 4100) while wagmi still shows "connected",
 * so ask the wallet directly: `eth_accounts` is silent, and `eth_requestAccounts` re-prompts if it is empty.
 * Returns the account to sign with.
 */
export async function ensureWalletAuthorized(connector: ConnectorLike | undefined, expected: Address): Promise<Address> {
  if (!connector) throw new WalletAuthError()

  const provider = (await connector.getProvider().catch(() => null)) as Eip1193Provider | null
  if (!provider || typeof provider.request !== 'function') throw new WalletAuthError()

  let accounts = asAccounts(await provider.request({ method: 'eth_accounts' }).catch(() => []))
  if (accounts.length === 0) {
    // Authorization was lost: ask again. A rejection here is a WalletAuthError for the caller to show.
    accounts = asAccounts(await provider.request({ method: 'eth_requestAccounts' }).catch(() => []))
  }
  if (accounts.length === 0) throw new WalletAuthError()

  const match = accounts.find((a) => a.toLowerCase() === expected.toLowerCase())
  if (!match) throw new WalletAuthError('Your wallet switched to a different account. Please reconnect and try again.')
  return match as Address
}

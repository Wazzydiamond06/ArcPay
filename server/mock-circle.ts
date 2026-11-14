/**
 * Mock of Circle Programmable Wallets (developer-controlled) wallet creation.
 * Returns a Circle-shaped wallet object. No Circle API is called and no keys exist.
 * Replace with `initiateDeveloperControlledWalletsClient(...).createWallets(...)` once an API key
 * and entity secret are configured.
 */
import { registryAddress } from '../src/lib/registry'

export interface MockCircleWallet {
  id: string
  address: string
  blockchain: 'ARC-TESTNET'
  accountType: 'EOA'
  state: 'LIVE'
  refId: string
}

export async function createDeveloperControlledWallet(nationalDigits: string): Promise<MockCircleWallet> {
  await new Promise((r) => setTimeout(r, 250)) // network latency
  return {
    id: crypto.randomUUID(),
    address: registryAddress(nationalDigits),
    blockchain: 'ARC-TESTNET',
    accountType: 'EOA',
    state: 'LIVE',
    refId: `+234${nationalDigits}`,
  }
}

import { getAddress, keccak256, toHex, type Address } from 'viem'

/**
 * Demo wallet derivation shared by the browser and the API server.
 * Every valid Nigerian mobile number (10 national digits) maps to exactly one Arc address.
 * Nobody holds a key for these addresses, so payouts to a bank are simulated.
 */
export function registryAddress(national: string): Address {
  const hash = keccak256(toHex(`arcpay.registry.v1:+234${national}`))
  return getAddress(`0x${hash.slice(-40)}`)
}

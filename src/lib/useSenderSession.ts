import { useAccount } from 'wagmi'
import { loadSenderProfile, type SenderProfile } from '@/lib/sender'

/**
 * A returning sender: the wallet is connected again from a previous session (wagmi reconnects it
 * on page load) AND a saved profile belongs to that same wallet.
 */
export function useSenderSession(): { settling: boolean; active: boolean; profile: SenderProfile | null } {
  const { address, isConnected, status } = useAccount()
  const profile = loadSenderProfile()
  const active = Boolean(
    isConnected && address && profile && profile.address.toLowerCase() === address.toLowerCase(),
  )
  // While wagmi is restoring the previous connection we cannot tell yet.
  const settling = status === 'connecting' || status === 'reconnecting'
  return { settling, active, profile }
}

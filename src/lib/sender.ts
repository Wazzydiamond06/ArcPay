/** Mock sender profile, stored in this browser only. */
export interface SenderProfile {
  displayName: string
  address: string
}

const KEY = 'arcpay.sender.v1'

export function loadSenderProfile(): SenderProfile | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as Partial<SenderProfile>
    if (typeof data.displayName === 'string' && data.displayName && typeof data.address === 'string') {
      return { displayName: data.displayName, address: data.address }
    }
    return null
  } catch {
    return null
  }
}

export function saveSenderProfile(profile: SenderProfile): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(profile))
  } catch {
    /* storage unavailable: the session lasts until reload */
  }
}

export function clearSenderProfile(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}

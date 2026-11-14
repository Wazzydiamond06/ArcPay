import { isValidNgNumber } from '@/lib/arcpay'

/** Mock receiver account, stored in this browser only. */
export interface ReceiverProfile {
  national: string
  firstName: string
  lastName: string
}

const KEY = 'arcpay.receiver.v2'

export function loadProfile(): ReceiverProfile | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as Partial<ReceiverProfile>
    if (
      typeof data.national === 'string' &&
      isValidNgNumber(data.national) &&
      typeof data.firstName === 'string' &&
      data.firstName &&
      typeof data.lastName === 'string' &&
      data.lastName
    ) {
      return { national: data.national, firstName: data.firstName, lastName: data.lastName }
    }
    return null
  } catch {
    return null
  }
}

export function saveProfile(profile: ReceiverProfile): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(profile))
  } catch {
    /* storage unavailable: the session lasts until reload */
  }
}

export function clearProfile(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}

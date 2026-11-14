import { isValidNgNumber } from '@/lib/arcpay'

/** A saved recipient: the 10-digit Nigerian number and the legal name shown when it was verified. */
export interface Contact {
  national: string
  name: string
}

const KEY = 'arcpay.addressbook.v1'

export function loadContacts(): Contact[] {
  try {
    const raw = localStorage.getItem(KEY)
    const data = raw ? (JSON.parse(raw) as unknown) : []
    if (!Array.isArray(data)) return []
    return data.filter(
      (c): c is Contact =>
        typeof c === 'object' &&
        c !== null &&
        typeof (c as Contact).national === 'string' &&
        isValidNgNumber((c as Contact).national) &&
        typeof (c as Contact).name === 'string',
    )
  } catch {
    return []
  }
}

export function saveContacts(contacts: Contact[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(contacts))
  } catch {
    /* storage unavailable */
  }
}

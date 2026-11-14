/** Splits a person's name into lowercase letter-only words, ignoring accents, punctuation and case. */
function nameWords(value: string): string[] {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/['’-]/g, '')
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
}

/**
 * First-party check for withdrawals: every word of the registered name (first and last) must appear as a
 * whole word in the bank account name. Extra words on the bank side (a middle name) are allowed;
 * word order and capitalisation do not matter.
 */
export function namesMatch(registeredName: string, bankAccountName: string): boolean {
  const registered = nameWords(registeredName)
  const bank = new Set(nameWords(bankAccountName))
  return registered.length > 0 && registered.every((word) => bank.has(word))
}

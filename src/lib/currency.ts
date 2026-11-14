export type Currency = 'USD' | 'EUR'

/** Mock display rate (EUR per 1 USD). Not a live market rate. */
export const EUR_PER_USD = 0.92

const KEY = 'arcpay.currency'

export const CURRENCY_SYMBOL: Record<Currency, string> = { USD: '$', EUR: '€' }

export function loadCurrency(): Currency {
  try {
    return localStorage.getItem(KEY) === 'EUR' ? 'EUR' : 'USD'
  } catch {
    return 'USD'
  }
}

export function saveCurrency(currency: Currency): void {
  try {
    localStorage.setItem(KEY, currency)
  } catch {
    /* storage unavailable */
  }
}

/** USDC is treated as 1 USD. */
export function fromUsd(usd: number, currency: Currency): number {
  return currency === 'EUR' ? usd * EUR_PER_USD : usd
}

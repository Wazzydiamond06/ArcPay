/**
 * ArcPay API. The Vite dev server proxies /api/* here and strips the /api prefix.
 *   POST /auth/verify-phone  { phone }                                 -> { status: 'new' | 'returning' }
 *   POST /auth/login         { phone, code }                           -> { firstName, lastName }   (returning users, after OTP)
 *   POST /auth/register      { phone, firstName, lastName, bvn }       -> { firstName, lastName }   (new users)
 *   POST /transactions       { txHash }                                -> saves a transfer after checking it on-chain
 *   GET  /transactions       ?wallet=0x...                             -> the sender's recent transfers
 *   GET  /receiver/state     ?phone=+234...                            -> { withdrawnUsdc, unread[] }
 *   POST /receiver/mark-read { phone, ids }                            -> marks alerts as read
 *   POST /receiver/withdraw  { phone, amount, account_number, bank_code } -> mock fiat withdrawal (persisted)
 *   POST /wallet/resolve-bank { phone, account_number, bank_code }      -> mock NUBAN name enquiry
 *   POST /wallet/lookup      { phone }                                 -> { walletAddress, firstName, lastName } | 404 not_registered
 * The OTP, the BVN provider and wallet creation are mocked: any 4-digit code passes, and a BVN must be 11 digits, pass the mock provider, and not already be linked to an account.
 */
import { createHmac } from 'node:crypto'
import { createPublicClient, erc20Abi, formatUnits, http, isAddress, parseAbiItem, parseEventLogs, parseUnits } from 'viem'
import { arcTestnet } from 'viem/chains'
import { getChain, getUsdc, USDC_DECIMALS } from '../src/onchain-facts'
import { verifyBvn } from './mock-bvn-provider'
import { createDeveloperControlledWallet } from './mock-circle'
import { findUserByPhone, migrate, sql } from './db'
import { namesMatch } from '../src/lib/names'

const PORT = 3001
const E164_NG = /^\+234([789]\d{9})$/
const PEPPER = process.env.BVN_PEPPER
if (!PEPPER) throw new Error('BVN_PEPPER is not set. Add a random secret to .env.')

const REMIT_ADDRESS = process.env.VITE_ARCPAY_CONTRACT?.toLowerCase()
if (!REMIT_ADDRESS) throw new Error('VITE_ARCPAY_CONTRACT is not set in .env.')
const remittanceEvent = parseAbiItem(
  'event Remittance(address indexed from, address indexed to, uint256 amount, string note)',
)

// RPC: the sandbox's keyed proxy when present, otherwise the public Arc Testnet endpoint (never logged).
const CHAIN_KEY = 'Arc_Testnet'
const rpcUrl =
  process.env[`RPC_URL_${CHAIN_KEY}`] ||
  (process.env.RPC_PROXY_BASE_URL && (process.env.RPC_PROXY_CHAINS || '').split(',').includes(CHAIN_KEY)
    ? `${process.env.RPC_PROXY_BASE_URL}/api/rpc/${CHAIN_KEY}?_rpc_token=${process.env.RPC_PROXY_TOKEN}`
    : getChain(arcTestnet.id)?.rpcUrls[0])
const chainClient = createPublicClient({ chain: arcTestnet, transport: http(rpcUrl) })

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

async function readBody(req: Request): Promise<Record<string, unknown> | null> {
  try {
    return (await req.json()) as Record<string, unknown>
  } catch {
    return null
  }
}

function parsePhone(value: unknown): { e164: string; national: string } | null {
  const match = typeof value === 'string' ? E164_NG.exec(value) : null
  return match ? { e164: `+234${match[1]}`, national: match[1] } : null
}

const bvnHash = (bvn: string) => createHmac('sha256', PEPPER).update(bvn).digest('hex')
const cleanName = (value: unknown) => (typeof value === 'string' ? value.trim() : '')
const NAME_OK = /^\p{L}[\p{L}' -]*$/u

async function verifyPhone(req: Request): Promise<Response> {
  const body = await readBody(req)
  const phone = parsePhone(body?.phone)
  if (!phone) return json({ error: 'Enter a valid Nigerian phone number' }, 400)
  const user = await findUserByPhone(phone.e164)
  return json({ status: user ? 'returning' : 'new' })
}

async function login(req: Request): Promise<Response> {
  const body = await readBody(req)
  const phone = parsePhone(body?.phone)
  if (!phone) return json({ error: 'Enter a valid Nigerian phone number' }, 400)
  if (typeof body?.code !== 'string' || !/^\d{4}$/.test(body.code)) return json({ error: 'invalid_code' }, 400)
  const user = await findUserByPhone(phone.e164)
  if (!user) return json({ error: 'not_registered' }, 404)
  return json({ firstName: user.first_name, lastName: user.last_name })
}

async function register(req: Request): Promise<Response> {
  const body = await readBody(req)
  const phone = parsePhone(body?.phone)
  if (!phone) return json({ error: 'Enter a valid Nigerian phone number' }, 400)
  const firstName = cleanName(body?.firstName)
  const lastName = cleanName(body?.lastName)
  if (firstName.length < 2 || lastName.length < 2 || !NAME_OK.test(firstName) || !NAME_OK.test(lastName)) {
    return json({ error: 'invalid_name' }, 400)
  }
  const bvn = typeof body?.bvn === 'string' ? body.bvn : ''
  if (!/^\d{11}$/.test(bvn)) return json({ error: 'invalid_bvn' }, 400)

  // Mocked third-party provider check, then store only a keyed hash of the BVN.
  const check = await verifyBvn(bvn)
  if (!check.verified) return json({ error: check.reason }, 422)

  const wallet = await createDeveloperControlledWallet(phone.national)
  try {
    await sql`
      insert into users (phone_number, first_name, last_name, bvn_hash, arc_wallet_address)
      values (${phone.e164}, ${firstName}, ${lastName}, ${bvnHash(bvn)}, ${wallet.address})`
  } catch (error) {
    const detail = `${(error as { constraint?: string }).constraint ?? ''} ${(error as Error).message}`
    if (detail.includes('bvn_hash')) return json({ error: 'bvn_in_use' }, 409)
    if (detail.includes('phone_number')) return json({ error: 'phone_exists' }, 409)
    console.error('register failed', error)
    return json({ error: 'Database error' }, 500)
  }
  return json({ firstName, lastName })
}

/** Find the wallet for a phone number. Numbers without an ArcPay account get 404. */
async function walletLookup(req: Request): Promise<Response> {
  const body = await readBody(req)
  const phone = parsePhone(body?.phone)
  if (!phone) return json({ error: 'invalid_phone', message: 'Enter a valid Nigerian phone number' }, 400)
  let user
  try {
    user = await findUserByPhone(phone.e164)
  } catch (error) {
    console.error('lookup failed', error)
    return json({ error: 'database', message: 'We could not reach the account database. Please try again in a moment.' }, 503)
  }
  if (!user) return json({ error: 'not_registered', message: 'Wallet address not found for this number' }, 404)
  return json({
    phone: phone.e164,
    walletAddress: user.arc_wallet_address,
    firstName: user.first_name,
    lastName: user.last_name,
  })
}

const TX_HASH = /^0x[0-9a-fA-F]{64}$/
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * Save a transfer the sender just made. The row is built from the on-chain Remittance event,
 * never from client-supplied amounts or names, so history cannot be faked.
 */
async function saveTransaction(req: Request): Promise<Response> {
  const body = await readBody(req)
  const txHash = typeof body?.txHash === 'string' ? body.txHash : ''
  if (!TX_HASH.test(txHash)) return json({ error: 'invalid_tx', message: 'Invalid transaction hash' }, 400)

  // Display name the sender chose in onboarding. Shown only on the receiver's alert.
  const senderName = typeof body?.senderName === 'string' ? body.senderName.trim().slice(0, 60) : ''

  const existing = await sql`select id from transactions where tx_hash = ${txHash.toLowerCase()} limit 1`
  if (existing[0]) return json({ id: existing[0].id, saved: false })

  let receipt
  for (let attempt = 0; attempt < 5 && !receipt; attempt++) {
    try {
      receipt = await chainClient.getTransactionReceipt({ hash: txHash as `0x${string}` })
    } catch {
      await sleep(800) // the node may not have indexed the receipt yet
    }
  }
  if (!receipt) return json({ error: 'tx_not_found', message: 'Transaction not found yet' }, 404)
  if (receipt.status !== 'success') return json({ error: 'tx_failed', message: 'Transaction failed' }, 422)

  const [event] = parseEventLogs({ abi: [remittanceEvent], logs: receipt.logs }).filter(
    (log) => log.address.toLowerCase() === REMIT_ADDRESS,
  )
  if (!event) return json({ error: 'not_a_transfer', message: 'No ArcPay transfer in this transaction' }, 422)

  const recipient = await sql`
    select phone_number from users where lower(arc_wallet_address) = ${event.args.to.toLowerCase()} limit 1`
  if (!recipient[0]) return json({ error: 'unknown_recipient', message: 'Recipient is not an ArcPay user' }, 422)

  const saved = await sql`
    insert into transactions (sender_wallet, receiver_phone, amount, message, status, tx_hash, sender_name)
    values (${event.args.from}, ${recipient[0].phone_number as string}, ${formatUnits(event.args.amount, USDC_DECIMALS)},
            ${event.args.note}, 'success', ${txHash.toLowerCase()}, ${senderName})
    on conflict (tx_hash) do nothing
    returning id`
  return json({ id: saved[0]?.id ?? null, saved: Boolean(saved[0]) }, saved[0] ? 201 : 200)
}

const usdcToken = getUsdc(arcTestnet.id)
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** What the receiver's dashboard needs on open: mock withdrawals so far and unread transfer alerts. */
async function receiverState(url: URL): Promise<Response> {
  const phone = parsePhone(url.searchParams.get('phone'))
  if (!phone) return json({ error: 'invalid_phone', message: 'Enter a valid Nigerian phone number' }, 400)
  const user = await findUserByPhone(phone.e164)
  if (!user) return json({ error: 'not_registered', message: 'Account not found' }, 404)

  // The sender's registered name wins: the senders table, then a users row owning that wallet,
  // then the name typed at the time of the transfer.
  const unread = await sql`
    select t.id, t.amount::text as amount, t.message, t.sender_wallet, t.created_at,
           coalesce(s.display_name, nullif(trim(u.first_name || ' ' || u.last_name), ''), nullif(t.sender_name, '')) as sender_name
    from transactions t
    left join senders s on s.wallet_address = lower(t.sender_wallet)
    left join users u on lower(u.arc_wallet_address) = lower(t.sender_wallet)
    where t.receiver_phone = ${phone.e164} and t.is_read_by_receiver = false and t.type = 'deposit'
    order by t.created_at desc
    limit 20`
  const withdrawals = await sql`
    select id, amount::text as amount, message, created_at
    from transactions
    where receiver_phone = ${phone.e164} and type = 'withdrawal'
    order by created_at desc
    limit 20`
  return json({
    withdrawnUsdc: String(user.withdrawn_usdc),
    withdrawals: withdrawals.map((r) => ({
      id: r.id,
      type: 'withdrawal' as const,
      amount: r.amount,
      message: r.message,
      createdAt: new Date(r.created_at as string).toISOString(),
    })),
    unread: unread.map((r) => ({
      id: r.id,
      amount: r.amount,
      message: r.message,
      senderName: r.sender_name || null,
      senderWallet: r.sender_wallet as string,
      createdAt: new Date(r.created_at as string).toISOString(),
    })),
  })
}

async function markRead(req: Request): Promise<Response> {
  const body = await readBody(req)
  const phone = parsePhone(body?.phone)
  if (!phone) return json({ error: 'invalid_phone' }, 400)
  const ids = Array.isArray(body?.ids) ? body.ids.filter((id): id is string => typeof id === 'string' && UUID.test(id)) : []
  await Promise.all(
    ids.map(
      (id) =>
        sql`update transactions set is_read_by_receiver = true where id = ${id}::uuid and receiver_phone = ${phone.e164}`,
    ),
  )
  return json({ marked: ids.length })
}

/**
 * Mock fiat withdrawal. No money leaves the chain: the amount is added to users.withdrawn_usdc and the
 * dashboard shows (on-chain balance - withdrawn). The server checks the amount against that available balance.
 */
async function withdraw(req: Request): Promise<Response> {
  const body = await readBody(req)
  const phone = parsePhone(body?.phone)
  if (!phone) return json({ error: 'invalid_phone', message: 'Enter a valid Nigerian phone number' }, 400)
  const amountText = typeof body?.amount === 'string' ? body.amount : ''
  if (!/^\d{1,12}(\.\d{1,2})?$/.test(amountText)) return json({ error: 'invalid_amount', message: 'Enter a valid amount' }, 400)
  const amount = parseUnits(amountText, USDC_DECIMALS)
  if (amount <= 0n) return json({ error: 'invalid_amount', message: 'Enter an amount above zero' }, 400)

  const bank = parseBankDetails(body)
  if (!bank) return json({ error: 'invalid_account', message: 'Choose a bank and enter a 10-digit account number' }, 400)

  const user = await findUserByPhone(phone.e164)
  if (!user) return json({ error: 'not_registered', message: 'Account not found' }, 404)

  // First-party only: the account name is re-resolved here, so the browser check cannot be bypassed.
  const accountName = await resolveBankAccount(bank.accountNumber, user)
  if (!namesMatch(`${user.first_name} ${user.last_name}`, accountName)) {
    return json({ error: 'third_party_withdrawal', message: THIRD_PARTY_MESSAGE }, 403)
  }
  if (!usdcToken) return json({ error: 'server', message: 'USDC is not configured' }, 500)

  let onchain: bigint
  try {
    onchain = await chainClient.readContract({
      address: usdcToken.address as `0x${string}`,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [user.arc_wallet_address as `0x${string}`],
    })
  } catch {
    return json({ error: 'chain', message: 'We could not read your balance right now. Please try again.' }, 503)
  }

  const withdrawnText = String(user.withdrawn_usdc)
  const withdrawn = parseUnits(withdrawnText, USDC_DECIMALS)
  const available = onchain > withdrawn ? onchain - withdrawn : 0n
  if (amount > available) {
    return json({ error: 'insufficient_balance', message: 'That is more than your available balance.' }, 422)
  }

  // One database transaction: raise the withdrawn total AND record the withdrawal, or neither.
  // The update is conditional: if another withdrawal landed in between, the row no longer matches.
  const saved = await sql.begin(async (tx) => {
    const updated = await tx`
      update users set withdrawn_usdc = withdrawn_usdc + ${amountText}::numeric
      where phone_number = ${phone.e164} and withdrawn_usdc = ${withdrawnText}::numeric
      returning withdrawn_usdc::text as total`
    if (!updated[0]) return null
    // Created already read: a withdrawal must never pop up as "You received funds".
    const row = await tx`
      insert into transactions (sender_wallet, receiver_phone, amount, message, status, is_read_by_receiver, type, sender_name)
      values (${user.arc_wallet_address}, ${phone.e164}, ${amountText}::numeric, 'Withdrawal to Bank', 'success', true, 'withdrawal', '')
      returning id, created_at`
    return { total: updated[0].total as string, id: row[0].id as string, createdAt: row[0].created_at as string }
  })
  if (!saved) return json({ error: 'conflict', message: 'Your balance just changed. Please try again.' }, 409)
  return json({
    withdrawnUsdc: saved.total,
    transaction: {
      id: saved.id,
      type: 'withdrawal' as const,
      amount: amountText,
      message: 'Withdrawal to Bank',
      createdAt: new Date(saved.createdAt).toISOString(),
    },
  })
}

const THIRD_PARTY_MESSAGE =
  'Third-party withdrawals are not permitted. Bank account name must match your registered identity.'

/**
 * Mock of a payment gateway's NUBAN name enquiry (Paystack / Flutterwave style).
 * Accounts ending in 1 resolve to a third party; every other account resolves to the signed-in user's own name.
 */
async function resolveBankAccount(accountNumber: string, user: { first_name: string; last_name: string }): Promise<string> {
  await new Promise((resolve) => setTimeout(resolve, 400))
  return accountNumber.endsWith('1') ? 'John Doe' : `${user.first_name} ${user.last_name}`
}

function parseBankDetails(body: Record<string, unknown> | null): { accountNumber: string; bankCode: string } | null {
  const accountNumber = typeof body?.account_number === 'string' ? body.account_number : ''
  const bankCode = typeof body?.bank_code === 'string' ? body.bank_code : ''
  if (!/^\d{10}$/.test(accountNumber) || !/^\d{3,6}$/.test(bankCode)) return null
  return { accountNumber, bankCode }
}

async function resolveBank(req: Request): Promise<Response> {
  const body = await readBody(req)
  const phone = parsePhone(body?.phone)
  if (!phone) return json({ error: 'invalid_phone', message: 'Enter a valid Nigerian phone number' }, 400)
  const bank = parseBankDetails(body)
  if (!bank) return json({ error: 'invalid_account', message: 'Enter a 10-digit account number and choose a bank' }, 400)
  const user = await findUserByPhone(phone.e164)
  if (!user) return json({ error: 'not_registered', message: 'Account not found' }, 404)
  const accountName = await resolveBankAccount(bank.accountNumber, user)
  return json({ accountName, accountNumber: bank.accountNumber, bankCode: bank.bankCode })
}

const WALLET_PATTERN = /^0x[0-9a-fA-F]{40}$/

/**
 * Registered names for a batch of sender wallets, so the receiver's ledger can say "From: Uncle Babalola".
 * Only names come back, keyed by lowercase wallet. Order of preference per wallet: the senders table,
 * a users row that owns the wallet, then the latest name typed on a transfer from it.
 */
async function senderNames(req: Request): Promise<Response> {
  const body = await readBody(req)
  const raw = Array.isArray(body?.wallets) ? body.wallets : []
  const wallets = [...new Set(raw.filter((w): w is string => typeof w === 'string' && WALLET_PATTERN.test(w)).map((w) => w.toLowerCase()))].slice(0, 50)
  if (wallets.length === 0) return json({ names: {} })

  const [registered, owners, typed] = await Promise.all([
    sql`select wallet_address as addr, display_name as name from senders where wallet_address in ${sql(wallets)}`,
    sql`select lower(arc_wallet_address) as addr, first_name, last_name from users where lower(arc_wallet_address) in ${sql(wallets)}`,
    sql`select distinct on (lower(sender_wallet)) lower(sender_wallet) as addr, sender_name as name
        from transactions
        where lower(sender_wallet) in ${sql(wallets)} and sender_name <> ''
        order by lower(sender_wallet), created_at desc`,
  ])
  const names: Record<string, string> = {}
  for (const r of typed) names[r.addr as string] = r.name as string
  for (const r of owners) names[r.addr as string] = `${r.first_name} ${r.last_name}`.trim()
  for (const r of registered) names[r.addr as string] = r.name as string
  return json({ names })
}

/** Is this wallet already a registered sender? Returns the saved display name when it is. */
async function checkSender(req: Request): Promise<Response> {
  const body = await readBody(req)
  const wallet = typeof body?.wallet === 'string' ? body.wallet : ''
  if (!WALLET_PATTERN.test(wallet)) return json({ error: 'invalid_wallet', message: 'Invalid wallet address' }, 400)
  const rows = await sql`select display_name from senders where wallet_address = ${wallet.toLowerCase()}`
  return json(rows[0] ? { exists: true, displayName: rows[0].display_name as string } : { exists: false })
}

async function registerSender(req: Request): Promise<Response> {
  const body = await readBody(req)
  const wallet = typeof body?.wallet === 'string' ? body.wallet : ''
  const displayName = typeof body?.displayName === 'string' ? body.displayName.trim().slice(0, 30) : ''
  if (!WALLET_PATTERN.test(wallet)) return json({ error: 'invalid_wallet', message: 'Invalid wallet address' }, 400)
  if (displayName.length < 2) return json({ error: 'invalid_name', message: 'Enter at least 2 characters' }, 400)
  await sql`
    insert into senders (wallet_address, display_name) values (${wallet.toLowerCase()}, ${displayName})
    on conflict (wallet_address) do update set display_name = excluded.display_name`
  return json({ exists: true, displayName }, 201)
}

/** Recent transfers sent from a wallet, newest first, with the recipient's legal name. */
async function listTransactions(url: URL): Promise<Response> {
  const wallet = url.searchParams.get('wallet') ?? ''
  if (!isAddress(wallet)) return json({ error: 'invalid_wallet', message: 'Invalid wallet address' }, 400)

  const rows = await sql`
    select t.id, t.receiver_phone, t.amount::text as amount, t.message, t.status, t.created_at, t.tx_hash,
           u.first_name, u.last_name
    from transactions t
    left join users u on u.phone_number = t.receiver_phone
    where lower(t.sender_wallet) = ${wallet.toLowerCase()} and t.type = 'deposit'
    order by t.created_at desc
    limit 20`
  return json({
    transactions: rows.map((r) => ({
      id: r.id,
      receiverPhone: r.receiver_phone,
      recipientName: r.first_name ? `${r.first_name} ${r.last_name}` : null,
      amount: r.amount,
      message: r.message,
      status: r.status,
      createdAt: new Date(r.created_at as string).toISOString(),
      txHash: r.tx_hash,
    })),
  })
}

await migrate()

Bun.serve({
  port: PORT,
  async fetch(req) {
    const { pathname } = new URL(req.url)
    try {
      if (req.method === 'GET' && pathname === '/transactions') return await listTransactions(new URL(req.url))
      if (req.method === 'GET' && pathname === '/receiver/state') return await receiverState(new URL(req.url))
      if (req.method === 'POST') {
        if (pathname === '/transactions') return await saveTransaction(req)
        if (pathname === '/receiver/mark-read') return await markRead(req)
        if (pathname === '/receiver/withdraw') return await withdraw(req)
        if (pathname === '/wallet/resolve-bank') return await resolveBank(req)
        if (pathname === '/auth/check-sender') return await checkSender(req)
        if (pathname === '/receiver/sender-names') return await senderNames(req)
        if (pathname === '/auth/register-sender') return await registerSender(req)
        if (pathname === '/auth/verify-phone') return await verifyPhone(req)
        if (pathname === '/auth/login') return await login(req)
        if (pathname === '/auth/register') return await register(req)
        if (pathname === '/wallet/lookup') return await walletLookup(req)
      }
      if (req.method === 'GET' && pathname === '/health') return json({ ok: true })
      return json({ error: 'Not found' }, 404)
    } catch (error) {
      console.error('request failed', pathname, error)
      return json({ error: 'server', message: 'Something went wrong on our side. Please try again.' }, 500)
    }
  },
})

console.log(`ArcPay API listening on :${PORT}`)

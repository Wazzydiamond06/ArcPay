# ArcPay

> Built with Arc Studio - money-powered apps in minutes

This is the **project memory** - what Arc Studio remembers about building this app. It helps future agents (or humans) understand and extend the project.

---

## What This App Does

Cross-border remittance on Arc Testnet. /send: diaspora sender connects a wallet and pays a Nigerian phone number in USDC with a note. /receive: receiver signs in with a phone number only (no web3 UI), sees balance and notes, and requests a simulated Naira withdrawal. Phone numbers map to addresses via a deterministic mock registry in `src/lib/arcpay.ts`.

## Deployed contracts

- ArcPayRemit (Arc Testnet): 0xca7513a215db0f0c00b4331cf204aed6e7cf6f95, stored in `.env` as VITE_ARCPAY_CONTRACT. Sender approves USDC then calls `remit`; receiver reads `recordsOf`.

## Tech Stack

- Frontend: React 18, Vite, TypeScript, Tailwind CSS
- Web3: wagmi v2, viem v2, ConnectKit
- Contracts: Solidity 0.8.28 + Foundry. Sources in `contracts/`, unit tests in `contracts/test/*.t.sol`. Build with `bun run contracts:build` (`forge build`), test with `bun run contracts:test` (`forge test`).
- Wallet: injected (MetaMask, etc.)
- Chain: Arc Testnet (Chain ID: 5042002, imported from `viem/chains`)
- Token: USDC (6 decimals) (Address: 0x3600000000000000000000000000000000000000, Chain: Arc Testnet)
- Toasts: Sonner

## Key Files

- `src/App.tsx` - Routes
- `src/pages/` - Landing, Send, Receive
- `src/lib/arcpay.ts` - ABI, constants, phone registry
- `src/components/` - UI components
- `src/config.ts` - wagmi config (chains, connectors, transports)

## Share links

- Starter apps already ship `getShareBase`, `buildShareLink` and `installShareSync` in `src/lib/share.ts`; import them instead of rewriting them.
- Keep shareable state in the URL path or query, not in the `#fragment`.
- Never put a secret (private key, claim secret, seed phrase, session token, API key) in the URL path or query, encoded or not: every in-app path and query is mirrored to the visitor's studio.arc.io address bar and browser history and reaches servers. A bearer claim secret goes only in the `#fragment` appended to the share link (`` `${await buildShareLink('/claim')}#${secret}` ``) and is read from `location.hash` on load. A link to the app's own share URL shown inside the app must be copy-only or open in a new tab with `target="_blank" rel="noopener noreferrer"`.
- Build every link a user copies or sends with `buildShareLink()` from `src/lib/share.ts`.
- Keep the `installShareSync()` call in `src/main.tsx` when editing it; it keeps the Studio address bar in step with in-app navigation.
- Navigate inside the app with relative links.

## To Run

```bash
bun install
bun run dev
```

## Backend

- Postgres in Docker (`arcpay-db`, named volume `arcpay_pgdata`, port 5432); `DATABASE_URL` and `BVN_PEPPER` live in `.env`. If the container is gone, recreate it with the same volume and run `bun run server` (the API creates the table from `server/schema.sql`).
- `server/index.ts` (Bun, port 3001, `bun run server`; Vite proxies `/api/*` and strips the prefix):
  - `POST /auth/verify-phone` -> `{ status: 'new' | 'returning' }`
  - `POST /auth/login` `{ phone, code }` (mock OTP: any 4 digits) -> names
  - `POST /auth/register` `{ phone, firstName, lastName, bvn }` -> saves the user; BVN stored only as an HMAC hash; 409 `bvn_in_use` / `phone_exists`
  - `POST /wallet/lookup` -> wallet address, or 404 `not_registered` (the sender UI then shows the amber alert and Invite via WhatsApp)
- `server/mock-bvn-provider.ts`: mock third-party BVN verification (rejects repeated-digit and sequential numbers with 422 `bvn_unverified`). BVNs are stored only as an HMAC-SHA256 keyed with `BVN_PEPPER`, which stays deterministic so the UNIQUE constraint on `bvn_hash` works.
- `server/mock-circle.ts`: mock Circle developer-controlled wallet; the address comes from `src/lib/registry.ts`, the same derivation the receiver dashboard reads balances from.
- The sender UI never renders the recipient address (`src/lib/api.ts` returns it for the transaction only).
- Receiver flow (`OnboardingWizard`): phone -> gateway check -> OTP (header "Log in to ArcPay" or "Create your ArcPay Account"); returning users go straight to `/receive/dashboard`; new users continue through legal name, BVN, review.

## Transaction history and sessions

- `transactions` table (see `server/schema.sql`): sender_wallet, receiver_phone, amount (numeric USDC), message, status, is_read_by_receiver (default false), created_at, plus `tx_hash` (unique, makes saving idempotent).
- `POST /transactions { txHash }`: the server re-reads the receipt from Arc Testnet, finds the ArcPayRemit `Remittance` event, maps the recipient wallet to a user and inserts the row. Amounts, names and wallets never come from the browser. `GET /transactions?wallet=0x…` returns that sender's last 20 transfers with the recipient's legal name.
- Sender auto-login: `src/lib/useSenderSession.ts`. A wallet that wagmi reconnects, with a saved sender profile for the same address, skips `/get-started` and `/send` and lands on `/send/dashboard`. Disconnect clears the wallet and the saved profile.

## Receiver alerts and mock withdrawals

- `GET /receiver/state?phone=` returns `{ withdrawnUsdc, unread[] }` (unread = `transactions.is_read_by_receiver = false`); `POST /receiver/mark-read { phone, ids }` flips the flag. The dashboard shows `NewMoneyModal` once per visit and marks the shown transfers read when "Awesome" is pressed.
- Mock withdrawals: `POST /receiver/withdraw { phone, amount }` adds to `users.withdrawn_usdc`. No funds move on-chain. The dashboard shows (on-chain USDC balance - withdrawn_usdc); the server rejects amounts above that available balance. `transactions.sender_name` is the display name the sender chose, sent when the transfer is saved.

## Sender dashboard chrome

- `/send/dashboard` renders without the public header/footer (`Layout.tsx`); it has its own `SenderNavbar` (logo left; Settings dropdown and a wallet badge with a generated gradient avatar right).
- The wallet badge opens `PortfolioSheet` (Radix dialog as a right-side sheet, Tabs: Portfolio and History). History is the `RecentTransfers` feed from the `transactions` table. Portfolio shows the real USDC balance valued at $1; display currency (USD/EUR, mock EUR rate in `src/lib/currency.ts`) and the address book (`src/lib/addressBook.ts`, browser-local) are in the Settings menu. Disconnect Wallet there clears the wallet and saved profile and returns to `/get-started`.

## Withdrawals are first-party only

- `POST /api/wallet/resolve-bank` is a mock NUBAN name enquiry (stand-in for Paystack/Flutterwave): account numbers ending in 1 resolve to "John Doe", any other resolves to the signed-in user's registered name.
- The withdraw drawer resolves the name 500ms after the 10th digit and compares it with the registered name using `src/lib/names.ts` (every registered word must appear as a whole word in the bank name). `POST /api/receiver/withdraw` repeats the same check on the server and returns 403 for third-party accounts.

## Avatars (no image uploads)

- `src/components/ui/avatar.tsx` is the shadcn Avatar. `NameAvatar` shows initials (first letter of first and last name) on the gold-to-amber gradient with bronze text. `WalletAvatar` shows a gradient generated from the wallet address hash.
- Receiver: initials avatar by the welcome header; transfer feed and the "You received funds!" modal use the sender's `WalletAvatar` (the API's unread items carry `senderWallet`, used only for the avatar). Sender: wallet avatar in the navbar, wallet sheet and the digital receipt; the History feed shows the recipient's initials.

## Transaction types

- `transactions.type` is `'deposit'` (default, so every pre-existing row is incoming funds) or `'withdrawal'` (checked by the database). Withdrawals are written in the same database transaction as the `users.withdrawn_usdc` update by `POST /api/receiver/withdraw`, with message "Withdrawal to Bank" and `is_read_by_receiver = true` so they never trigger the "You received funds" alert.
- Alerts (`/receiver/state` unread) and the sender's History (`/transactions`) only read deposits. The receiver's Transaction History merges on-chain deposits with `withdrawals` from `/receiver/state`.

## Sender wallet gateway and receiver ledger

- Senders live in the `senders` table (wallet_address lowercase, display_name). `/send` looks the connected wallet up with `POST /api/auth/check-sender`: a registered wallet skips the name step and goes straight to `/send/dashboard`; a new one enters a name, which `POST /api/auth/register-sender` saves.
- `transactions.type` is 'deposit' or 'withdrawal'. A withdrawal inserts a 'withdrawal' row (created already read) in the same database transaction that raises `users.withdrawn_usdc`. The receiver's Transaction History merges on-chain deposits (contract records) with these withdrawal rows; the sender's History and the unread alert only use deposits.

## Receiver dashboard chrome

- `/receive/dashboard` has no public header or footer (`Layout.tsx`); `ReceiverNavbar` shows the logo on the left and a profile badge (initials avatar + first name) on the right. Its menu opens My Profile (legal name and phone), Saved Banks (placeholder) and Help & Support (all in `ReceiverInfoDialog`), then a red Log Out that clears the saved profile and returns to `/get-started`.

## Loading states

- `src/components/PageState.tsx`: `PageLoader` (full-screen cream hold screen with a pulsing ArcPay mark) and `PageTransition` (0.3s fade and 10px slide-up). `/send/dashboard` shows the loader until wagmi has restored the wallet and a saved profile matches it (otherwise it goes to `/send`); `/receive/dashboard` shows it until the database confirms the account (otherwise onboarding). Neither renders its navbar or layout before that.
- The receiver balance shows a `#E5D5C5` skeleton, never a default 0; the ledger shows skeleton rows until chain transfers and database withdrawals have both loaded.

# ArcPay

A cross-border remittance app on Arc Testnet. Senders in the diaspora pay a Nigerian phone number in USDC with a personal message. Family members sign in with just their phone number to see their balance, read messages, and request a Naira withdrawal.

Built with [Arc Studio](https://studio.arc.io)

## Features

- Marketing landing page: sticky navbar, animated hero, audience cards, how-it-works steps, about section and footer.
- Send flow: three-step onboarding (connect wallet, choose a display name, continue), then use the transfer dashboard (`/send/dashboard`) to send USDC to a phone number with a message and get a shareable digital receipt. A wallet menu holds the portfolio, transfer history, address book and display currency.
- Receive flow: four-step onboarding (phone, 4-digit code, legal name, review), then the dashboard (`/receive/dashboard`) with a counting balance, recent transfers, and a withdraw-to-Naira drawer (demo only, no bank payout). Code check is mocked: any 4 digits work.

## Tech stack

React 18, Vite, TypeScript, Tailwind CSS, shadcn-style components, Framer Motion, React Router, wagmi, viem, ConnectKit, Solidity (Foundry).

## Development

Prerequisites: [Bun](https://bun.sh) and [Foundry](https://book.getfoundry.sh).

```bash
bun install
bun run server     # start the API on port 3001 (the app proxies /api to it)
bun run dev        # start the app on port 5173
bun run check      # lint and typecheck
bun run contracts:build
bun run contracts:test
```

### Database

User accounts live in PostgreSQL (`server/schema.sql`, also pasteable into a Supabase project). Locally:

```bash
docker run -d --name arcpay-db --restart unless-stopped -e POSTGRES_PASSWORD=<password> -e POSTGRES_DB=arcpay \
  -v arcpay_pgdata:/var/lib/postgresql -p 5432:5432 postgres:18-alpine
```

The API creates the `users` table on start.

### Environment variables

- `VITE_ARCPAY_CONTRACT`: address of the deployed ArcPayRemit contract on Arc Testnet.
- `RPC_PROXY_BASE_URL`, `RPC_PROXY_TOKEN`, `RPC_PROXY_CHAINS`, `RPC_URL_Arc_Testnet`: optional. The API reads transfers from Arc Testnet to verify them; it uses the sandbox RPC proxy when present, an `RPC_URL_Arc_Testnet` you set, or the public Arc Testnet RPC.
- `DATABASE_URL`: PostgreSQL connection string for the API (a Supabase connection string also works).
- `BVN_PEPPER`: random secret the API uses to hash BVNs before saving them.

## Notes

The API in `server/` checks phone numbers against the `users` table to decide whether someone logs in or signs up, saves new accounts (name, hashed BVN, wallet address), and resolves a phone number to a wallet when someone sends money. The wallet creation, the one-time code and the BVN check are mocked. The API only runs alongside the dev server, so a static deploy needs its own backend.

Phone numbers map to addresses through a demo registry in `src/lib/arcpay.ts`. Nobody holds keys for those addresses, so withdrawals are simulated.

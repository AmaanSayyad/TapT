# Environment

The app reads one file: `.env`. Do not add `.env.local` or `.env.example`. Next.js would let `.env.local` override `.env`.

Do not commit `.env`, and do not paste secret values into chat or docs.

## Live chains

The desk uses these networks, in connect order.

| Chain | Public address | Server key |
|---|---|---|
| Robinhood Chain | `NEXT_PUBLIC_ROBINHOOD_TREASURY_ADDRESS` | `ROBINHOOD_TREASURY_SECRET_KEY` |
| Solana | `NEXT_PUBLIC_SOL_TREASURY_ADDRESS` | `SOL_TREASURY_SECRET_KEY` |
| Base | `NEXT_PUBLIC_BASE_TREASURY_ADDRESS` | `BASE_TREASURY_SECRET_KEY` |
| Arbitrum | `NEXT_PUBLIC_ARBITRUM_TREASURY_ADDRESS` | `ARBITRUM_TREASURY_SECRET_KEY` |
| Tempo | `NEXT_PUBLIC_TEMPO_TREASURY_ADDRESS` | `TEMPO_TREASURY_SECRET_KEY` |

Solana RPC: the browser uses `NEXT_PUBLIC_SOLANA_RPC_ENDPOINT`. The server prefers `SOLANA_RPC_URL` when it is set to something other than the public Labs cluster. `NEXT_PUBLIC_SOLANA_NETWORK` stays `mainnet-beta`.

WalletConnect: `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`.
Privy: `NEXT_PUBLIC_PRIVY_APP_ID` and `PRIVY_APP_SECRET`.

## App and data

`NEXT_PUBLIC_APP_URL`
`NEXT_PUBLIC_SUPABASE_URL`
`NEXT_PUBLIC_SUPABASE_ANON_KEY`
`SUPABASE_SERVICE_KEY`

`BALANCE_SETTLEMENT_SECRET`
`BALANCE_INTERNAL_SECRET`

`NEXT_PUBLIC_POSTHOG_KEY`
`NEXT_PUBLIC_POSTHOG_HOST`

## Prices

`PYTH_PRO_ENABLE` stays `false` unless a Pro key is in use. The chart does not depend on that flag. Stocks use Chainlink on Robinhood Chain, then Hyperliquid mids, then public quotes.

## Admin and fees

`DASHBOARD_PASSWORD` signs the admin session. `ADMIN_SESSION_HOURS` is optional.

`NEXT_PUBLIC_PLATFORM_FEE_WALLET_EVM` receives fees on Robinhood Chain, Base, Arbitrum, and Tempo. `NEXT_PUBLIC_PLATFORM_FEE_WALLET_SOL` receives Solana fees. These are separate from the treasuries.

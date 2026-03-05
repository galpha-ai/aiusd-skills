# Account & Authentication

## Authentication

### Token Lifecycle (automatic)

The CLI manages tokens automatically:
1. Cached token from `~/.aiusd/token.json` (if not expired)
2. Refresh via refresh token (if expired)
3. Recovery from saved wallet at `~/.aiusd/AIUSD_WALLET_DO_NOT_DELETE` (challenge/verify)
4. If all above fail → first-time auth prompt

Steps 1-3 are invisible to the user. Only step 4 requires interaction.

### First-Time Auth

When no token and no saved wallet exist, any command triggers a prompt:
- **(a) Create new wallet** — generates wallet, saves to `~/.aiusd/AIUSD_WALLET_DO_NOT_DELETE`, authenticates
- **(b) Browser login** — creates agent session, outputs a URL (`https://aiusd.ai/agent-auth?sid=...`), user opens in browser, CLI polls until sign-in completes
- **(c) Restore from backup file** — user provides path to backup, restores wallet, authenticates

### Guiding Users

Present 2 options (do NOT offer restore proactively):
```
Welcome to AIUSD!

How would you like to log in?
1. Create new account — set up a fresh wallet
2. Browser login — sign in with an existing account via your browser
```

### Logout

```
aiusd logout
```

Removes stored token. Wallet backup file is preserved for automatic recovery.

## Commands

| Command | Description |
|---------|------------|
| `aiusd balances` | Show balances across trading, custody, staking accounts |
| `aiusd accounts` | Show trading account addresses per chain |
| `aiusd transactions [-l N]` | Show recent transactions (default: 10) |
| `aiusd get-deposit-address` | Show deposit addresses for all chains |
| `aiusd logout` | Remove stored token and sign out |

## Deposits

**Website:** https://aiusd.ai — supports multiple stablecoins, auto-converts to AIUSD

**Direct deposit** via `aiusd get-deposit-address`:
- Tron: **ONLY USDT** (USDC will be lost!)
- All other chains: **ONLY USDC** (USDT will be lost!)
- Minimum deposit: $10

## Staking

| Command | Description |
|---------|------------|
| `aiusd call genalpha_stake_aiusd -p '{"amount":"100"}'` | Stake AIUSD for yield |
| `aiusd call genalpha_unstake_aiusd -p '{"amount":"50"}'` | Unstake (3-day lock) |
| `aiusd call genalpha_withdraw_to_wallet -p '{"amount":"100","chain_id":"solana:mainnet-beta"}'` | Withdraw stablecoins to wallet |

## Gas Top-up

| Command | Description |
|---------|------------|
| `aiusd call genalpha_ensure_gas -p '{"chain_id":"solana:mainnet-beta"}'` | Top up native gas using AIUSD |

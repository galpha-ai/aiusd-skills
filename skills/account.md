# Account & Balance

## Authentication
Run `aiusd login` to authenticate. Token is stored locally.

## Commands
| Command | Description |
|---------|------------|
| `aiusd balances` | Show balances across trading, custody, staking accounts |
| `aiusd accounts` | Show trading account addresses per chain |
| `aiusd transactions [-l N]` | Show recent transactions (default: 10) |

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

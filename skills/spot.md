# Spot Trading

## Commands
| Command | Description |
|---------|------------|
| `aiusd spot buy -b <TOKEN> -a <AMOUNT> [-q USDC] [-c solana]` | Buy token |
| `aiusd spot sell -b <TOKEN> -a <AMOUNT\|all\|50%> [-q USDC] [-c solana]` | Sell token |

## Defaults
- Quote: USDC (unless user specifies otherwise)
- Chain: solana

## Cross-chain
When source and destination are different chains, the CLI will return
`action_required` with step-by-step `next_steps`. Follow them in order.

## AIUSD
- Selling tokens FOR AIUSD: `aiusd spot sell -b SOL -q AIUSD -a all`
- Converting AIUSD to USDC: `aiusd spot buy -b USDC -q AIUSD -a 100`
- AIUSD can only buy stablecoins (USDC/USDT/USD1). For other tokens, CLI guides you through a 2-step process.

## Examples
- "Buy $100 of SOL": `aiusd spot buy -b SOL -a 100`
- "Sell all TRUMP": `aiusd spot sell -b TRUMP -a all`
- "Sell 50% of ETH for AIUSD": `aiusd spot sell -b ETH -q AIUSD -a 50%`

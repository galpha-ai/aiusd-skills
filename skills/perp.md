# HyperLiquid Perpetuals

## Commands
| Command | Description |
|---------|------------|
| `aiusd perp long --asset <SYM> --size <N> [--leverage N] [--price P]` | Open long |
| `aiusd perp short --asset <SYM> --size <N> [--leverage N] [--price P]` | Open short |
| `aiusd perp close --asset <SYM>` | Close position (market order) |
| `aiusd perp deposit --amount <N>` | Deposit USDC to HL |
| `aiusd perp withdraw --amount <N>` | Withdraw USDC from HL |

## Defaults
- Order type: market (omit --price). Specify --price for limit.
- Leverage: HL default for the asset.

## Workflow
1. Check if HL has funds: `aiusd balances` (look for HyperLiquid section)
2. If insufficient: `aiusd perp deposit --amount <N>`
3. Place order: `aiusd perp long --asset ETH --size 0.1 --leverage 10`
4. CLI returns `action_required` if funds are insufficient, with deposit command in `next_steps`.

## Examples
- "Long 0.1 ETH 10x": `aiusd perp long --asset ETH --size 0.1 --leverage 10`
- "Short BTC at $70k": `aiusd perp short --asset BTC --size 0.01 --price 70000`
- "Close ETH position": `aiusd perp close --asset ETH`

# Prediction Markets (Polymarket)

## Commands
| Command | Description |
|---------|------------|
| `aiusd pm buy --market "<slug>" --outcome <Yes\|No> --amount <N> [--price P]` | Place prediction bet |
| `aiusd pm search -q "<query>"` | Search markets |

## Notes
- Market identifier: use the slug from search results.
- Price: 0-1 range (e.g., 0.65 = 65 cents per share). Omit for market order.
- Auto-funding: if balance insufficient, CLI handles it automatically.

## Examples
- "Bet $10 on Yes for Bitcoin 100k": `aiusd pm buy --market "will-bitcoin-hit-100k" --outcome Yes --amount 10`
- "Search election markets": `aiusd pm search -q "election"`

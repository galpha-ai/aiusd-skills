# Event Monitoring & Conditional Orders

## Commands
| Command | Description |
|---------|------------|
| `aiusd monitor add --handle <@user> --budget <N> [--tp 20%] [--sl 10%]` | Watch X account for trades |
| `aiusd monitor list` | List active monitors |
| `aiusd monitor cancel --order-id <ID>` | Cancel a monitor |

## How It Works
Watches an X account for bullish signals. When triggered, auto-buys the mentioned token with the budget.

## Examples
- "Monitor @pumpfuneco with $100 budget": `aiusd monitor add --handle @pumpfuneco --budget 100 --tp 50% --sl 30%`
- "List active monitors": `aiusd monitor list`
- "Cancel a monitor": `aiusd monitor cancel --order-id <ID>`

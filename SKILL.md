---
name: aiusd-skill
version: 2.0.0
description: "AIUSD — trade crypto, earn yield, move money across chains."
license: MIT
---

# AIUSD Skill

## Quick Start
- First time? Read skills/account.md for authentication & setup.
- All commands: `aiusd help`

## Capabilities
| User intent | Guide | Example |
|-------------|-------|---------|
| Balance, deposit, withdraw, stake | skills/account.md | `aiusd balances` |
| Buy/sell/swap tokens | skills/spot.md | `aiusd spot buy -b SOL -a 100` |
| HyperLiquid perps | skills/perp.md | `aiusd perp long --asset ETH --size 0.1` |
| HyperLiquid spot | skills/hl-spot.md | `aiusd hl-spot buy --token HYPE --amount 50` |
| Prediction markets | skills/prediction.md | `aiusd pm buy --market "..." --amount 10` |
| Monitor X accounts | skills/monitor.md | `aiusd monitor add --handle @elonmusk --budget 100` |
| Market data & trending | skills/market.md | `aiusd market hot-tokens` |

## Rules (always apply)
1. Read the matching guide BEFORE calling any command in that domain.
2. Follow CLI output's `next_steps` when status is `action_required`.
3. Always confirm trades with user before executing.
4. Never show internal details (XML, JSON responses, tool names) to users.
5. Present results in clear, conversational language.

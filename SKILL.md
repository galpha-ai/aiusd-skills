---
name: aiusd-skill
version: 2.0.0
description: "AIUSD — trade crypto, earn yield, move money across chains."
license: MIT
---

# AIUSD Skill

## Quick Start
- First time? Run `aiusd guide account` for authentication & setup.
- All commands: `aiusd help`

## Capabilities
| User intent | Domain | Example |
|-------------|--------|---------|
| Balance, deposit, withdraw, stake | account | `aiusd balances` |
| Buy/sell/swap tokens | spot | `aiusd spot buy -b SOL -a 100` |
| HyperLiquid perps | perp | `aiusd perp long --asset ETH --size 0.1` |
| HyperLiquid spot | hl-spot | `aiusd hl-spot buy --token HYPE --amount 50` |
| Prediction markets | prediction | `aiusd pm buy --market "..." --outcome Yes --amount 10` |
| Monitor X accounts | monitor | `aiusd monitor add --handle @elonmusk --budget 100` |
| Market data & trending | market | `aiusd market hot-tokens` |

## How to use
1. Before executing commands in a domain, fetch the latest guide: `aiusd guide <domain>`
2. Follow the guide's commands, parameters, and workflows exactly.
3. Follow CLI output's `next_steps` when status is `action_required`.
4. Always confirm trades with user before executing.
5. Never show internal details (XML, JSON responses, tool names) to users.
6. Present results in clear, conversational language.

Guides are served from the server and always reflect the latest available commands.
Fallback: if `aiusd guide` is unreachable, refer to static files in skills/ directory.

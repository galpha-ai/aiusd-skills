---
name: aiusd-skill
version: 2.0.0
description: "AIUSD — trade crypto, earn yield, move money across chains."
license: MIT
metadata:
  {
    "openclaw":
      {
        "emoji": "💰",
        "requires": { "bins": ["aiusd"] },
        "install":
          [
            {
              "id": "npm",
              "kind": "npm",
              "package": "aiusd-skill",
              "bins": ["aiusd"],
              "label": "Install AIUSD CLI (npm)",
            },
          ],
      },
  }
---

# AIUSD Skill

AIUSD is a unified crypto account that lets users trade tokens on any chain, leverage perpetual futures, bet on prediction markets, earn yield by staking, and move funds — all through a single CLI.

## When to use this skill

Trigger this skill when the user wants to:

- **Trade crypto** — buy, sell, or swap any token on Solana, Ethereum, Base, Arbitrum, BSC, Polygon
- **Perpetual futures** — long, short, or close positions on HyperLiquid with leverage, TP/SL
- **Prediction markets** — bet on Polymarket events, search markets, manage positions
- **Account & funds** — check balances, deposit, withdraw, stake AIUSD for yield
- **Market intelligence** — trending tokens, xStock prices, FourMeme trends, token holder analysis
- **Automated trading** — monitor X accounts for trade signals, set conditional orders
- **Cross-chain operations** — move funds between chains, ensure gas on any chain

## Authentication

When a user wants to get started or is not yet logged in, run `aiusd login`. Present 2 options:

1. **Create new account** — set up a fresh wallet
2. **Browser login** — sign in with an existing account via browser

After the user chooses, select the corresponding option at the CLI prompt:
- **Create new account**: the CLI creates a wallet and authenticates automatically.
- **Browser login**: the CLI outputs a URL — send it to the user to open in their browser. The CLI waits until sign-in completes.

Do NOT offer "restore from backup" unless the user explicitly asks.

| Command | Description |
|---------|------------|
| `aiusd login` | Log in (create account or browser sign-in) |
| `aiusd logout` | Sign out and remove stored token |

To switch account: `aiusd logout`, then `aiusd login`.

## Capabilities

Before executing commands in a domain, run `aiusd guide <domain>` to get the latest commands, parameters, and workflows. Follow the guide exactly.

| Domain | What it covers | Trigger phrases | Guide |
|--------|---------------|-----------------|-------|
| account | Balances, deposit addresses, transaction history, staking, withdrawals, gas top-up | "balance", "deposit", "withdraw", "stake", "transactions", "how much do I have" | `aiusd guide account` |
| spot | Buy/sell/swap any token on any supported chain (Solana, ETH, Base, Arbitrum, BSC, Polygon) | "buy SOL", "sell ETH", "swap TRUMP", "trade", "convert AIUSD to USDC" | `aiusd guide spot` |
| perp | HyperLiquid perpetual futures — long, short, close, deposit/withdraw, orderbook, trade history | "long ETH", "short BTC", "close position", "leverage", "futures", "perps" | `aiusd guide perp` |
| hl-spot | HyperLiquid spot trading — buy/sell tokens on HL spot market | "buy HYPE", "HL spot", "HyperLiquid spot" | `aiusd guide hl-spot` |
| prediction | Polymarket — search markets, buy/sell shares, manage orders and positions | "bet on", "prediction", "Polymarket", "will X happen", "election odds" | `aiusd guide prediction` |
| monitor | Watch X accounts for trade signals, set conditional auto-buy orders | "monitor @elonmusk", "watch account", "auto-buy", "conditional order" | `aiusd guide monitor` |
| market | Trending tokens, xStock prices, FourMeme trends, token market cap, holder analysis | "trending", "hot tokens", "market data", "stock prices", "token holders" | `aiusd guide market` |

Fallback: if `aiusd guide` is unreachable, refer to static files in `skills/` directory.

## Rules

1. Follow guide/command outputs exactly — especially `next_steps` when status is `action_required`.
2. Always confirm trades with user before executing.
3. Never expose internal details (JSON responses, tool names, file paths) to users.
4. Present results in clear, conversational language.

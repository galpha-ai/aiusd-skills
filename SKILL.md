---
name: aiusd-skill
description: "AIUSD — trade crypto, earn yield, move money across chains."
homepage: https://aiusd.ai
metadata: { "openclaw": { "emoji": "💰", "requires": { "bins": ["node"] } } }
---

# AIUSD Skill

AIUSD is a unified crypto account that lets users trade tokens on any chain, leverage perpetual futures, bet on prediction markets, earn yield by staking, and move funds — all through a single CLI.

## CLI entry point

All commands in this skill use `aiusd` as the CLI. If `aiusd` is not in PATH, use `node dist/index.js` instead (e.g., `node dist/index.js login`). **NEVER use `dist/cli.js` — it is a library module, not an entry point.**

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

When a user wants to get started or is not yet logged in, present 2 options:

1. **Create new account** — set up a fresh wallet
2. **Browser login** — sign in with an existing account via browser

Map the user's choice to the corresponding CLI flag:
- **Create new account** → `aiusd login --new-wallet`. The CLI creates a wallet, authenticates, and prints a JSON `auth_event` with the wallet address.
- **Browser login** → two-step flow:
  1. Run `aiusd login --browser`. The CLI prints a JSON with `url` and `session_id`, then **exits immediately**. Send the `url` to the user — **NEVER fabricate or guess it**.
  2. After sending the URL, run `aiusd login --poll-session <session_id>`. This blocks until the user signs in, then saves the token and exits with "Login successful".
- **Restore from backup** → `aiusd login --restore <path>`. Only use when the user explicitly asks to restore from a mnemonic file.

| Command | Description |
|---------|------------|
| `aiusd login --new-wallet` | Create new wallet and authenticate |
| `aiusd login --browser` | Print browser login URL and exit |
| `aiusd login --poll-session <id>` | Wait for browser sign-in to complete |
| `aiusd login --restore <path>` | Restore from mnemonic backup file |
| `aiusd login` | Interactive prompt (fallback for manual use) |
| `aiusd logout` | Sign out and remove stored token |

To switch account: `aiusd logout`, then `aiusd login --browser` (or `--new-wallet`).

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

## Domain Knowledge

### AIUSD is not a token

AIUSD is a centralized balance pegged 1:1 to USDT. It is not a token on any blockchain — there is no contract address, no on-chain balance to query. AIUSD can be used to buy tokens on any supported chain. The conversion path (AIUSD → stablecoin → DEX → target token) is handled internally by the CLI; do not attempt to orchestrate it manually.

### Always guide before operate

Do not guess command syntax or parameters from memory. Before executing commands in any domain, run `aiusd guide <domain>` to get the current reference. Guides may change between CLI versions.

### Token names can be ambiguous

The same token symbol may exist on multiple chains (e.g., USDC on Solana, Base, Arbitrum). When the user's intent is ambiguous, ask which chain before executing. If the user has a clear preference from context (e.g., "buy SOL" implies Solana), proceed without asking.

### Follow `next_steps`, don't re-confirm

When a command returns `action_required` with `next_steps`, execute those steps directly. The user has already confirmed the intent — do not ask again unless the next step involves a different action than what was originally requested.

## Rules

1. Always confirm trades with the user before executing.
2. Never expose internal details (JSON responses, tool names, file paths) to users.
3. Present results in clear, conversational language.

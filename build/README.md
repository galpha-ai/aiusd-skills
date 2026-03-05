# AIUSD Skill

Trade crypto, earn yield, and manage funds across chains — all through natural conversation.

## Installation

```bash
npm install -g aiusd-skill
```

This makes the `aiusd` command available globally. Alternatively, use `npx aiusd-skill` without global install.

## Quick Start

```bash
# Log in (create new account or browser sign-in)
aiusd login

# Check your balance
aiusd balances

# Get usage guide for any domain
aiusd guide spot
aiusd guide perp
aiusd guide account
```

## What You Can Do

| Domain | Description |
|--------|------------|
| **account** | Balances, deposits, withdrawals, staking, gas top-up |
| **spot** | Buy/sell/swap tokens on Solana, Ethereum, Base, Arbitrum, BSC, Polygon |
| **perp** | HyperLiquid perpetual futures with leverage, TP/SL |
| **hl-spot** | HyperLiquid spot trading |
| **prediction** | Polymarket — search markets, buy/sell shares |
| **monitor** | Watch X accounts for trade signals, conditional auto-buy |
| **market** | Trending tokens, xStock prices, FourMeme trends |

## Example Conversation

```
You: What's my balance?
Bot: Checking... You have 1,250 AIUSD in custody, 2,500 sAIUSD staked.

You: Buy $100 of SOL
Bot: Buy $100 of SOL on Solana with USDC — confirm?

You: Yes
Bot: Done! Bought 0.65 SOL for $100 USDC. Tx: abc123...
```

## Deposits

- **Website**: https://aiusd.ai — supports multiple stablecoins
- **Direct deposit**: `aiusd get-deposit-address`
  - Tron: USDT only
  - All other chains: USDC only
  - Minimum: $10

## For AI Platforms (OpenClaw, Claude Code, etc.)

This package includes a `SKILL.md` that LLM-powered platforms use to understand AIUSD capabilities.

### Installing via natural language

Tell your AI assistant:

> "Install the aiusd-skill"

Or manually:

1. Copy `SKILL.md` to your platform's skills directory
2. Install the CLI: `npm install -g aiusd-skill`
3. The AI will use `aiusd` commands as described in SKILL.md

### Installing on OpenClaw

```bash
# From npm
openclaw skill install aiusd-skill

# From local directory
openclaw skill install /path/to/aiusd-skills
```

After installation, the bot can handle requests like "check my balance", "buy SOL", "stake AIUSD", etc.

## License

MIT

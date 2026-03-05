# AIUSD Skill for OpenClaw

The official AIUSD trading skill for your personal AI assistant. Trade crypto, check balances, earn yield, trade futures, bet on predictions, and manage funds — all through natural conversation in Telegram, Discord, WhatsApp, or any platform your bot supports.

## Install the Skill

**Option A: Drag & Drop (Easiest)**
1. Download the skill file: **[Download aiusd-skill-agent.skill](https://github.com/galpha-ai/aiusd-skills/releases/latest/download/aiusd-skill-agent.skill)**
2. Open your chat (Telegram, Discord, WhatsApp, etc.)
3. Drag and drop the `.skill` file into the chat
4. Your bot will automatically install the skill

**Option B: npx (one command)**
```bash
npx aiusd-skills install
```

**Option C: Manual**
1. [Download aiusd-skill-agent.skill](https://github.com/galpha-ai/aiusd-skills/releases/latest/download/aiusd-skill-agent.skill) and extract: `tar -xzf aiusd-skill-agent.skill`
2. Copy the extracted folder to your OpenClaw skills directory
3. Restart your bot

## Authentication

When the skill is first used, the bot will ask how to log in:

1. **Create new account** — set up a fresh wallet
2. **Browser login** — sign in with an existing account via browser

The bot handles everything — just pick an option and follow the instructions.

To re-login or switch account, tell your bot: "logout" then "login".

## What You Can Ask Your Bot

### Account & Balance
- "What's my balance?"
- "Show my trading addresses"
- "Show my recent transactions"

### Spot Trading
- "Buy $100 of SOL"
- "Sell all my ETH"
- "Swap TRUMP for USDC on Solana"
- "Buy ETH on Base"

### Perpetual Futures
- "Long ETH 10x"
- "Short BTC at $70k"
- "Close my ETH position"

### HyperLiquid Spot
- "Buy HYPE on HyperLiquid"

### Prediction Markets
- "Bet $10 on Yes for Bitcoin 100k"
- "Search election markets"
- "Show my prediction positions"

### Monitoring & Signals
- "Monitor @elonmusk with $100 budget"
- "List my active monitors"

### Market Data
- "What tokens are trending?"
- "Show xStock prices"

### Staking & Yield
- "Stake 500 AIUSD"
- "Unstake my AIUSD"

### Deposits
- "How do I deposit?"
- "What are my deposit addresses?"

## Supported Platforms

This skill works with OpenClaw on:
- **Telegram** — Private chats and groups
- **Discord** — Direct messages and server channels
- **WhatsApp** — Personal and business accounts
- **Slack** — Workspaces and direct messages
- **CLI** — Command line interface

## Privacy & Security

- **Local first**: your bot runs locally, your data stays private
- **Secure storage**: authentication tokens stored locally on your device
- **Open source**: skill code is transparent and auditable

---

**Website**: https://aiusd.ai | **License**: MIT

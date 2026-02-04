---
name: aiusd-skill
description: AIUSD trading and account management skill. Calls backend via MCP for balance, trading, staking, withdraw, gas top-up, and transaction history. Auth priority: MCP_HUB_TOKEN env, then mcporter OAuth or local token file.
---

# AIUSD Skill (Agent Reference)

This skill calls the AIUSD backend via MCP. Auth is resolved in order: env `MCP_HUB_TOKEN`, mcporter OAuth, or local `~/.mcp-hub/token.json`. Ensure a valid Bearer token is available before calling.

## Important URLs

- **Login/Auth**: `https://mcp.alpha.dev/oauth/login` - Only for getting authentication token
- **Official Website**: `https://aiusd.ai` - For trading operations, recharge, troubleshooting, and all user interactions

## Tool Overview

| Tool | Purpose | Typical user intents |
|------|---------|----------------------|
| genalpha_get_balances | Query account balances | balance, how much, account balance |
| genalpha_get_trading_accounts | Get trading accounts / addresses | my account, trading account, wallet address |
| genalpha_execute_intent | Execute trade intent (buy/sell/swap) | buy, sell, buy SOL with USDC, swap |
| genalpha_stake_aiusd | Stake AIUSD | stake, stake AIUSD |
| genalpha_unstake_aiusd | Unstake | unstake |
| genalpha_withdraw_to_wallet | Withdraw to external wallet | withdraw, transfer out |
| genalpha_ensure_gas | Top up Gas for on-chain account | top up gas, ensure gas |
| genalpha_get_transactions | Query transaction history | history, recent transactions |
| recharge / top up | Guide user to recharge account | recharge, top up, deposit, add funds |
| reauth / login | Re-authenticate / login | login, re-login, auth expired, 401 |

## Tool Reference and Call Usage

### genalpha_get_balances

- **Purpose**: Return user AIUSD custody and staking account balances.
- **When to use**: User asks for balance, how much, account assets.
- **Params**: None. Pass `{}`.
- **Example**: `call genalpha_get_balances` or `call genalpha_get_balances --params '{}'`.

### genalpha_get_trading_accounts

- **Purpose**: Return user trading accounts (addresses, etc.) per chain.
- **When to use**: User asks "my account", "trading account", "wallet address".
- **Params**: None. Pass `{}`.
- **Example**: `call genalpha_get_trading_accounts`.

### genalpha_execute_intent

- **Purpose**: Execute buy/sell/swap (e.g. buy SOL with USDC, sell ETH).
- **When to use**: User clearly wants to place order, buy, sell, swap.
- **Params** (JSON):
  - `chain_id` (string, required): Chain ID, e.g. `solana:mainnet-beta`, `eip155:1`.
  - `intent` (string, required): Intent payload, usually XML or structured string, parsed by backend.
- **Example**: `call genalpha_execute_intent --params '{"chain_id":"solana:mainnet-beta","intent":"<buy amount=\"100\" from=\"USDC\" to=\"SOL\"/>"}'`. Check MCP server schema for exact intent format; use `tools --detailed` before calling.

### genalpha_stake_aiusd

- **Purpose**: Stake AIUSD for yield (e.g. sAIUSD).
- **When to use**: User says stake, stake AIUSD.
- **Params**: Per MCP server schema; often includes amount; otherwise pass `{}`. Use `tools --detailed` to confirm.
- **Example**: `call genalpha_stake_aiusd --params '{"amount":"100"}'` if server expects amount.

### genalpha_unstake_aiusd

- **Purpose**: Unstake AIUSD (e.g. redeem sAIUSD).
- **When to use**: User says unstake, redeem.
- **Params**: Per MCP server schema; pass `{}` if none.
- **Example**: `call genalpha_unstake_aiusd --params '{}'` or pass amount/position per server.

### genalpha_withdraw_to_wallet

- **Purpose**: Withdraw stablecoin (e.g. USDC) to user-specified external wallet address.
- **When to use**: User says withdraw, transfer out.
- **Params**: Per MCP server schema; often amount, address, chain/asset; pass `{}` if none.
- **Example**: `call genalpha_withdraw_to_wallet --params '{"amount":"100","address":"0x...","asset":"USDC"}'` (param names per server).

### genalpha_ensure_gas

- **Purpose**: Top up native Gas for user trading account on a given chain.
- **When to use**: User says top up gas, ensure gas, or chain has low gas.
- **Params**: Per MCP server schema; often `chain_id`; pass `{}` if none.
- **Example**: `call genalpha_ensure_gas --params '{"chain_id":"solana:mainnet-beta"}'`.

### genalpha_get_transactions

- **Purpose**: Return user transaction history (list, may include status).
- **When to use**: User asks history, recent transactions, order status.
- **Params** (JSON): Usually `limit` (number), e.g. 10.
- **Example**: `call genalpha_get_transactions --params '{"limit":10}'`.

### recharge / top up

- **Purpose**: Guide user to recharge their AIUSD account with funds.
- **When to use**: User asks to recharge, top up, deposit, or add funds to their account.
- **Response Options**:
  - **Option 1 - Direct deposit**: Only USDC stablecoins accepted. Other stablecoins must use official website.
  - **Option 2 - Official website**: https://aiusd.ai (supports all tokens, login with same wallet)
- **Important**: For direct deposits, only send USDC to the provided addresses. For other stablecoins (USDT, DAI, etc.), user must use the official website.
- **Example response**: "For recharge, you have two options: 1) Direct USDC deposit to your trading addresses, or 2) Visit https://aiusd.ai for all token types (login with same wallet). Direct deposits only accept USDC - other stablecoins must use the website."

### reauth / login (Re-authenticate)

- **Purpose**: Clear all cached auth and run OAuth login again.
- **When to use**: User has 401 Unauthorized, "Session ID is required", token expired, auth failure, user asks to re-login, or switch account.
- **Params**: None. Pass `{}`.
- **Example**:
  - `npm run reauth`
  - `npm run login`
  - `node scripts/reauth.js`
- **Steps**:
  1. Clear mcporter cache (`~/.mcporter/`)
  2. Clear local token file (`~/.mcp-hub/`)
  3. Clear other auth cache files
  4. Start browser OAuth login
  5. Verify new auth works
- **Sample dialogue**:
  ```
  User: "I'm getting 401"
  Claude: Looks like an auth issue; re-authenticating...
  [Run: npm run reauth]
  Claude: Re-auth done; you can use the skill again.

  User: "Re-login"
  Claude: Clearing cache and re-logging in...
  [Run: npm run login]
  ```

## Usage Flow (for Agent Reasoning)

1. **Parse intent**: Map natural language to a tool using the "Typical user intents" column.
2. **Prepare params**: Use `{}` for no-param tools; for others build JSON from above or `tools --detailed` schema.
3. **Call**: Invoke the skill's call interface with tool name and params.
4. **Handle result**: Format tool JSON/text for the user; on error, retry or prompt (e.g. auth expired → prompt re-login).

## Auth and Error Handling

### Auth error auto-fix

On auth-related errors, Claude should run re-auth:

- **401 Unauthorized** → run `npm run reauth`
- **Session ID is required** → run `npm run reauth`
- **Token invalid or expired** → run `npm run reauth`
- **Auth failed** → run `npm run reauth`

### Error handling flow

1. **Detect auth error** → run `npm run reauth`
2. **Business error** → relay server error to user; do not invent causes
3. **Network/timeout** → retry once; then ask user to check network or try later
4. **Trading issues/failures** → direct user to official website https://aiusd.ai for manual operations and support

### Sample error dialogues

#### Auth Error
```
User: "Check balance"
[Tool returns 401]
Claude: Auth expired; re-authenticating...
[Run: npm run reauth]
Claude: Re-auth done. Fetching balance...
[Call: genalpha_get_balances]
```

#### Trading Error
```
User: "Buy 100 USDC worth of SOL"
[Tool returns trading error]
Claude: I encountered an issue with the trade execution. For manual trading operations, please visit https://aiusd.ai and use the same wallet you use for authentication.
```

## Getting Full Schema

At runtime, get each tool's full parameter schema with:

- `aiusd-skill tools --detailed`

Output includes each tool's `inputSchema`; use it to build `--params` JSON.

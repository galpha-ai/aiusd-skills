# AIUSD Skill - Official MCP TypeScript Client

Full AIUSD MCP (Model Context Protocol) skill package using the official TypeScript SDK, resolving the 401 "Session ID is required" issue.

## What This Solves

- **Correct MCP implementation** – Official SDK, automatic initialize handshake and Session ID handling
- **Bearer token auth** – Multiple token sources with priority
- **Unified toolchain** – Node.js only, no Python
- **Type safety** – Full TypeScript
- **Production ready** – Officially maintained, protocol-compatible

## Quick Start

### 1. Install dependencies

```bash
# Build the project
npm install
npm run build

# Package as .skill file
npm run build-skill
```

### 2. Set up auth (choose one)

#### Method A: Environment variable (simplest)
```bash
# Get token from https://chatgpt.dev.alpha.dev/oauth/login
export MCP_HUB_TOKEN="Bearer eyJ..."
```

#### Method B: mcporter (recommended)
```bash
# Use mcporter directly (recommended)
npx mcporter list --http-url https://mcp.alpha.dev/api/mcp-hub/mcp --name aiusd

# Or install mcporter first
npm install -g mcporter
mcporter list --http-url https://mcp.alpha.dev/api/mcp-hub/mcp --name aiusd
```

#### Re-login (clear cache)
If you hit auth issues or need to switch accounts:
```bash
# Clear all cache and re-login
npm run reauth
# or
npm run login

# Or run script directly
node scripts/reauth.js
```

**Re-login clears:**
- mcporter cache (`~/.mcporter/`)
- Local token file (`~/.mcp-hub/`)
- Other auth cache files
- Then runs a fresh OAuth flow

#### Method C: CLI argument
```bash
aiusd-skill --token "Bearer eyJ..." tools
```

### 3. Basic usage

```bash
# Test connection
npm run test
# or aiusd-skill test

# Re-login (if auth issues)
npm run reauth

# List all tools
aiusd-skill tools

# Get account balance
aiusd-skill balances

# Get trading accounts
aiusd-skill accounts

# Transaction history
aiusd-skill transactions --limit 5

# Call a tool directly
aiusd-skill call genalpha_get_balances
```

## Command reference

### Global options
```bash
-s, --server <url>     MCP server URL (default: https://mcp.alpha.dev/api/mcp-hub/mcp)
-t, --token <token>    Bearer token
--timeout <ms>         Request timeout (default: 30000ms)
--help                 Show help
--version              Show version
```

### Commands

#### `test` – Test connection
```bash
aiusd-skill test
```

#### `tools` – List tools
```bash
aiusd-skill tools                 # Short list
aiusd-skill tools --detailed      # With details
```

#### `call` – Call a tool
```bash
# Basic call
aiusd-skill call genalpha_get_balances

# With params
aiusd-skill call genalpha_execute_intent \
  --params '{"chain_id":"solana:mainnet-beta", "intent":"<buy>...</buy>"}'

# Pretty output
aiusd-skill call genalpha_get_balances --pretty
```

#### Shortcuts
```bash
aiusd-skill balances              # Get balance
aiusd-skill accounts              # Get accounts
aiusd-skill transactions -l 10    # Last 10 transactions
```

## Project structure

```
src/
├── index.ts           # Entry and error handling
├── cli.ts             # CLI
├── mcp-client.ts      # MCP client (official SDK)
└── token-manager.ts   # Token and multi-source support

dist/                  # Build output
package.json           # Project config
tsconfig.json          # TypeScript config
build.sh               # Build script
test-client.sh         # Test script
```

## Auth configuration

### Token source priority
1. **CLI** – `--token "Bearer xxx"`
2. **Env** – `MCP_HUB_TOKEN` or `AIUSD_TOKEN`
3. **mcporter** – Auto-detect mcporter auth
4. **Local files**:
   - `~/.mcp-hub/token.json`
   - `~/.mcporter/auth.json`

### Getting a token
Visit https://chatgpt.dev.alpha.dev/oauth/login to complete OAuth and copy the JWT token.

## Development and testing

### Build
```bash
./build.sh                    # Full build and verify
npm run build                 # Compile only
npm run dev                   # Dev mode
```

### Run tests
```bash
./test-client.sh              # Full test suite
npm test                      # Basic connection test
npm run build && node dist/index.js --help  # Manual check
```

### Global install
```bash
npm install -g .
aiusd-client --help           # Global command
```

## Comparison with previous approach

| Feature | Hand-written | Official SDK |
|--------|---------------|--------------|
| **Protocol** | May be incomplete | Officially supported |
| **Session** | Manual | Auto-handled |
| **Errors** | Custom | Standardized |
| **Maintenance** | High | Low |
| **Types** | Partial | Full |
| **Dependencies** | Manual | npm ecosystem |

## Example success output

```bash
$ aiusd-skill test
ℹ️ Testing connection to MCP server...
✅ Authentication token found
🔄 Connecting to MCP server: https://mcp.alpha.dev/api/mcp-hub/mcp
✅ Successfully connected to MCP server
✅ Connection test successful

📋 Connection Info:
{
  "connected": true,
  "serverUrl": "https://mcp.alpha.dev/api/mcp-hub/mcp",
  "client": "aiusd-skills v1.0.0"
}
✅ Disconnected from MCP server

$ aiusd-skill balances --pretty
✅ Authentication token found
🔄 Connecting to MCP server: https://mcp.alpha.dev/api/mcp-hub/mcp
✅ Successfully connected to MCP server
ℹ️ Calling tool: genalpha_get_balances
🔄 Calling tool: genalpha_get_balances
✅ Tool 'genalpha_get_balances' executed successfully

📋 Tool Result:
{
  "balances": {
    "custody": "4837.69 AIUSD",
    "staking": "5892.50 sAIUSD",
    "total_value_usd": "10730.19"
  }
}
```

## Working with mcporter

This client works with mcporter:

1. **mcporter** – OAuth and tool invocation
2. **aiusd-client** – CLI and automatic token detection

### Using mcporter
```bash
# Call a tool
npx mcporter call --http-url https://mcp.alpha.dev/api/mcp-hub/mcp --name aiusd.genalpha_get_balances

# List tools
npx mcporter list --http-url https://mcp.alpha.dev/api/mcp-hub/mcp --name aiusd
```

## Build and distribution

### Package as Skill

```bash
# Build and package as .skill file
npm run build-skill
```

This produces:
- `build/aiusd-skill-agent.skill` – Full skill package
- `build/build-info.json` – Build metadata
- `build/README.md` – Distribution notes

### Directory layout

```
aiusd-skills/
├── src/                        # TypeScript source
├── dist/                       # Compiled JS
├── build/                      # Final artifacts (can commit)
│   ├── aiusd-skill-agent.skill # Skill package
│   ├── build-info.json        # Metadata
│   └── README.md               # Distribution notes
├── scripts/                    # Build and tool scripts
└── docs/                       # Documentation
```

### Using the packaged Skill

```bash
# Extract skill package
tar -xzf build/aiusd-skill-agent.skill

# Or copy to target
cp build/aiusd-skill-agent.skill /path/to/claude-code/skills/
```

**build/ directory:**
- Can be committed to Git (versioning and distribution)
- Can include full node_modules (zero-dependency run)
- Self-contained (no extra install steps)
- Suitable for CI/CD and automated distribution

### Two client options
```bash
# mcporter (direct tool call)
npx mcporter call --http-url https://mcp.alpha.dev/api/mcp-hub/mcp --name aiusd.genalpha_get_balances

# This client (CLI)
aiusd-skill balances --pretty
```

This implementation uses the official SDK to address the technical requirements while keeping long-term maintainability and protocol compatibility.

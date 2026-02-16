#!/usr/bin/env node

/**
 * AIUSD Skill - EVM Wallet OAuth
 *
 * Authenticates with AIUSD via challenge/verify flow using an EVM wallet.
 * Supports both non-interactive (headless/bot) and interactive modes.
 *
 * Wallet sources (priority order):
 * 1. --private-key <hex>         CLI argument
 * 2. AIUSD_PRIVATE_KEY env var   Environment variable
 * 3. --mnemonic <phrase>         CLI argument (restore existing wallet)
 * 4. AIUSD_MNEMONIC env var      Environment variable
 * 5. Generate new random wallet  (interactive mode only, skipped with --non-interactive)
 *
 * Flow:
 * 1. Resolve or generate EVM wallet
 * 2. Call /auth/challenge with wallet address
 * 3. Sign the challenge message with the wallet
 * 4. Call /auth/verify with signature
 * 5. Save access_token to ~/.mcp-hub/token.json
 */

import { Wallet } from 'ethers';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { homedir } from 'os';
import { createInterface } from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

const CHALLENGE_URL = 'https://production.alpha.dev/api/user-service/v1/auth/challenge';
const VERIFY_URL = 'https://production.alpha.dev/api/user-service/v1/auth/verify';
const MCP_HUB_DIR = join(homedir(), '.mcp-hub');
const TOKEN_FILE = join(MCP_HUB_DIR, 'token.json');

// Parse CLI flags
const args = process.argv.slice(2);
function getArg(name) {
  const idx = args.indexOf(name);
  return idx !== -1 && idx + 1 < args.length ? args[idx + 1] : null;
}
const NON_INTERACTIVE = args.includes('--non-interactive');
const CLI_PRIVATE_KEY = getArg('--private-key');
const CLI_MNEMONIC = getArg('--mnemonic');

const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
  reset: '\x1b[0m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step, message) {
  log(`\n${step}. ${message}`, 'blue');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function askConfirmation(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(/^y|yes$/i.test(answer.trim()));
    });
  });
}

async function callApi(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || data.error || `HTTP ${res.status}`);
  }
  return data;
}

/**
 * Resolve wallet from CLI args, env vars, or generate a new one.
 * Returns { wallet, isNew, mnemonic? }
 */
function resolveWallet() {
  // 1. Private key from CLI
  const privateKey = CLI_PRIVATE_KEY || process.env.AIUSD_PRIVATE_KEY;
  if (privateKey) {
    const key = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
    return { wallet: new Wallet(key), isNew: false };
  }

  // 2. Mnemonic from CLI or env
  const mnemonic = CLI_MNEMONIC || process.env.AIUSD_MNEMONIC;
  if (mnemonic) {
    return { wallet: Wallet.fromPhrase(mnemonic.trim()), isNew: false };
  }

  // 3. Generate new wallet
  const wallet = Wallet.createRandom();
  return { wallet, isNew: true, mnemonic: wallet.mnemonic?.phrase };
}

async function run() {
  try {
    log('\n🔐 AIUSD Skill - EVM Wallet OAuth', 'magenta');
    log('====================================', 'magenta');

    // Step 1: Resolve wallet
    logStep(1, 'Resolving EVM wallet');
    const { wallet, isNew, mnemonic } = resolveWallet();
    const address = wallet.address;

    if (isNew) {
      if (NON_INTERACTIVE) {
        // Non-interactive: output mnemonic as structured JSON to stdout for the agent to capture
        log('Generated new wallet (non-interactive mode)', 'cyan');
        log(`Wallet address: ${address}`, 'cyan');
        log(`Mnemonic: ${mnemonic}`, 'cyan');
        logWarning('Save the mnemonic securely. Pass it as AIUSD_MNEMONIC env var or --mnemonic on next run to reuse this wallet.');
      } else {
        log('');
        log('⚠️  SAVE YOUR MNEMONIC SECURELY. You need it to recover this wallet.', 'yellow');
        log('   Anyone with this mnemonic can control the wallet and your AIUSD account.', 'yellow');
        log('');
        log('Mnemonic (12 words):', 'bold');
        log(`   ${mnemonic}`, 'cyan');
        log('');
        log('Wallet address:', 'bold');
        log(`   ${address}`, 'cyan');
        log('');

        const confirmed = await askConfirmation('Have you saved the mnemonic? (y/n): ');
        if (!confirmed) {
          logWarning('Please save the mnemonic and run `npm run oauth` again.');
          process.exit(1);
        }
      }
    } else {
      logSuccess(`Using existing wallet: ${address}`);
    }

    // Step 2: Call challenge API
    logStep(2, 'Requesting auth challenge');
    const challengeRes = await callApi(CHALLENGE_URL, {
      domain: 'aiusd.ai',
      chain_id: 'eip155:1',
      address: address.toLowerCase(),
    });

    if (!challengeRes.success || !challengeRes.data) {
      throw new Error(challengeRes.message || 'Challenge request failed');
    }

    const { challenge_id, message } = challengeRes.data;
    logSuccess('Challenge received');

    // Step 3: Sign message
    logStep(3, 'Signing challenge message');
    const hexSignature = await wallet.signMessage(message);

    // Convert hex signature to base64 (API expects base64)
    const sigBytes = Buffer.from(hexSignature.slice(2), 'hex');
    const signature = sigBytes.toString('base64');

    logSuccess('Message signed');

    // Step 4: Call verify API
    logStep(4, 'Verifying signature and obtaining token');
    const verifyRes = await callApi(VERIFY_URL, {
      challenge_id,
      signature,
    });

    if (!verifyRes.success || !verifyRes.data?.access_token) {
      throw new Error(verifyRes.message || 'Verify request failed');
    }

    const { access_token, expires_in } = verifyRes.data;
    const expiresIn = expires_in ?? 86400;

    logSuccess('Authentication successful');

    // Step 5: Save token (clear mcporter credentials first so new token takes precedence)
    logStep(5, 'Saving token for MCP');
    const mcporterDir = join(homedir(), '.mcporter');
    if (existsSync(mcporterDir)) {
      try {
        rmSync(mcporterDir, { recursive: true });
        log('Cleared old mcporter credentials so new token is used', 'cyan');
      } catch (e) {
        logWarning(`Could not clear mcporter: ${e.message}`);
      }
    }
    mkdirSync(MCP_HUB_DIR, { recursive: true });

    const tokenData = {
      token: access_token.startsWith('Bearer ') ? access_token : `Bearer ${access_token}`,
      timestamp: Math.floor(Date.now() / 1000),
      expires_in: expiresIn,
    };

    writeFileSync(TOKEN_FILE, JSON.stringify(tokenData, null, 2), 'utf8');
    logSuccess(`Token saved to ${TOKEN_FILE}`);

    // Verify with MCP
    logStep(6, 'Verifying MCP connection');
    const { execSync } = await import('child_process');
    try {
      execSync('node dist/index.js test', {
        cwd: projectRoot,
        encoding: 'utf8',
        timeout: 15000,
      });
      logSuccess('MCP connection verified');
    } catch (err) {
      logWarning('MCP test failed; token was saved. Run `node dist/index.js test` to verify.');
    }

    log('');
    log('🎉 OAuth completed successfully!', 'green');
    log(`💡 Wallet: ${address}`, 'cyan');
    log('💡 Token stored in ~/.mcp-hub/token.json', 'cyan');
    log('');
  } catch (error) {
    logError(`OAuth failed: ${error.message}`);
    process.exit(1);
  }
}

// Help
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
🔐 AIUSD Skill - EVM Wallet OAuth

Authenticate with AIUSD using an EVM wallet (no browser required).
Supports non-interactive mode for headless/remote bot environments.

Usage:
  node scripts/oauth.js [options]
  npm run oauth

Wallet sources (priority order):
  --private-key <hex>       Use an existing private key
  AIUSD_PRIVATE_KEY=<hex>   Private key via environment variable
  --mnemonic <phrase>       Restore wallet from mnemonic phrase
  AIUSD_MNEMONIC=<phrase>   Mnemonic via environment variable
  (none)                    Generate a new random wallet

Options:
  --non-interactive    Skip interactive prompts (for headless/bot environments)
  --private-key <key>  EVM private key (hex, with or without 0x prefix)
  --mnemonic <phrase>  12-word mnemonic to restore an existing wallet
  --help, -h           Show this help message

Examples:
  # Interactive (new wallet, prompts to save mnemonic)
  npm run oauth

  # Non-interactive with new wallet (bot/headless)
  node scripts/oauth.js --non-interactive

  # Reuse existing wallet via mnemonic
  node scripts/oauth.js --mnemonic "word1 word2 ... word12"

  # Reuse existing wallet via private key
  AIUSD_PRIVATE_KEY=0xabc123... node scripts/oauth.js --non-interactive

  # Re-authenticate same wallet (env var set by bot)
  AIUSD_MNEMONIC="word1 word2 ... word12" node scripts/oauth.js --non-interactive
`);
  process.exit(0);
}

run().catch(console.error);

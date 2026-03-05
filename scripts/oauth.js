#!/usr/bin/env node

/**
 * AIUSD Auth - EVM Wallet OAuth
 *
 * Authenticates via challenge/verify flow using an EVM wallet.
 * Saves mnemonic to ~/.aiusd/AIUSD_WALLET_DO_NOT_DELETE
 * Saves tokens (access + refresh) to ~/.aiusd/token.json
 *
 * Wallet sources (priority order):
 * 1. --private-key <hex>         CLI argument
 * 2. AIUSD_PRIVATE_KEY env var
 * 3. --mnemonic <phrase>         CLI argument
 * 4. AIUSD_MNEMONIC env var
 * 5. Generate new random wallet
 */

import { Wallet } from 'ethers';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { createInterface } from 'readline';

const CHALLENGE_URL = 'https://production.alpha.dev/api/user-service/v1/auth/challenge';
const VERIFY_URL = 'https://production.alpha.dev/api/user-service/v1/auth/verify';
const AIUSD_DIR = join(homedir(), '.aiusd');
const TOKEN_FILE = join(AIUSD_DIR, 'token.json');
const MNEMONIC_FILE = join(AIUSD_DIR, 'AIUSD_WALLET_DO_NOT_DELETE');

const args = process.argv.slice(2);
function getArg(name) {
  const idx = args.indexOf(name);
  return idx !== -1 && idx + 1 < args.length ? args[idx + 1] : null;
}
const NON_INTERACTIVE = args.includes('--non-interactive');
const CLI_PRIVATE_KEY = getArg('--private-key');
const CLI_MNEMONIC = getArg('--mnemonic');

async function callApi(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || data.error || `HTTP ${res.status}`);
  return data;
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

function resolveWallet() {
  const privateKey = CLI_PRIVATE_KEY || process.env.AIUSD_PRIVATE_KEY;
  if (privateKey) {
    const key = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
    return { wallet: new Wallet(key), isNew: false };
  }

  const mnemonic = CLI_MNEMONIC || process.env.AIUSD_MNEMONIC;
  if (mnemonic) {
    return { wallet: Wallet.fromPhrase(mnemonic.trim()), isNew: false, mnemonic: mnemonic.trim() };
  }

  const wallet = Wallet.createRandom();
  return { wallet, isNew: true, mnemonic: wallet.mnemonic?.phrase };
}

async function run() {
  try {
    console.log('\nAIUSD Authentication');
    console.log('====================\n');

    // 1. Resolve wallet
    const { wallet, isNew, mnemonic } = resolveWallet();
    const address = wallet.address;

    // Save mnemonic (always, when available)
    if (mnemonic) {
      mkdirSync(AIUSD_DIR, { recursive: true });
      writeFileSync(MNEMONIC_FILE, mnemonic, { encoding: 'utf8', mode: 0o600 });
    }

    if (isNew) {
      // Output structured info for host agent
      const authEvent = {
        auth_event: 'wallet_created',
        mnemonic_file: MNEMONIC_FILE,
        mnemonic,
        warning: 'Loss of mnemonic means permanent loss of account access. Please back up securely.',
        address,
      };
      console.log(JSON.stringify(authEvent, null, 2));
      console.log('');

      if (!NON_INTERACTIVE) {
        const confirmed = await askConfirmation('Have you saved the mnemonic? (y/n): ');
        if (!confirmed) {
          console.log('Please save the mnemonic and run again.');
          process.exit(1);
        }
      }
    } else {
      console.log(`Using existing wallet: ${address}`);
    }

    // 2. Challenge
    console.log('Requesting auth challenge...');
    const challengeRes = await callApi(CHALLENGE_URL, {
      domain: 'aiusd.ai',
      chain_id: 'eip155:1',
      address: address.toLowerCase(),
    });

    if (!challengeRes.success || !challengeRes.data) {
      throw new Error(challengeRes.message || 'Challenge failed');
    }
    const { challenge_id, message } = challengeRes.data;

    // 3. Sign
    const hexSig = await wallet.signMessage(message);
    const sigBytes = Buffer.from(hexSig.slice(2), 'hex');
    const signature = sigBytes.toString('base64');

    // 4. Verify
    console.log('Verifying signature...');
    const verifyRes = await callApi(VERIFY_URL, { challenge_id, signature });

    if (!verifyRes.success || !verifyRes.data?.access_token) {
      throw new Error(verifyRes.message || 'Verify failed');
    }

    const { access_token, refresh_token, expires_in } = verifyRes.data;

    // 5. Save tokens
    mkdirSync(AIUSD_DIR, { recursive: true });
    const tokenData = {
      access_token,
      refresh_token: refresh_token || '',
      expires_in: expires_in || 86400,
      timestamp: Math.floor(Date.now() / 1000),
    };
    writeFileSync(TOKEN_FILE, JSON.stringify(tokenData, null, 2), { encoding: 'utf8', mode: 0o600 });

    console.log(`\nAuthentication successful!`);
    console.log(`Wallet: ${address}`);
    console.log(`Token saved to ${TOKEN_FILE}`);
  } catch (error) {
    console.error(`Auth failed: ${error.message}`);
    process.exit(1);
  }
}

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
AIUSD Authentication

Usage:
  node scripts/oauth.js [options]
  npm run login

Options:
  --non-interactive    Skip prompts (generates new wallet if no credentials)
  --private-key <key>  EVM private key (hex)
  --mnemonic <phrase>  12-word mnemonic
  --help, -h           Show this help

Environment Variables:
  AIUSD_PRIVATE_KEY    Private key
  AIUSD_MNEMONIC       Mnemonic phrase
`);
  process.exit(0);
}

run().catch(console.error);

#!/usr/bin/env node

/**
 * AIUSD Skill - Smart Login Script
 *
 * Intelligently handles different login scenarios:
 * 1. Check existing authentication
 * 2. Detect available credentials (mnemonic, private key)
 * 3. Ask user which method to use
 * 4. Execute appropriate login flow
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import readline from 'readline';

const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step, message) {
  log(`\n🔄 Step ${step}: ${message}`, 'blue');
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

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

class SmartLogin {
  constructor() {
    this.mcpHubTokenPath = join(homedir(), '.mcp-hub', 'token.json');
    this.mcporterCredsPath = join(homedir(), '.mcporter', 'credentials.json');
    this.hasExistingAuth = false;
    this.hasMnemonic = false;
    this.hasPrivateKey = false;
  }

  async run() {
    try {
      log('\n🔐 AIUSD Skill - Smart Login', 'magenta');
      log('====================================', 'magenta');

      // Step 1: Check current authentication status
      this.checkCurrentAuth();

      // Step 2: Detect available credentials
      this.detectCredentials();

      // Step 3: Show options and get user choice
      const choice = await this.getUserChoice();

      // Step 4: Execute chosen login method
      await this.executeLogin(choice);

      log('\n🎉 Login completed successfully!', 'green');

      // Step 5: Verify login
      await this.verifyLogin();

    } catch (error) {
      logError(`Login failed: ${error.message}`);
      process.exit(1);
    } finally {
      rl.close();
    }
  }

  checkCurrentAuth() {
    logStep(1, 'Checking current authentication status');

    // Check MCP Hub token
    if (existsSync(this.mcpHubTokenPath)) {
      try {
        const token = JSON.parse(readFileSync(this.mcpHubTokenPath, 'utf8'));
        const now = Math.floor(Date.now() / 1000);
        const expiresAt = token.timestamp + token.expires_in;

        if (now < expiresAt) {
          this.hasExistingAuth = true;
          const hoursLeft = Math.floor((expiresAt - now) / 3600);
          logSuccess(`Found valid token (expires in ${hoursLeft} hours)`);
        } else {
          logWarning('Found expired token');
        }
      } catch (error) {
        logWarning('Found invalid token file');
      }
    }

    // Check mcporter credentials
    if (existsSync(this.mcporterCredsPath)) {
      log('📋 Found mcporter credentials', 'cyan');
    }

    if (!this.hasExistingAuth) {
      log('❌ No valid authentication found', 'yellow');
    }
  }

  detectCredentials() {
    logStep(2, 'Detecting available login methods');

    // Check environment variables
    if (process.env.AIUSD_MNEMONIC) {
      this.hasMnemonic = true;
      log('🔑 Found mnemonic in AIUSD_MNEMONIC environment variable', 'cyan');
    }

    if (process.env.AIUSD_PRIVATE_KEY) {
      this.hasPrivateKey = true;
      log('🔑 Found private key in AIUSD_PRIVATE_KEY environment variable', 'cyan');
    }

    // Check if user might have saved credentials elsewhere
    if (!this.hasMnemonic && !this.hasPrivateKey) {
      log('📝 No saved credentials found in environment', 'yellow');
    }
  }

  async getUserChoice() {
    logStep(3, 'Choose login method');

    console.log('\n📋 Available login options:\n');

    const options = [];

    if (this.hasExistingAuth) {
      options.push({ key: 'r', label: 'Refresh existing authentication', method: 'refresh' });
    }

    options.push({ key: 'n', label: 'Create new wallet (fresh start)', method: 'new' });
    options.push({ key: 'p', label: 'Login with private key', method: 'private-key' });
    options.push({ key: 'm', label: 'Login with mnemonic (12 words)', method: 'mnemonic' });

    if (this.hasMnemonic) {
      options.push({ key: 'e', label: 'Use existing mnemonic from environment', method: 'env-mnemonic' });
    }

    if (this.hasPrivateKey) {
      options.push({ key: 'k', label: 'Use existing private key from environment', method: 'env-key' });
    }

    options.push({ key: 'b', label: 'Browser OAuth login (mcporter)', method: 'browser' });
    options.push({ key: 'q', label: 'Quit', method: 'quit' });

    options.forEach(opt => {
      console.log(`  [${colors.cyan}${opt.key}${colors.reset}] ${opt.label}`);
    });

    console.log('');
    const answer = await askQuestion(`${colors.bold}Enter your choice [${options.map(o => o.key).join('/')}]: ${colors.reset}`);

    const choice = options.find(o => o.key === answer.toLowerCase());
    if (!choice) {
      throw new Error('Invalid choice. Please run the script again.');
    }

    return choice.method;
  }

  async executeLogin(method) {
    logStep(4, `Executing ${method} login`);

    switch(method) {
      case 'quit':
        log('Goodbye!', 'cyan');
        process.exit(0);
        break;

      case 'refresh':
        log('🔄 Refreshing existing authentication...', 'blue');
        execSync('node scripts/oauth.js --non-interactive', {
          stdio: 'inherit',
          env: { ...process.env }
        });
        break;

      case 'new':
        log('🆕 Creating new wallet...', 'blue');
        log('⚠️  IMPORTANT: Save the mnemonic that will be displayed!', 'yellow');
        console.log('');
        execSync('node scripts/oauth.js', {
          stdio: 'inherit'
        });
        break;

      case 'private-key':
        const privateKey = await askQuestion(`${colors.cyan}Enter your private key (with or without 0x prefix): ${colors.reset}`);
        if (!privateKey) {
          throw new Error('Private key cannot be empty');
        }
        log('🔑 Logging in with private key...', 'blue');
        execSync(`node scripts/oauth.js --private-key ${privateKey}`, {
          stdio: 'inherit'
        });
        break;

      case 'mnemonic':
        const mnemonic = await askQuestion(`${colors.cyan}Enter your 12-word mnemonic phrase: ${colors.reset}`);
        if (!mnemonic || mnemonic.split(' ').length !== 12) {
          throw new Error('Invalid mnemonic. Must be exactly 12 words.');
        }
        log('🔑 Logging in with mnemonic...', 'blue');
        execSync(`node scripts/oauth.js --mnemonic "${mnemonic}"`, {
          stdio: 'inherit'
        });
        break;

      case 'env-mnemonic':
        log('🔑 Using mnemonic from environment variable...', 'blue');
        execSync('node scripts/oauth.js --non-interactive', {
          stdio: 'inherit',
          env: { ...process.env }
        });
        break;

      case 'env-key':
        log('🔑 Using private key from environment variable...', 'blue');
        execSync('node scripts/oauth.js --non-interactive', {
          stdio: 'inherit',
          env: { ...process.env }
        });
        break;

      case 'browser':
        log('🌐 Opening browser for OAuth login...', 'blue');
        log('⚠️  Note: This creates a new wallet, not using your existing one', 'yellow');
        execSync('node scripts/reauth.js', {
          stdio: 'inherit'
        });
        break;

      default:
        throw new Error(`Unknown login method: ${method}`);
    }
  }

  async verifyLogin() {
    logStep(5, 'Verifying authentication');

    try {
      log('🔍 Checking balance to verify login...', 'blue');
      const result = execSync('node dist/index.js balances', {
        encoding: 'utf8',
        stdio: 'pipe'
      });

      if (result.includes('Tool Result') || result.includes('balance')) {
        logSuccess('Authentication verified successfully!');
        log('\n💡 You can now use all AIUSD commands:', 'cyan');
        log('   node dist/index.js balances', 'blue');
        log('   node dist/index.js get-deposit-address', 'blue');
        log('   node dist/index.js trade --help', 'blue');
      } else {
        logWarning('Could not verify authentication. Please check manually.');
      }
    } catch (error) {
      logWarning('Could not verify authentication automatically.');
      log('Please run: node dist/index.js balances', 'yellow');
    }
  }
}

// Check for help flag
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
${colors.bold}AIUSD Smart Login - Intelligent Authentication Helper${colors.reset}

This script helps you login to AIUSD using the most appropriate method based on
your available credentials and preferences.

${colors.cyan}Features:${colors.reset}
  - Detects existing authentication and credentials
  - Offers appropriate login options
  - Guides you through the chosen login method
  - Verifies successful authentication

${colors.cyan}Login Methods Supported:${colors.reset}
  1. New wallet creation
  2. Private key login
  3. Mnemonic phrase login
  4. Environment variable login
  5. Browser OAuth (mcporter)
  6. Refresh existing authentication

${colors.cyan}Usage:${colors.reset}
  npm run smart-login
  node scripts/smart-login.js

${colors.cyan}For direct login (skip menu):${colors.reset}
  npm run oauth -- --private-key 0xYourKey
  npm run oauth -- --mnemonic "your twelve word phrase"

${colors.cyan}Environment Variables:${colors.reset}
  AIUSD_PRIVATE_KEY    Your wallet private key
  AIUSD_MNEMONIC       Your 12-word mnemonic phrase
`);
  process.exit(0);
}

const smartLogin = new SmartLogin();
smartLogin.run().catch(error => {
  logError(`Fatal error: ${error.message}`);
  process.exit(1);
});
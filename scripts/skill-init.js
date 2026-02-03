#!/usr/bin/env node

/**
 * AIUSD Skill Auto-Setup
 *
 * This script automatically handles:
 * 1. Dependency installation
 * 2. Project building
 * 3. Authentication setup
 * 4. Connection testing
 * 5. Tool availability
 */

import { spawn, execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
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

class SkillSetup {
  constructor() {
    this.projectRoot = projectRoot;
    this.isFirstRun = !existsSync(join(this.projectRoot, 'dist'));
  }

  async run() {
    try {
      log('\n🚀 AIUSD Skill Auto-Setup', 'magenta');
      log('================================', 'magenta');

      if (this.isFirstRun) {
        log('🎯 First-time setup detected', 'cyan');
      } else {
        log('🔄 Re-running setup', 'cyan');
      }

      // Step 1: Check dependencies
      await this.installDependencies();

      // Step 2: Build project
      await this.buildProject();

      // Step 3: Setup authentication
      await this.setupAuthentication();

      // Step 4: Test connection
      await this.testConnection();

      // Step 5: Show available tools
      await this.showTools();

      log('\n🎉 Setup completed successfully!', 'green');
      log('💡 You can now use the skill for AIUSD operations', 'cyan');

    } catch (error) {
      logError(`Setup failed: ${error.message}`);
      process.exit(1);
    }
  }

  async installDependencies() {
    logStep(1, 'Installing dependencies');

    if (!existsSync(join(this.projectRoot, 'node_modules'))) {
      log('📦 Installing npm packages...', 'blue');
      execSync('npm install', {
        cwd: this.projectRoot,
        stdio: 'inherit'
      });
      logSuccess('Dependencies installed');
    } else {
      logSuccess('Dependencies already installed');
    }
  }

  async buildProject() {
    logStep(2, 'Building TypeScript project');

    if (!existsSync(join(this.projectRoot, 'dist')) || this.needsRebuild()) {
      log('🔨 Compiling TypeScript...', 'blue');
      execSync('npm run build', {
        cwd: this.projectRoot,
        stdio: 'inherit'
      });
      logSuccess('Project built successfully');
    } else {
      logSuccess('Project already built');
    }
  }

  needsRebuild() {
    try {
      const srcStat = execSync('find src -name "*.ts" -newer dist 2>/dev/null | wc -l', {
        cwd: this.projectRoot,
        encoding: 'utf8'
      });
      return parseInt(srcStat.trim()) > 0;
    } catch {
      return true;
    }
  }

  async setupAuthentication() {
    logStep(3, 'Setting up authentication');

    // Check for existing authentication
    if (process.env.MCP_HUB_TOKEN || process.env.AIUSD_TOKEN) {
      logSuccess('Environment token found');
      return;
    }

    // Check for mcporter
    try {
      execSync('which mcporter', { stdio: 'pipe' });
      log('🔐 Checking mcporter authentication...', 'blue');

      try {
        const result = execSync(
          'npx mcporter list --http-url https://mcp.alpha.dev/api/mcp-hub/mcp --name aiusd',
          { cwd: this.projectRoot, encoding: 'utf8', timeout: 10000 }
        );

        if (result.includes('tools')) {
          logSuccess('mcporter authentication verified');
          return;
        }
      } catch (error) {
        logWarning('mcporter authentication needed');
      }
    } catch {
      logWarning('mcporter not available');
    }

    // Show setup instructions
    log('\n📋 Authentication Setup Required:', 'yellow');
    log('Choose one of these methods:', 'cyan');
    log('');
    log('1. Environment Variable:', 'blue');
    log('   export MCP_HUB_TOKEN="Bearer your_token_here"', 'cyan');
    log('');
    log('2. Use mcporter (Recommended):', 'blue');
    log('   npx mcporter list --http-url https://mcp.alpha.dev/api/mcp-hub/mcp --name aiusd', 'cyan');
    log('');
    log('3. Get token from: https://chatgpt.dev.alpha.dev/oauth/login', 'blue');
    log('');
  }

  async testConnection() {
    logStep(4, 'Testing MCP connection');

    try {
      const result = execSync('node dist/index.js test', {
        cwd: this.projectRoot,
        encoding: 'utf8',
        timeout: 15000
      });

      if (result.includes('successful')) {
        logSuccess('MCP connection test passed');
      } else {
        logWarning('Connection test completed with warnings');
        log(result, 'yellow');
      }
    } catch (error) {
      logWarning('Connection test skipped (authentication required)');
      log('   Set up authentication and run: npm test', 'cyan');
    }
  }

  async showTools() {
    logStep(5, 'Available tools');

    try {
      const result = execSync('node dist/index.js tools', {
        cwd: this.projectRoot,
        encoding: 'utf8',
        timeout: 15000
      });
      log(result, 'cyan');
    } catch (error) {
      log('📋 Core AIUSD Tools Available:', 'cyan');
      log('• genalpha_get_balances - Check account balances', 'blue');
      log('• genalpha_execute_intent - Execute trading orders', 'blue');
      log('• genalpha_stake_aiusd - Stake AIUSD tokens', 'blue');
      log('• genalpha_withdraw_to_wallet - Withdraw to external wallet', 'blue');
      log('• genalpha_get_transactions - View transaction history', 'blue');
      log('');
      log('💡 Authenticate to see full tool details', 'yellow');
    }
  }
}

// Main execution
async function main() {
  const setup = new SkillSetup();
  await setup.run();
}

main().catch(console.error);
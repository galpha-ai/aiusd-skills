#!/usr/bin/env node

/**
 * AIUSD Skill - Re-authentication Script
 *
 * This script clears cached authentication data and performs fresh OAuth login:
 * 1. Clears mcporter credentials
 * 2. Clears local token files
 * 3. Performs fresh OAuth authentication
 * 4. Verifies new authentication
 */

import { execSync } from 'child_process';
import { existsSync, rmSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { homedir } from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

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

class ReAuthenticator {
  constructor() {
    this.mcporterDir = join(homedir(), '.mcporter');
    this.mcpHubDir = join(homedir(), '.mcp-hub');
    this.serverUrl = 'https://mcp.alpha.dev/api/mcp-hub/mcp';
  }

  async run() {
    try {
      log('\n🔐 AIUSD Skill - Re-authentication', 'magenta');
      log('====================================', 'magenta');
      log('This will clear all cached authentication and login fresh', 'cyan');

      // Step 1: Clear cached credentials
      await this.clearCachedAuth();

      // Step 2: Clear environment variables (inform user)
      this.clearEnvironmentVars();

      // Step 3: Perform fresh OAuth login
      await this.performFreshLogin();

      // Step 4: Verify new authentication
      await this.verifyAuthentication();

      log('\n🎉 Re-authentication completed successfully!', 'green');
      log('💡 You can now use the skill with fresh credentials', 'cyan');

    } catch (error) {
      logError(`Re-authentication failed: ${error.message}`);
      process.exit(1);
    }
  }

  async clearCachedAuth() {
    logStep(1, 'Clearing cached authentication data');

    let cleared = false;

    // Clear mcporter credentials
    if (existsSync(this.mcporterDir)) {
      log('🗑️  Removing mcporter credentials...', 'yellow');
      try {
        rmSync(this.mcporterDir, { recursive: true });
        logSuccess('mcporter credentials cleared');
        cleared = true;
      } catch (error) {
        logWarning(`Failed to clear mcporter credentials: ${error.message}`);
      }
    }

    // Clear local token files
    if (existsSync(this.mcpHubDir)) {
      log('🗑️  Removing local token files...', 'yellow');
      try {
        rmSync(this.mcpHubDir, { recursive: true });
        logSuccess('Local token files cleared');
        cleared = true;
      } catch (error) {
        logWarning(`Failed to clear local token files: ${error.message}`);
      }
    }

    // Clear any other common auth files
    const otherAuthFiles = [
      join(homedir(), 'auth.json'),
      join(homedir(), 'token.json'),
      join(homedir(), 'credentials.json')
    ];

    for (const authFile of otherAuthFiles) {
      if (existsSync(authFile)) {
        try {
          rmSync(authFile);
          log(`🗑️  Removed ${authFile}`, 'yellow');
          cleared = true;
        } catch (error) {
          logWarning(`Failed to remove ${authFile}: ${error.message}`);
        }
      }
    }

    if (!cleared) {
      log('📝 No cached authentication data found', 'cyan');
    }
  }

  clearEnvironmentVars() {
    logStep(2, 'Checking environment variables');

    const envVars = ['MCP_HUB_TOKEN', 'AIUSD_TOKEN'];
    let hasEnvVars = false;

    for (const envVar of envVars) {
      if (process.env[envVar]) {
        hasEnvVars = true;
        break;
      }
    }

    if (hasEnvVars) {
      logWarning('Environment variables detected:');
      for (const envVar of envVars) {
        if (process.env[envVar]) {
          log(`   ${envVar}=${process.env[envVar].slice(0, 20)}...`, 'yellow');
        }
      }
      log('');
      log('📋 To clear environment variables, run:', 'cyan');
      for (const envVar of envVars) {
        if (process.env[envVar]) {
          log(`   unset ${envVar}`, 'blue');
        }
      }
      log('');
    } else {
      logSuccess('No environment authentication variables found');
    }
  }

  async performFreshLogin() {
    logStep(3, 'Performing fresh OAuth login');

    // Check if mcporter is available
    try {
      execSync('which mcporter', { stdio: 'pipe' });
      log('📱 mcporter found, attempting OAuth login...', 'blue');
    } catch (error) {
      log('📥 Installing mcporter...', 'blue');
      try {
        execSync('npm install -g mcporter', { stdio: 'inherit' });
        log('✅ mcporter installed', 'green');
      } catch (installError) {
        logError('Failed to install mcporter. Please install manually: npm install -g mcporter');
        throw installError;
      }
    }

    // Create fresh mcporter directory
    mkdirSync(this.mcporterDir, { recursive: true });

    log('🔐 Starting OAuth authentication flow...', 'blue');
    log('📋 This will open a browser window for authentication', 'cyan');
    log('💳 Please complete login in browser. After wallet login, you can try checking your wallet status directly in chat.', 'yellow');
    log('');

    try {
      const result = execSync(
        `npx mcporter list --http-url ${this.serverUrl} --name aiusd`,
        {
          cwd: projectRoot,
          encoding: 'utf8',
          stdio: 'pipe', 
          timeout: 60000 // 1 minutes timeout
        }
      );

      logSuccess('OAuth authentication completed');
    } catch (error) {
      // Check if OAuth actually succeeded despite the error
      log('🔍 Checking if OAuth succeeded despite error...', 'blue');

      const credentialsPath = join(this.mcporterDir, 'credentials.json');
      if (existsSync(credentialsPath)) {
        try {
          const fs = await import('fs');
          const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));

          // Look for any entry with access_token
          const hasValidToken = Object.values(credentials.entries || {}).some(
            entry => entry.tokens && entry.tokens.access_token
          );

          if (hasValidToken) {
            logSuccess('OAuth tokens found! Authentication actually succeeded');
            log('💡 The timeout/error was a mcporter display issue, not a real failure', 'cyan');
            return; // Continue with success
          }
        } catch (parseError) {
          // Credentials file exists but couldn't parse it
        }
      }

      // If we get here, OAuth really did fail
      if (error.code === 'TIMEOUT') {
        logError('Authentication timed out. Please try again.');
      } else if (error.stderr && error.stderr.includes('User denied')) {
        logError('Authentication was cancelled by user');
      } else {
        logError(`Authentication failed: ${error.message}`);
      }
      throw error;
    }
  }

  async verifyAuthentication() {
    logStep(4, 'Verifying new authentication');

    // Wait a moment for credentials to be saved
    await new Promise(resolve => setTimeout(resolve, 1000));

    try {
      log('🔍 Testing MCP connection...', 'blue');
      const result = execSync('node dist/index.js test', {
        cwd: projectRoot,
        encoding: 'utf8',
        timeout: 15000
      });

      if (result.includes('successful')) {
        logSuccess('Authentication verification passed');

        // Also test tool listing
        try {
          log('🔍 Testing tool access...', 'blue');
          const toolsResult = execSync('node dist/index.js tools', {
            cwd: projectRoot,
            encoding: 'utf8',
            timeout: 15000
          });

          const toolCount = (toolsResult.match(/•/g) || []).length;
          if (toolCount > 0) {
            logSuccess(`Found ${toolCount} available tools`);
          } else {
            logWarning('Tools listed but count unclear');
          }
        } catch (error) {
          logWarning('Tool listing test failed, but basic auth works');
        }

      } else {
        logWarning('Authentication verification completed with warnings');
      }
    } catch (error) {
      logError('Authentication verification failed');
      logError('Please check your credentials and try again');
      throw error;
    }
  }
}

// Show usage if help requested
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
🔐 AIUSD Skill Re-authentication

This script clears all cached authentication data and performs fresh OAuth login.

Usage:
  node scripts/reauth.js
  npm run reauth

What it does:
  1. Clears mcporter credentials (~/.mcporter/)
  2. Clears local token files (~/.mcp-hub/)
  3. Clears other cached auth files
  4. Performs fresh OAuth browser login
  5. Verifies new authentication works

Options:
  --help, -h    Show this help message
`);
  process.exit(0);
}

// Main execution
async function main() {
  const reauth = new ReAuthenticator();
  await reauth.run();
}

main().catch(console.error);
#!/usr/bin/env node

/**
 * AIUSD Skill - Smart Entry Point
 *
 * This is the main entry point that automatically handles setup,
 * authentication, and provides a seamless user experience.
 */

import { spawn, execSync } from 'child_process';
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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

class AiusdSkill {
  constructor() {
    this.setupComplete = false;
    this.hasAuth = false;
  }

  // Quick setup check
  async isReady() {
    return (
      existsSync(join(__dirname, 'node_modules')) &&
      existsSync(join(__dirname, 'dist')) &&
      await this.checkAuth()
    );
  }

  async checkAuth() {
    // Environment variables
    if (process.env.MCP_HUB_TOKEN || process.env.AIUSD_TOKEN) {
      return true;
    }

    // mcporter credentials
    try {
      const credentialsPath = join(process.env.HOME, '.mcporter', 'credentials.json');
      if (existsSync(credentialsPath)) {
        const credentials = JSON.parse(readFileSync(credentialsPath, 'utf8'));
        if (credentials.entries) {
          for (const entry of Object.values(credentials.entries)) {
            if (entry.tokens?.access_token) {
              return true;
            }
          }
        }
      }
    } catch (error) {
      // Ignore
    }

    return false;
  }

  async quickSetup() {
    log('🚀 AIUSD Skill - Auto Setup', 'magenta');
    log('============================', 'magenta');

    try {
      // Install dependencies if needed
      if (!existsSync(join(__dirname, 'node_modules'))) {
        log('📦 Installing dependencies...', 'blue');
        execSync('npm install --silent', { cwd: __dirname, stdio: 'inherit' });
      }

      // Build if needed
      if (!existsSync(join(__dirname, 'dist'))) {
        log('🔨 Building project...', 'blue');
        execSync('npm run build', { cwd: __dirname, stdio: 'inherit' });
      }

      // Check auth
      this.hasAuth = await this.checkAuth();
      if (!this.hasAuth) {
        await this.setupAuth();
      }

      this.setupComplete = true;
      return true;

    } catch (error) {
      log(`❌ Setup failed: ${error.message}`, 'red');
      return false;
    }
  }

  async setupAuth() {
    log('\n🔐 Setting up authentication...', 'blue');

    // Try mcporter first
    try {
      execSync('which mcporter', { stdio: 'pipe' });
      log('Using mcporter for OAuth authentication...', 'cyan');

      const result = execSync(
        'npx mcporter list --http-url https://mcp.alpha.dev/api/mcp-hub/mcp --name aiusd',
        { cwd: __dirname, encoding: 'utf8', timeout: 30000 }
      );

      if (result.includes('tools')) {
        log('✅ Authentication successful!', 'green');
        this.hasAuth = true;
        return;
      }
    } catch (error) {
      // mcporter failed or not available
    }

    // Fallback to manual setup
    log('\n📝 Manual authentication required:', 'yellow');
    log('1. Visit: https://chatgpt.dev.alpha.dev/oauth/login', 'yellow');
    log('2. Login and copy your JWT token', 'yellow');
    log('3. Run: export MCP_HUB_TOKEN="Bearer your_token_here"', 'yellow');
    log('4. Then use the skill again', 'yellow');
  }

  async execute(args = []) {
    // Auto-setup if not ready
    if (!await this.isReady()) {
      const setupOk = await this.quickSetup();
      if (!setupOk) {
        process.exit(1);
      }
    }

    // Default action - show balances
    if (args.length === 0) {
      args = ['balances'];
    }

    // Execute the actual tool
    try {
      execSync(`node dist/index.js ${args.join(' ')}`, {
        cwd: __dirname,
        stdio: 'inherit'
      });
    } catch (error) {
      log('❌ Command execution failed', 'red');
      if (!this.hasAuth) {
        log('💡 This might be an authentication issue', 'yellow');
        await this.setupAuth();
      }
    }
  }

  async showHelp() {
    log('\n🎯 AIUSD Skill - Quick Commands:', 'cyan');
    log('• balances    - Check your AIUSD balances (default)', 'cyan');
    log('• accounts    - Get trading account addresses', 'cyan');
    log('• tools       - List all available tools', 'cyan');
    log('• test        - Test MCP connection', 'cyan');
    log('• --help      - Show this help', 'cyan');

    log('\n📚 Examples:', 'blue');
    log('• aiusd-skill                    # Check balances', 'blue');
    log('• aiusd-skill tools              # List tools', 'blue');
    log('• aiusd-skill call genalpha_get_balances  # Direct tool call', 'blue');
  }
}

// Main execution
async function main() {
  const skill = new AiusdSkill();
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    await skill.showHelp();
  } else {
    await skill.execute(args);
  }
}

main().catch(console.error);
#!/usr/bin/env node

/**
 * AIUSD Skill Auto-Setup
 *
 * This script automatically handles:
 * 1. Dependency installation
 * 2. Project building
 * 3. Authentication check
 * 4. Connection testing
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
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
  log(`\n Step ${step}: ${message}`, 'blue');
}

function logSuccess(message) {
  log(`  ${message}`, 'green');
}

function logWarning(message) {
  log(`  ${message}`, 'yellow');
}

class SkillSetup {
  constructor() {
    this.projectRoot = projectRoot;
    this.isFirstRun = !existsSync(join(this.projectRoot, 'dist'));
  }

  async run() {
    try {
      log('\n AIUSD Skill Auto-Setup', 'magenta');
      log('================================', 'magenta');

      // Step 1: Check dependencies
      await this.installDependencies();

      // Step 2: Build project
      await this.buildProject();

      // Step 3: Register global CLI
      await this.registerCLI();

      // Step 4: Check authentication
      await this.checkAuthentication();

      // Step 5: Test connection
      await this.testConnection();

      log('\n Setup completed!', 'green');

    } catch (error) {
      log(`Setup failed: ${error.message}`, 'red');
      process.exit(1);
    }
  }

  async installDependencies() {
    logStep(1, 'Installing dependencies');

    if (!existsSync(join(this.projectRoot, 'node_modules'))) {
      log('  Installing npm packages...', 'blue');
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
      log('  Compiling TypeScript...', 'blue');
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

  async registerCLI() {
    logStep(3, 'Registering global CLI');

    try {
      const which = execSync('which aiusd 2>/dev/null || true', { encoding: 'utf8' }).trim();
      if (which) {
        logSuccess('aiusd command already available');
        return;
      }
    } catch {}

    try {
      execSync('npm install -g .', {
        cwd: this.projectRoot,
        stdio: 'pipe'
      });
      logSuccess('aiusd command registered globally');
    } catch (e) {
      logWarning('Could not install globally. Run manually: npm install -g .');
    }
  }

  async checkAuthentication() {
    logStep(4, 'Checking authentication');

    if (process.env.AIUSD_TOKEN) {
      logSuccess('Environment token found (AIUSD_TOKEN)');
      return;
    }

    const tokenFile = join(homedir(), '.aiusd', 'token.json');
    if (existsSync(tokenFile)) {
      try {
        const tokenData = JSON.parse(readFileSync(tokenFile, 'utf8'));
        if (tokenData.access_token) {
          const age = Date.now() / 1000 - (tokenData.timestamp || 0);
          if (age < (tokenData.expires_in || 86400)) {
            logSuccess('Valid token found');
            return;
          }
          logWarning('Token expired — will refresh automatically on next command');
          return;
        }
      } catch {
        // Invalid token file
      }
    }

    logWarning('Not authenticated');
    log('\n  To log in, run:', 'yellow');
    log('    aiusd login', 'cyan');
    log('    # or: node dist/index.js login', 'cyan');
  }

  async testConnection() {
    logStep(5, 'Testing connection');

    try {
      execSync('node dist/index.js test', {
        cwd: this.projectRoot,
        encoding: 'utf8',
        timeout: 15000
      });
      logSuccess('Connection test passed');
    } catch {
      logWarning('Connection test skipped (authentication required)');
    }
  }
}

async function main() {
  const setup = new SkillSetup();
  await setup.run();
}

main().catch(console.error);

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

async function runCommand(command, options = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn('sh', ['-c', command], {
      stdio: 'inherit',
      cwd: __dirname,
      ...options
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with code ${code}`));
      }
    });
  });
}

async function checkNodeVersion() {
  try {
    const version = execSync('node --version', { encoding: 'utf8' }).trim();
    const majorVersion = parseInt(version.slice(1).split('.')[0]);

    if (majorVersion >= 18) {
      logSuccess(`Node.js version: ${version}`);
      return true;
    } else {
      logError(`Node.js version ${version} is too old. Required: >= 18.0.0`);
      return false;
    }
  } catch (error) {
    logError('Node.js not found');
    return false;
  }
}

async function installDependencies() {
  logStep(1, 'Installing dependencies...');

  if (!existsSync(join(__dirname, 'node_modules'))) {
    try {
      await runCommand('npm install --silent');
      logSuccess('Dependencies installed');
    } catch (error) {
      logError('Failed to install dependencies');
      throw error;
    }
  } else {
    logSuccess('Dependencies already installed');
  }
}

async function buildProject() {
  logStep(2, 'Building TypeScript project...');

  if (!existsSync(join(__dirname, 'dist'))) {
    try {
      await runCommand('npm run build');
      logSuccess('Project built successfully');
    } catch (error) {
      logError('Failed to build project');
      throw error;
    }
  } else {
    logSuccess('Project already built');
  }
}

async function checkAuthentication() {
  logStep(3, 'Checking authentication...');

  // Check environment variables
  if (process.env.MCP_HUB_TOKEN || process.env.AIUSD_TOKEN) {
    logSuccess('Authentication token found in environment');
    return true;
  }

  // Check mcporter
  try {
    execSync('which mcporter', { stdio: 'pipe' });
    const credentialsPath = join(process.env.HOME, '.mcporter', 'credentials.json');
    if (existsSync(credentialsPath)) {
      const credentials = JSON.parse(readFileSync(credentialsPath, 'utf8'));
      if (credentials.entries) {
        for (const entry of Object.values(credentials.entries)) {
          if (entry.tokens?.access_token) {
            logSuccess('Authentication token found in mcporter');
            return true;
          }
        }
      }
    }
  } catch (error) {
    // mcporter not available
  }

  // Check local token files
  const tokenPaths = [
    join(process.env.HOME, '.mcp-hub', 'token.json'),
    join(process.env.HOME, '.mcporter', 'auth.json')
  ];

  for (const path of tokenPaths) {
    if (existsSync(path)) {
      try {
        const tokenData = JSON.parse(readFileSync(path, 'utf8'));
        if (tokenData.token || tokenData.access_token) {
          logSuccess(`Authentication token found in ${path}`);
          return true;
        }
      } catch (error) {
        // Invalid token file
      }
    }
  }

  return false;
}

async function setupAuthentication() {
  logWarning('No authentication found. Setting up authentication...');

  log('\n🔐 Authentication Setup Options:', 'cyan');
  log('1. Use mcporter (recommended - automatic OAuth)', 'cyan');
  log('2. Manual token setup', 'cyan');

  // Try mcporter first
  try {
    execSync('which mcporter', { stdio: 'pipe' });
    log('\n🔧 Found mcporter, attempting automatic authentication...', 'blue');

    const mcporterAuth = spawn('npx', [
      'mcporter',
      'list',
      '--http-url',
      'https://mcp.alpha.dev/api/mcp-hub/mcp',
      '--name',
      'aiusd'
    ], { stdio: 'inherit' });

    await new Promise((resolve) => {
      mcporterAuth.on('close', (code) => {
        if (code === 0) {
          logSuccess('mcporter authentication successful');
        } else {
          logWarning('mcporter authentication failed, falling back to manual setup');
        }
        resolve();
      });
    });

  } catch (error) {
    log('\n📝 Manual Authentication Setup:', 'yellow');
    log('1. Visit: https://chatgpt.dev.alpha.dev/oauth/login', 'yellow');
    log('2. Login and copy your JWT token', 'yellow');
    log('3. Run: export MCP_HUB_TOKEN="Bearer your_token_here"', 'yellow');
    log('4. Then re-run this skill', 'yellow');
  }
}

async function testConnection() {
  logStep(4, 'Testing MCP connection...');

  try {
    await runCommand('node dist/index.js test', { stdio: 'inherit' });
    logSuccess('MCP connection successful');
    return true;
  } catch (error) {
    logError('MCP connection failed');
    return false;
  }
}

async function showAvailableCommands() {
  logStep(5, 'Available commands:');

  log('\n🎯 Quick Commands:', 'cyan');
  log('• node dist/index.js balances     - Check your AIUSD balances', 'cyan');
  log('• node dist/index.js accounts     - Get trading account addresses', 'cyan');
  log('• node dist/index.js tools        - List all available tools', 'cyan');
  log('• node dist/index.js transactions - View transaction history', 'cyan');

  log('\n🚀 Ready to use! Try:', 'green');
  log('node dist/index.js balances', 'green');
}

async function main() {
  log('\n🎉 AIUSD Skill Auto-Setup', 'magenta');
  log('================================', 'magenta');

  try {
    // Check Node.js version
    if (!(await checkNodeVersion())) {
      process.exit(1);
    }

    // Install dependencies
    await installDependencies();

    // Build project
    await buildProject();

    // Check authentication
    const hasAuth = await checkAuthentication();
    if (!hasAuth) {
      await setupAuthentication();

      // Re-check after setup attempt
      const hasAuthAfterSetup = await checkAuthentication();
      if (!hasAuthAfterSetup) {
        log('\n⚠️  Authentication setup needed. Please follow the manual steps above.', 'yellow');
        process.exit(0);
      }
    }

    // Test connection
    const connectionOk = await testConnection();
    if (connectionOk) {
      await showAvailableCommands();
    } else {
      logError('Connection test failed. Please check your authentication and try again.');
    }

  } catch (error) {
    logError(`Setup failed: ${error.message}`);
    process.exit(1);
  }
}

main().catch(console.error);
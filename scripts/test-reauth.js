#!/usr/bin/env node

/**
 * Test script for re-authentication functionality
 * This is a dry-run test that shows what would be cleared without actually doing it
 */

import { existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const colors = {
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testReauth() {
  log('🧪 Testing Re-authentication Script (Dry Run)', 'magenta');
  log('===============================================', 'magenta');

  const mcporterDir = join(homedir(), '.mcporter');
  const mcpHubDir = join(homedir(), '.mcp-hub');

  log('\n📋 Authentication Cache Status:', 'blue');

  // Check mcporter
  if (existsSync(mcporterDir)) {
    log('✅ mcporter directory found: ~/.mcporter/', 'green');

    const credentialsFile = join(mcporterDir, 'credentials.json');
    if (existsSync(credentialsFile)) {
      log('✅ mcporter credentials file found', 'green');
    } else {
      log('⚠️  mcporter credentials file not found', 'yellow');
    }
  } else {
    log('❌ mcporter directory not found: ~/.mcporter/', 'red');
  }

  // Check local token files
  if (existsSync(mcpHubDir)) {
    log('✅ Local token directory found: ~/.mcp-hub/', 'green');

    const tokenFile = join(mcpHubDir, 'token.json');
    if (existsSync(tokenFile)) {
      log('✅ Local token file found', 'green');
    } else {
      log('⚠️  Local token file not found', 'yellow');
    }
  } else {
    log('❌ Local token directory not found: ~/.mcp-hub/', 'red');
  }

  // Check environment variables
  log('\n🔍 Environment Variables:', 'blue');
  const envVars = ['MCP_HUB_TOKEN', 'AIUSD_TOKEN'];
  let hasEnvVars = false;

  for (const envVar of envVars) {
    if (process.env[envVar]) {
      log(`✅ ${envVar} is set`, 'green');
      hasEnvVars = true;
    } else {
      log(`❌ ${envVar} not set`, 'red');
    }
  }

  if (!hasEnvVars) {
    log('📝 No authentication environment variables found', 'cyan');
  }

  // Check other auth files
  log('\n🔍 Other Auth Files:', 'blue');
  const otherAuthFiles = [
    join(homedir(), 'auth.json'),
    join(homedir(), 'token.json'),
    join(homedir(), 'credentials.json')
  ];

  let foundOtherFiles = false;
  for (const authFile of otherAuthFiles) {
    if (existsSync(authFile)) {
      log(`✅ Found: ${authFile}`, 'green');
      foundOtherFiles = true;
    }
  }

  if (!foundOtherFiles) {
    log('📝 No other auth files found in home directory', 'cyan');
  }

  // Summary
  log('\n📊 Summary:', 'magenta');
  log('When you run "npm run reauth", the following will happen:', 'cyan');
  log('1. 🗑️  Clear mcporter credentials if they exist', 'yellow');
  log('2. 🗑️  Clear local token files if they exist', 'yellow');
  log('3. 🗑️  Clear other auth cache files if they exist', 'yellow');
  log('4. 🔐 Start fresh OAuth browser login', 'blue');
  log('5. ✅ Verify new authentication works', 'green');

  log('\n🚀 To actually run re-authentication:', 'blue');
  log('   npm run reauth', 'cyan');
  log('   npm run login', 'cyan');
  log('   node scripts/reauth.js', 'cyan');
}

testReauth().catch(console.error);
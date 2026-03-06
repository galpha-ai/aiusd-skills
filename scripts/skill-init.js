#!/usr/bin/env node

/**
 * AIUSD Skill Auto-Setup (postinstall hook)
 *
 * Runs automatically after `npm install` in the extracted .skill directory.
 * Registers the `aiusd` CLI globally so SKILL.md commands work.
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

const colors = {
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

try {
  log('\n AIUSD Skill Setup', 'magenta');

  // Register global CLI
  try {
    const which = execSync('which aiusd 2>/dev/null || true', { encoding: 'utf8' }).trim();
    if (!which) {
      execSync('npm install -g .', { cwd: projectRoot, stdio: 'pipe' });
      log('  aiusd command registered globally', 'green');
    } else {
      log('  aiusd command already available', 'green');
    }
  } catch (e) {
    const stderr = e.stderr ? e.stderr.toString().trim() : '';
    log(`  Could not install globally${stderr ? ': ' + stderr.split('\n')[0] : ''}`, 'yellow');
    log('  Fallback: use "node dist/index.js" instead of "aiusd"', 'yellow');
  }

  log('  Setup completed!\n', 'green');
} catch (error) {
  log(`  Setup failed: ${error.message}`, 'yellow');
}

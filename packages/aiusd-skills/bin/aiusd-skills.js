#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const SKILL_PKG = 'aiusd-skill';
const TARGET_DIR = 'aiusd-skill';

function log(msg, type = 'info') {
  const pref = { info: '\x1b[34m', success: '\x1b[32m', warn: '\x1b[33m', err: '\x1b[31m', reset: '\x1b[0m' };
  console.log(`${pref[type] || pref.info}${msg}${pref.reset}`);
}

function install() {
  const cwd = process.cwd();
  const targetPath = path.join(cwd, TARGET_DIR);
  const tmpDir = path.join(os.tmpdir(), `aiusd-skills-install-${Date.now()}`);

  if (fs.existsSync(targetPath)) {
    log(`Directory ${TARGET_DIR}/ already exists. Remove it first or choose another directory.`, 'warn');
    process.exit(1);
  }

  log('Installing AIUSD skill...', 'info');
  fs.mkdirSync(tmpDir, { recursive: true });

  try {
    log(`Fetching ${SKILL_PKG} from npm...`, 'info');
    execSync(`npm pack ${SKILL_PKG}`, { cwd: tmpDir, stdio: 'inherit' });

    const tgz = fs.readdirSync(tmpDir).find((f) => f.endsWith('.tgz'));
    if (!tgz) {
      log(`Failed to get ${SKILL_PKG} tarball. Is it published to npm?`, 'err');
      process.exit(1);
    }

    const packPath = path.join(tmpDir, tgz);
    const extractDir = path.join(tmpDir, 'extract');
    fs.mkdirSync(extractDir, { recursive: true });
    execSync(`tar -xzf "${packPath}"`, { cwd: extractDir, stdio: 'pipe' });

    const packageDir = path.join(extractDir, 'package');
    if (!fs.existsSync(packageDir)) {
      log('Unexpected tarball layout.', 'err');
      process.exit(1);
    }
    fs.renameSync(packageDir, targetPath);

    log('Installing dependencies...', 'info');
    execSync('npm install', { cwd: targetPath, stdio: 'inherit' });

    log('AIUSD skill installed successfully.', 'success');
    log('', 'info');
    log('Next steps:', 'info');
    log(`  cd ${TARGET_DIR}`, 'info');
    log('  npm install -g .          # make "aiusd" command available', 'info');
    log('  aiusd login               # authenticate', 'info');
    log('  aiusd balances            # check balance', 'info');
  } finally {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch (_) {}
  }
}

function help() {
  console.log(`
aiusd-skills - Install AIUSD skill

Usage:
  npx aiusd-skills install    Install skill into ./aiusd-skill

After install:
  cd aiusd-skill
  npm install -g .            # make "aiusd" command available
  aiusd login                 # authenticate
  aiusd balances              # check balance
`);
}

const cmd = process.argv[2];
if (cmd === 'install') {
  install();
} else {
  help();
}

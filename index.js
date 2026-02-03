#!/usr/bin/env node

/**
 * AIUSD Skill - Main Entry Point
 *
 * This is the main entry point for the AIUSD skill package.
 * It provides a simple interface that delegates to the setup script.
 */

import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Delegate to the setup script in scripts directory
const setupScript = join(__dirname, 'scripts', 'skill-init.js');

// Execute the setup script with all arguments
const child = spawn('node', [setupScript, ...process.argv.slice(2)], {
  stdio: 'inherit',
  cwd: __dirname
});

child.on('exit', (code) => {
  process.exit(code || 0);
});
#!/usr/bin/env node

/**
 * Build JS installer for AIUSD Skill
 * Creates a self-extracting JavaScript installer that can be uploaded as .js file
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync, rmSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

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

async function buildJSInstaller() {
  const packageName = 'aiusd-skill-installer';
  const installerFile = `${packageName}.js`;
  const buildOutputDir = join(projectRoot, 'build');
  const installerPath = join(buildOutputDir, installerFile);

  log('🚀 Building AIUSD Skill JS Installer...', 'magenta');

  try {
    // Step 1: Build TypeScript first
    log('🔨 Building TypeScript...', 'blue');
    execSync('npm run build', { cwd: projectRoot, stdio: 'inherit' });

    // Step 2: Create/clean build output directory
    if (!existsSync(buildOutputDir)) {
      mkdirSync(buildOutputDir, { recursive: true });
      log('📁 Created build output directory', 'blue');
    }

    if (existsSync(installerPath)) {
      log('🗑️  Removing previous JS installer...', 'yellow');
      rmSync(installerPath);
    }

    // Step 3: Read package.json for metadata
    const packageJson = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf8'));

    // Step 4: Create base64 encoded package data
    log('📦 Creating compressed package data...', 'blue');

    // Create temporary tarball
    const tempDir = join(buildOutputDir, 'temp-js-build');
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true });
    }
    mkdirSync(tempDir, { recursive: true });

    // Copy essential files (include patches/ for patch-package on npm install)
    const filesToInclude = [
      'package.json',
      'README.md',
      'SKILL.md',
      'scripts/',
      'dist/',
      'src/',
      'patches/',
      'tsconfig.json'
    ];

    for (const file of filesToInclude) {
      const srcPath = join(projectRoot, file);
      const destPath = join(tempDir, file);

      if (existsSync(srcPath)) {
        if (file.endsWith('/')) {
          execSync(`cp -R "${srcPath}" "${destPath}"`, { stdio: 'pipe' });
        } else {
          execSync(`cp "${srcPath}" "${destPath}"`, { stdio: 'pipe' });
        }
      }
    }

    // Create tarball and convert to base64
    const tarballPath = join(tempDir, 'package.tar.gz');
    execSync(`tar -czf "${tarballPath}" -C "${tempDir}" --exclude="*.tar.gz" .`, { stdio: 'pipe' });
    const packageData = readFileSync(tarballPath).toString('base64');

    // Step 5: Generate self-extracting JS installer
    log('⚡ Generating self-extracting installer...', 'blue');

    const installerTemplate = `#!/usr/bin/env node
/**
 * AIUSD Skill - Self-Extracting JavaScript Installer
 *
 * This file contains the complete AIUSD trading skill package.
 * Simply run: node ${installerFile}
 *
 * Generated: ${new Date().toISOString()}
 * Version: ${packageJson.version}
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const zlib = require('zlib');

const colors = {
  green: '\\x1b[32m',
  blue: '\\x1b[34m',
  yellow: '\\x1b[33m',
  red: '\\x1b[31m',
  magenta: '\\x1b[35m',
  cyan: '\\x1b[36m',
  reset: '\\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(\`\${colors[color]}\${message}\${colors.reset}\`);
}

async function install() {
  try {
    log('🚀 AIUSD Skill Installer', 'magenta');
    log('========================', 'magenta');
    log(\`📦 Version: ${packageJson.version}\`, 'blue');
    log('', 'reset');

    // Extract to current directory
    const installDir = process.cwd();
    const skillDir = path.join(installDir, 'aiusd-skill');

    log(\`📁 Installing to: \${skillDir}\`, 'blue');

    // Create skill directory
    if (fs.existsSync(skillDir)) {
      log('🗑️  Removing existing installation...', 'yellow');
      fs.rmSync(skillDir, { recursive: true });
    }
    fs.mkdirSync(skillDir, { recursive: true });

    // Decode and extract package data
    log('📦 Extracting skill package...', 'blue');
    const packageData = Buffer.from(PACKAGE_DATA, 'base64');
    const tarballPath = path.join(skillDir, 'package.tar.gz');
    fs.writeFileSync(tarballPath, packageData);

    // Extract tarball
    execSync(\`tar -xzf package.tar.gz\`, { cwd: skillDir, stdio: 'pipe' });
    fs.unlinkSync(tarballPath);

    // Install dependencies
    log('📥 Installing dependencies...', 'blue');
    try {
      execSync('npm install', { cwd: skillDir, stdio: 'inherit' });
      log('✅ Dependencies installed successfully', 'green');
    } catch (error) {
      log('⚠️  Warning: Failed to install dependencies automatically', 'yellow');
      log('   Please run: cd aiusd-skill && npm install', 'cyan');
    }

    log('', 'reset');
    log('🎉 AIUSD Skill installed successfully!', 'green');
    log('', 'reset');
    log('🚀 Next Steps:', 'yellow');
    log('1. cd aiusd-skill', 'blue');
    log('2. npm run setup', 'blue');
    log('', 'reset');
    log('💡 Usage Examples:', 'cyan');
    log('• Check balance: npm start -- balances', 'blue');
    log('• List tools: npm start -- tools', 'blue');
    log('• Get help: npm start -- --help', 'blue');
    log('', 'reset');

  } catch (error) {
    log(\`❌ Installation failed: \${error.message}\`, 'red');
    process.exit(1);
  }
}

// Package data (base64 encoded)
const PACKAGE_DATA = \`${packageData}\`;

// Auto-run installer
if (require.main === module) {
  install().catch(console.error);
}

module.exports = { install };
`;

    // Step 6: Write installer file
    writeFileSync(installerPath, installerTemplate);
    execSync(`chmod +x "${installerPath}"`);

    // Cleanup
    rmSync(tempDir, { recursive: true });

    // Step 7: Copy README.md and SKILL.md to build/ and write build-info.json
    const copyToBuild = (file) => {
      const src = join(projectRoot, file);
      const dest = join(buildOutputDir, file);
      if (existsSync(src)) {
        writeFileSync(dest, readFileSync(src, 'utf8'));
        log(`📄 Updated build/${file}`, 'cyan');
      }
    };
    copyToBuild('README.md');
    copyToBuild('SKILL.md');
    const jsStats = execSync(`ls -lh "${installerPath}" | awk '{print $5}'`, { encoding: 'utf8' }).trim();
    const installers = [{ name: installerFile, size: jsStats }];
    const buildInfo = {
      version: packageJson.version,
      buildTime: new Date().toISOString(),
      installers
    };
    writeFileSync(join(buildOutputDir, 'build-info.json'), JSON.stringify(buildInfo, null, 2));
    log('📝 Updated build/build-info.json', 'cyan');

    // Step 8: Show results
    const stats = jsStats;

    log('', 'reset');
    log('🎉 JavaScript installer built successfully!', 'green');
    log(`📦 File: ${installerFile}`, 'blue');
    log(`📏 Size: ${stats}`, 'blue');
    log(`📍 Path: ${installerPath}`, 'blue');
    log('', 'reset');
    log('🚀 Usage:', 'yellow');
    log(`• Run installer: node build/${installerFile}`, 'blue');
    log('• Or upload as .js file for sharing', 'cyan');
    log('', 'reset');

  } catch (error) {
    log(`❌ Build failed: ${error.message}`, 'red');
    process.exit(1);
  }
}

buildJSInstaller();
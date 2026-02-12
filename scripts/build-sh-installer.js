#!/usr/bin/env node

/**
 * Build Shell installer for AIUSD Skill
 * Creates a self-extracting shell script that can be uploaded as .sh file
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

async function buildShellInstaller() {
  const packageName = 'aiusd-skill-installer';
  const installerFile = `${packageName}.sh`;
  const buildOutputDir = join(projectRoot, 'build');
  const installerPath = join(buildOutputDir, installerFile);

  log('🚀 Building AIUSD Skill Shell Installer...', 'magenta');

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
      log('🗑️  Removing previous shell installer...', 'yellow');
      rmSync(installerPath);
    }

    // Step 3: Read package.json for metadata
    const packageJson = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf8'));

    // Step 4: Create base64 encoded package data
    log('📦 Creating compressed package data...', 'blue');

    // Create temporary tarball
    const tempDir = join(buildOutputDir, 'temp-sh-build');
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

    // Step 5: Generate self-extracting shell installer
    log('⚡ Generating self-extracting shell installer...', 'blue');

    const installerTemplate = `#!/bin/bash
#
# AIUSD Skill - Self-Extracting Shell Installer
#
# This file contains the complete AIUSD trading skill package.
# Simply run: bash ${installerFile}
#
# Generated: ${new Date().toISOString()}
# Version: ${packageJson.version}
#

set -euo pipefail

# Colors
RED='\\033[0;31m'
GREEN='\\033[0;32m'
YELLOW='\\033[1;33m'
BLUE='\\033[0;34m'
MAGENTA='\\033[0;35m'
CYAN='\\033[0;36m'
NC='\\033[0m' # No Color

log_info() { echo -e "\${BLUE}ℹ️\${NC} $1"; }
log_success() { echo -e "\${GREEN}✅\${NC} $1"; }
log_warning() { echo -e "\${YELLOW}⚠️\${NC} $1"; }
log_error() { echo -e "\${RED}❌\${NC} $1"; }

main() {
    echo -e "\${MAGENTA}🚀 AIUSD Skill Installer\${NC}"
    echo -e "\${MAGENTA}========================\${NC}"
    echo -e "\${BLUE}📦 Version: ${packageJson.version}\${NC}"
    echo ""

    # Check dependencies
    if ! command -v node >/dev/null 2>&1; then
        log_error "Node.js not found. Please install Node.js 18+ from https://nodejs.org"
        exit 1
    fi

    if ! command -v npm >/dev/null 2>&1; then
        log_error "npm not found. Please install npm"
        exit 1
    fi

    NODE_VERSION=\$(node --version | cut -d'v' -f2)
    REQUIRED_MAJOR=18
    CURRENT_MAJOR=\$(echo "\$NODE_VERSION" | cut -d'.' -f1)

    if [[ \$CURRENT_MAJOR -lt \$REQUIRED_MAJOR ]]; then
        log_error "Node.js \$REQUIRED_MAJOR+ required, but found v\$NODE_VERSION"
        exit 1
    fi

    log_success "Node.js v\$NODE_VERSION found"

    # Extract to current directory
    INSTALL_DIR=\$(pwd)
    SKILL_DIR="\$INSTALL_DIR/aiusd-skill"

    log_info "Installing to: \$SKILL_DIR"

    # Create skill directory
    if [[ -d "\$SKILL_DIR" ]]; then
        log_warning "Removing existing installation..."
        rm -rf "\$SKILL_DIR"
    fi
    mkdir -p "\$SKILL_DIR"

    # Extract package data
    log_info "Extracting skill package..."

    # Find the start of the base64 data
    ARCHIVE_START=\$(awk '/^__ARCHIVE_START__$/{print NR+1; exit 0; }' "\$0")

    # Extract and decode the archive
    tail -n +\$ARCHIVE_START "\$0" | base64 -d | tar -xzf - -C "\$SKILL_DIR"

    # Install dependencies
    log_info "Installing dependencies..."
    cd "\$SKILL_DIR"

    if npm install >/dev/null 2>&1; then
        log_success "Dependencies installed successfully"
    else
        log_warning "Failed to install dependencies automatically"
        log_info "Please run manually: cd aiusd-skill && npm install"
    fi

    echo ""
    log_success "AIUSD Skill installed successfully!"
    echo ""
    echo -e "\${YELLOW}🚀 Next Steps:\${NC}"
    echo -e "\${BLUE}1. cd aiusd-skill\${NC}"
    echo -e "\${BLUE}2. npm run setup\${NC}"
    echo ""
    echo -e "\${CYAN}💡 Usage Examples:\${NC}"
    echo -e "\${BLUE}• Check balance: npm start -- balances\${NC}"
    echo -e "\${BLUE}• List tools: npm start -- tools\${NC}"
    echo -e "\${BLUE}• Get help: npm start -- --help\${NC}"
    echo ""

    exit 0
}

# Run main function unless sourced
if [[ "\${BASH_SOURCE[0]}" == "\${0}" ]]; then
    main "\$@"
fi

# Archive marker - do not remove this line
__ARCHIVE_START__
${packageData}`;

    // Step 6: Write installer file
    writeFileSync(installerPath, installerTemplate);
    execSync(`chmod +x "${installerPath}"`);

    // Cleanup
    rmSync(tempDir, { recursive: true });

    // Step 7: Copy README.md and SKILL.md to build/ and write build-info.json (both installers)
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
    const installers = [];
    const jsInstaller = join(buildOutputDir, 'aiusd-skill-installer.js');
    const shInstaller = join(buildOutputDir, 'aiusd-skill-installer.sh');
    if (existsSync(jsInstaller)) {
      const s = execSync(`ls -lh "${jsInstaller}" | awk '{print $5}'`, { encoding: 'utf8' }).trim();
      installers.push({ name: 'aiusd-skill-installer.js', size: s });
    }
    const shStats = execSync(`ls -lh "${installerPath}" | awk '{print $5}'`, { encoding: 'utf8' }).trim();
    installers.push({ name: 'aiusd-skill-installer.sh', size: shStats });
    const buildInfo = {
      version: packageJson.version,
      buildTime: new Date().toISOString(),
      installers
    };
    writeFileSync(join(buildOutputDir, 'build-info.json'), JSON.stringify(buildInfo, null, 2));
    log('📝 Updated build/build-info.json', 'cyan');

    // Step 8: Show results
    const stats = shStats;

    log('', 'reset');
    log('🎉 Shell installer built successfully!', 'green');
    log(`📦 File: ${installerFile}`, 'blue');
    log(`📏 Size: ${stats}`, 'blue');
    log(`📍 Path: ${installerPath}`, 'blue');
    log('', 'reset');
    log('🚀 Usage:', 'yellow');
    log(`• Run installer: bash build/${installerFile}`, 'blue');
    log('• Or upload as .sh file for sharing', 'cyan');
    log('', 'reset');

  } catch (error) {
    log(`❌ Build failed: ${error.message}`, 'red');
    process.exit(1);
  }
}

buildShellInstaller();
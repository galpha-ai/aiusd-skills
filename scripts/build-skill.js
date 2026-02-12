#!/usr/bin/env node

/**
 * Build script for AIUSD Skill
 * Creates a distributable .skill package in dist directory
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

async function buildSkill() {
  const packageName = 'aiusd-skill-agent';
  const skillFile = `${packageName}.skill`;
  const distDir = join(projectRoot, 'dist');
  const buildOutputDir = join(projectRoot, 'build');
  const tempBuildDir = join(distDir, 'temp-build');
  const skillPath = join(buildOutputDir, skillFile);

  log('🚀 Building AIUSD Skill package...', 'magenta');

  try {
    // Step 1: Build TypeScript first
    log('🔨 Building TypeScript...', 'blue');
    execSync('npm run build', { cwd: projectRoot, stdio: 'inherit' });

    // Step 2: Create/clean build output directory
    if (!existsSync(buildOutputDir)) {
      mkdirSync(buildOutputDir, { recursive: true });
      log('📁 Created build output directory', 'blue');
    }

    if (existsSync(skillPath)) {
      log('🗑️  Removing previous skill package...', 'yellow');
      rmSync(skillPath);
    }

    // Step 3: Create temporary build directory for packaging
    if (existsSync(tempBuildDir)) {
      rmSync(tempBuildDir, { recursive: true });
    }
    mkdirSync(tempBuildDir, { recursive: true });

    // Step 4: Copy essential files for distribution
    log('📦 Copying distribution files...', 'blue');
    const filesToInclude = [
      'package.json',
      'README.md',
      'SKILL.md',
      'AUTHENTICATION.md',
      'scripts/',
      'dist/',
      'src/',
      'patches/',
      'tsconfig.json'
    ];

    // Note: Excluding node_modules to keep package size under 5MB limit
    // Users will need to run 'npm install' after extracting

    for (const file of filesToInclude) {
      const srcPath = join(projectRoot, file);
      const destPath = join(tempBuildDir, file);

      if (existsSync(srcPath)) {
        if (file.endsWith('/')) {
          // Directory
          execSync(`cp -R "${srcPath}" "${destPath}"`, { stdio: 'pipe' });
        } else {
          // File
          execSync(`cp "${srcPath}" "${destPath}"`, { stdio: 'pipe' });
        }
        log(`   ✅ Copied ${file}`, 'green');
      } else {
        log(`   ⚠️  Skipped ${file} (not found)`, 'yellow');
      }
    }

    // Step 5: Create skill package in build directory
    log('📁 Creating .skill package...', 'blue');
    execSync(`tar -czf "${skillFile}" -C "${tempBuildDir}" .`, {
      cwd: buildOutputDir,
      stdio: 'pipe'
    });

    // Step 6: Cleanup temporary build directory
    rmSync(tempBuildDir, { recursive: true });

    // Step 7: Show results
    const stats = execSync(`ls -lh "${skillPath}" | awk '{print $5}'`, {
      encoding: 'utf8'
    }).trim();

    log('', 'reset');
    log('🎉 Skill package built successfully!', 'green');
    log(`📦 File: ${skillFile}`, 'blue');
    log(`📏 Size: ${stats}`, 'blue');
    log(`📍 Path: ${skillPath}`, 'blue');
    log(`📁 Location: build/${skillFile}`, 'yellow');
    log('', 'reset');
    log('🚀 Ready to use with Claude Code!', 'magenta');

    // Step 8: Show build directory contents
    log('', 'reset');
    log('📁 Build artifacts in build/:', 'blue');
    try {
      const buildContents = execSync(`ls -la "${buildOutputDir}"`, { encoding: 'utf8' });
      console.log(buildContents);
    } catch (error) {
      log('   Failed to list build contents', 'red');
    }

    // Step 9: Copy README.md and SKILL.md to build/ (same as build-installers)
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

    // Step 10: Create build info file
    const packageJson = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf8'));
    const buildInfo = {
      packageName,
      skillFile,
      buildTime: new Date().toISOString(),
      version: packageJson.version,
      size: execSync(`ls -lh "${skillPath}" | awk '{print $5}'`, { encoding: 'utf8' }).trim()
    };

    const buildInfoPath = join(buildOutputDir, 'build-info.json');
    writeFileSync(buildInfoPath, JSON.stringify(buildInfo, null, 2));
    log(`📝 Updated build/build-info.json`, 'cyan');

    log('', 'reset');
    log('📋 Usage:', 'yellow');
    log('• Extract: tar -xzf build/aiusd-skill-agent.skill', 'blue');
    log('• Install: cd extracted-dir && npm install', 'blue');
    log('• Use: npm run setup (for authentication and testing)', 'blue');
    log('• Distribute: Lightweight package without node_modules', 'cyan');

  } catch (error) {
    log(`❌ Build failed: ${error.message}`, 'red');
    process.exit(1);
  }
}

buildSkill();
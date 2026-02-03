#!/bin/bash
#
# Build script for AIUSD Skills MCP Client
#

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() { echo -e "${BLUE}ℹ️${NC} $1"; }
log_success() { echo -e "${GREEN}✅${NC} $1"; }
log_warning() { echo -e "${YELLOW}⚠️${NC} $1"; }
log_error() { echo -e "${RED}❌${NC} $1"; }

# Project directory - go up one level from scripts/
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

echo "🏗️  Building AIUSD Skills MCP Client"
echo "==================================="

# Check Node.js version
if ! command -v node >/dev/null 2>&1; then
    log_error "Node.js not found. Please install Node.js 18+ from https://nodejs.org"
    exit 1
fi

NODE_VERSION=$(node --version | cut -d'v' -f2)
REQUIRED_MAJOR=18
CURRENT_MAJOR=$(echo "$NODE_VERSION" | cut -d'.' -f1)

if [[ $CURRENT_MAJOR -lt $REQUIRED_MAJOR ]]; then
    log_error "Node.js $REQUIRED_MAJOR+ required, but found v$NODE_VERSION"
    exit 1
fi

log_success "Node.js v$NODE_VERSION found"

# Check TypeScript
if ! command -v tsc >/dev/null 2>&1; then
    log_info "TypeScript compiler not found globally, will use local version"
fi

# Install dependencies
if [[ ! -d "node_modules" ]]; then
    log_info "Installing dependencies..."
    npm install
    log_success "Dependencies installed"
else
    log_info "Dependencies already installed"
fi

# Clean previous build
if [[ -d "dist" ]]; then
    log_info "Cleaning previous build..."
    rm -rf dist
fi

# Build TypeScript
log_info "Compiling TypeScript..."
npm run build

if [[ ! -d "dist" ]]; then
    log_error "Build failed - dist directory not created"
    exit 1
fi

# Make CLI executable
if [[ -f "dist/index.js" ]]; then
    chmod +x dist/index.js
    log_success "Made dist/index.js executable"
fi

# Verify build
log_info "Verifying build..."
if node dist/index.js --version >/dev/null 2>&1; then
    log_success "Build verification passed"
else
    log_error "Build verification failed"
    exit 1
fi

echo ""
log_success "Build completed successfully!"

echo ""
echo "🚀 Usage:"
echo "  node dist/index.js --help"
echo "  npm start -- --help"
echo ""
echo "📦 To package as skill:"
echo "  npm run build-skill"
echo ""
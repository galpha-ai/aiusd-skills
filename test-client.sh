#!/bin/bash
#
# Test script for AIUSD Skills MCP Client
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

# Project directory
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "🧪 Testing AIUSD Skills MCP Client"
echo "================================="

# Check if built
if [[ ! -f "dist/index.js" ]]; then
    log_info "Build not found, building first..."
    ./build.sh
fi

echo ""
log_info "Running basic tests..."

# Test 1: Help command
echo ""
echo "📋 Test 1: Help command"
if node dist/index.js --help | head -5; then
    log_success "Help command works"
else
    log_error "Help command failed"
    exit 1
fi

# Test 2: Version command
echo ""
echo "📋 Test 2: Version command"
if VERSION=$(node dist/index.js --version); then
    log_success "Version command works: $VERSION"
else
    log_error "Version command failed"
    exit 1
fi

# Test 3: Command parsing
echo ""
echo "📋 Test 3: Command validation"
if node dist/index.js tools --help >/dev/null 2>&1; then
    log_success "Command parsing works"
else
    log_error "Command parsing failed"
    exit 1
fi

# Test 4: Token detection
echo ""
echo "📋 Test 4: Token detection"
log_info "Testing token source priority..."

if [[ -n "${MCP_HUB_TOKEN:-}" ]]; then
    log_success "MCP_HUB_TOKEN environment variable detected"
elif [[ -n "${AIUSD_TOKEN:-}" ]]; then
    log_success "AIUSD_TOKEN environment variable detected"
elif command -v mcporter >/dev/null 2>&1; then
    if mcporter auth check >/dev/null 2>&1; then
        log_success "mcporter authentication detected"
    else
        log_warning "mcporter found but not authenticated"
    fi
else
    log_warning "No authentication detected (this is expected for testing)"
fi

# Test 5: Connection test (without token - should fail gracefully)
echo ""
echo "📋 Test 5: Connection behavior without token"
if node dist/index.js test 2>/dev/null; then
    log_warning "Connection succeeded unexpectedly"
else
    log_success "Connection properly failed without token (expected behavior)"
fi

# Test 6: Dependency check
echo ""
echo "📋 Test 6: Dependencies"
if node -e "
const pkg = JSON.parse(require('fs').readFileSync('package.json', 'utf8'));
const deps = Object.keys(pkg.dependencies || {});
deps.forEach(dep => {
  try {
    require(dep);
    console.log('✅ ' + dep + ' loaded successfully');
  } catch (e) {
    console.log('❌ ' + dep + ' failed to load: ' + e.message);
    process.exit(1);
  }
});
"; then
    log_success "All dependencies loadable"
else
    log_error "Dependency check failed"
    exit 1
fi

echo ""
log_success "All basic tests passed!"

echo ""
echo "🎯 Manual testing with token:"
echo ""
echo "1. Set authentication:"
echo "   export MCP_HUB_TOKEN='Bearer your_token_here'"
echo ""
echo "2. Test connection:"
echo "   node dist/index.js test"
echo ""
echo "3. List tools:"
echo "   node dist/index.js tools"
echo ""
echo "4. Quick commands:"
echo "   node dist/index.js balances"
echo "   node dist/index.js accounts"
echo ""
echo "5. Direct tool calls:"
echo "   node dist/index.js call genalpha_get_balances"
echo ""
echo "For authentication setup, see README.md"
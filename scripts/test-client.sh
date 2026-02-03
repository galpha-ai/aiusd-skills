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

# Project directory - go up one level from scripts/
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

echo "🧪 Testing AIUSD Skills MCP Client"
echo "================================="

# Check if built
if [[ ! -f "dist/index.js" ]]; then
    log_error "Project not built. Run 'npm run build' first"
    exit 1
fi

# Test 1: Version check
log_info "Testing version command..."
if node dist/index.js --version >/dev/null 2>&1; then
    log_success "Version command works"
else
    log_error "Version command failed"
    exit 1
fi

# Test 2: Help command
log_info "Testing help command..."
if node dist/index.js --help >/dev/null 2>&1; then
    log_success "Help command works"
else
    log_error "Help command failed"
    exit 1
fi

# Test 3: Connection test (may require auth)
log_info "Testing MCP connection..."
if node dist/index.js test >/dev/null 2>&1; then
    log_success "Connection test passed"
else
    log_warning "Connection test failed (may need authentication)"
fi

# Test 4: Tools listing (may require auth)
log_info "Testing tools listing..."
if node dist/index.js tools >/dev/null 2>&1; then
    log_success "Tools listing works"
else
    log_warning "Tools listing failed (may need authentication)"
fi

# Test 5: Balance check (requires auth)
log_info "Testing balance check..."
if node dist/index.js balances >/dev/null 2>&1; then
    log_success "Balance check works"
    echo ""
    echo "📊 Current balances:"
    node dist/index.js balances --pretty
else
    log_warning "Balance check failed (authentication required)"
    echo ""
    echo "🔐 To enable full testing, set up authentication:"
    echo "   export MCP_HUB_TOKEN=\"Bearer your_token\""
    echo "   OR use: npm run setup"
fi

echo ""
log_success "Basic functionality tests completed!"

echo ""
echo "🚀 Manual testing commands:"
echo "  npm test                    # This test script"
echo "  node dist/index.js test     # Connection test"
echo "  node dist/index.js tools    # List available tools"
echo "  node dist/index.js balances # Check balances"
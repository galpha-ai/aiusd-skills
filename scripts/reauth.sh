#!/bin/bash
#
# AIUSD Skill Re-authentication Script
# Quick shell wrapper for the Node.js re-authentication script
#

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

log_info() { echo -e "${BLUE}ℹ️${NC} $1"; }
log_success() { echo -e "${GREEN}✅${NC} $1"; }
log_warning() { echo -e "${YELLOW}⚠️${NC} $1"; }
log_error() { echo -e "${RED}❌${NC} $1"; }

# Project directory - go up one level from scripts/
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

echo -e "${MAGENTA}🔐 AIUSD Skill Re-authentication${NC}"
echo "================================="

# Check if Node.js is available
if ! command -v node >/dev/null 2>&1; then
    log_error "Node.js not found. Please install Node.js 18+ from https://nodejs.org"
    exit 1
fi

# Check if the JavaScript version exists
if [[ ! -f "scripts/reauth.js" ]]; then
    log_error "Re-authentication script not found: scripts/reauth.js"
    exit 1
fi

# Execute the Node.js re-authentication script
log_info "Executing re-authentication script..."
exec node scripts/reauth.js "$@"
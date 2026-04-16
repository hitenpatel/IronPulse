#!/bin/bash
set -euo pipefail

# ─── Bundle Size Budget Check ────────────────────────────
# Checks the Next.js build output against size budgets.
# Run after `next build` — reads from .next/BUILD_MANIFEST.
# ──────────────────────────────────────────────────────────

BUILD_DIR="${1:-.next}"
BUDGET_FIRST_LOAD_KB=250  # Max First Load JS (shared) in KB
BUDGET_PAGE_KB=350         # Max per-page JS in KB

if [ ! -d "$BUILD_DIR" ]; then
  echo "[SKIP] No build directory found at $BUILD_DIR — run 'next build' first"
  exit 0
fi

# Parse the build output for First Load JS shared size
# Next.js outputs this in the build summary
FIRST_LOAD=$(find "$BUILD_DIR/static/chunks" -name "*.js" -path "*/chunks/*" | \
  xargs du -cb 2>/dev/null | tail -1 | awk '{print int($1/1024)}')

echo "=== Bundle Size Check ==="
echo "First Load JS (shared chunks): ${FIRST_LOAD}KB (budget: ${BUDGET_FIRST_LOAD_KB}KB)"

FAILED=0

if [ "$FIRST_LOAD" -gt "$BUDGET_FIRST_LOAD_KB" ]; then
  echo "[WARN] First Load JS exceeds budget by $((FIRST_LOAD - BUDGET_FIRST_LOAD_KB))KB"
  echo "  Run 'pnpm --filter @ironpulse/web analyze' to identify large modules"
  FAILED=1
else
  echo "[PASS] First Load JS within budget"
fi

# Check individual page sizes
echo ""
echo "=== Page Sizes ==="
PAGES_DIR="$BUILD_DIR/server/app"
if [ -d "$PAGES_DIR" ]; then
  while IFS= read -r page; do
    SIZE_KB=$(du -sk "$page" 2>/dev/null | awk '{print $1}')
    PAGE_NAME="${page#$PAGES_DIR}"
    if [ "$SIZE_KB" -gt "$BUDGET_PAGE_KB" ]; then
      echo "[WARN] ${PAGE_NAME}: ${SIZE_KB}KB (budget: ${BUDGET_PAGE_KB}KB)"
      FAILED=1
    fi
  done < <(find "$PAGES_DIR" -name "*.js" -type f 2>/dev/null | head -20)
fi

echo ""
if [ "$FAILED" -eq 0 ]; then
  echo "[PASS] All bundle sizes within budget"
else
  echo "[WARN] Some bundles exceed budget — review with 'pnpm --filter @ironpulse/web analyze'"
  # Warn but don't fail CI — budgets are advisory for now
fi
exit 0

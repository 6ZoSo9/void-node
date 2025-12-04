#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="${REPO_ROOT:-$HOME/dev/void-node}"
TEXTFILE_PATH="${TEXTFILE_PATH:-}"

cd "$REPO_ROOT"

echo "=== [dashboard-health] VOID main dashboard v0 health ==="

health=1

check_file() {
  local path="$1"
  if [[ -f "$path" ]]; then
    echo "[ok] $path"
  else
    echo "[ERR] missing $path"
    health=0
  fi
}

echo
echo "=== [dashboard-health] 1) required files ==="
check_file "src/ui/MainDashboard.tsx"
check_file "docs/VOID-DASHBOARD-V0-SPEC.md"

echo
echo "=== [dashboard-health] 2) quick content sanity ==="
if ! grep -q "MainDashboard" "src/ui/MainDashboard.tsx" >/dev/null 2>&1; then
  echo "[WARN] MainDashboard.tsx missing 'MainDashboard' symbol"
fi

if ! grep -q "VOID / Obelisk / NullFeed Dashboard" "docs/VOID-DASHBOARD-V0-SPEC.md" >/dev/null 2>&1; then
  echo "[WARN] dashboard spec missing expected title"
fi

echo
echo "=== [dashboard-health] summary ==="
echo "[dashboard-health] health=$health"

if [[ -n "$TEXTFILE_PATH" ]]; then
  echo
  echo "=== [dashboard-health] writing textfile to $TEXTFILE_PATH ==="
  {
    echo "# HELP void_mainnet_dashboard_stub_health Dashboard stub wiring health (1 ok, 0 bad)"
    echo "# TYPE void_mainnet_dashboard_stub_health gauge"
    echo "void_mainnet_dashboard_stub_health $health"
  } > "$TEXTFILE_PATH"
  echo "[dashboard-health] wrote $TEXTFILE_PATH"
fi

# Always exit 0; health is carried in the gauge / logs.
exit 0

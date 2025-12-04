#!/usr/bin/env bash
set -euo pipefail

echo "=== [wc-health] VOID Work Credits v0 health ==="

REPO_ROOT="${REPO_ROOT:-$HOME/dev/void-node}"
TEXTFILE_PATH="${TEXTFILE_PATH:-}"

cd "$REPO_ROOT"

health=1

echo
echo "=== [wc-health] 1) WC CI smoke ==="
if command -v forge >/dev/null 2>&1; then
  if ! ./ops/void-mainnet-work-credits-ci-smoke.sh; then
    echo "[wc-health] wc-ci-smoke FAILED"
    health=0
  fi
else
  echo "[wc-health] forge not found in PATH; skipping wc-ci-smoke"
  echo "[wc-health] NOTE: this is fine for root/textfile runs; run the CI smoke as user for full checks"
fi

echo
echo "=== [wc-health] 2) Required WC artifacts ==="
missing=0

check_file() {
  local path="$1"
  if [ -f "$path" ]; then
    echo "[ok] $path"
  else
    echo "[MISSING] $path"
    missing=1
  fi
}

check_file "config/void-work-credits-policy.dev.json"
check_file "docs/VOID-WORK-CREDITS-SPEC.md"
check_file "docs/VOID-WORK-CREDITS-V0-SIMPLE.md"
check_file "docs/VOID-WC-SINKS-V0.md"
check_file "docs/VOID-WC-RELAYER-API-V0.md"
check_file "scripts/dev_wc_relayer_stub.ts"

if [ "$missing" -ne 0 ]; then
  echo "[wc-health] one or more WC artifacts are missing"
  health=0
fi

echo
echo "=== [wc-health] Summary ==="
echo "[wc-health] health=$health"

if [ -n "$TEXTFILE_PATH" ]; then
  echo
  echo "=== [wc-health] Writing textfile to \$TEXTFILE_PATH ==="
  tmp="$(mktemp)"

  {
    echo "# HELP void_mainnet_work_credits_ci_health VOID Work Credits v0 health (1 ok, 0 bad)"
    echo "# TYPE void_mainnet_work_credits_ci_health gauge"
    echo "void_mainnet_work_credits_ci_health $health"
  } > "$tmp"

  mv "$tmp" "$TEXTFILE_PATH"
  echo "[wc-health] wrote $TEXTFILE_PATH"
fi

if [ "$health" -eq 0 ]; then
  exit 1
else
  exit 0
fi

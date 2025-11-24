#!/usr/bin/env bash
set -euo pipefail

MAIN=${MAIN:-http://127.0.0.1:4100}
SAFE=${SAFE:-http://127.0.0.1:4104}

echo "[safeboot-health] MAIN=$MAIN SAFE=$SAFE"
echo

echo "=== [1] heads ==="
main_head=$(curl -fsS "$MAIN/head.txt" || echo "")
safe_head=$(curl -fsS "$SAFE/head.txt" || echo "")

if [[ -z "$main_head" ]]; then
  echo "[ERROR] main /head.txt failed"
  exit 1
fi

if [[ -z "$safe_head" ]]; then
  echo "[ERROR] safeboot /head.txt failed"
  exit 1
fi

echo "[main] head = $main_head"
echo "[safe] head = $safe_head"

# best-effort diff (not a hard gate)
if [[ "$main_head" =~ ^[0-9]+$ && "$safe_head" =~ ^[0-9]+$ ]]; then
  diff=$(( main_head - safe_head ))
  echo "[info] head diff (main - safe) = $diff"
else
  echo "[warn] non-numeric head(s), skipping diff"
fi

echo
echo "=== [2] txroot3 health (safeboot) ==="
txroot_prom=$(curl -fsS "$SAFE/health/txroot3?format=prom" || true)
echo "$txroot_prom"

txroot_val=$(printf '%s\n' "$txroot_prom" \
  | awk '/^void_txroot_health / {print $2}' || true)

if [[ "$txroot_val" != "1" ]]; then
  echo "[ERROR] void_txroot_health != 1 (got: ${txroot_val:-<empty>})"
  exit 1
fi
echo "[ok] txroot health == 1"

echo
echo "=== [3] safeboot exporter ==="
safe_prom=$(curl -fsS "$SAFE/health/safeboot.prom" || true)
echo "$safe_prom"

safe_val=$(printf '%s\n' "$safe_prom" \
  | awk '/^void_safeboot_health / {print $2}' || true)

if [[ "$safe_val" != "1" ]]; then
  echo "[ERROR] void_safeboot_health != 1 (got: ${safe_val:-<empty>})"
  exit 1
fi
echo "[ok] safeboot health == 1"

echo
echo "[RESULT] OK (safeboot health + txroot good)"

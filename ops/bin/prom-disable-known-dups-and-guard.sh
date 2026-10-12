#!/usr/bin/env bash
set -euo pipefail

TS="$(date +%Y%m%d-%H%M%S)"
OUT="/tmp/void-prom-disable-known-dups-and-guard.$TS.out.txt"
exec > >(tee -a "$OUT") 2>&1
echo "[saved] $OUT"
echo

PROM_YML="/etc/prometheus/prometheus.yml"
RULES_DIR="/etc/prometheus/rules.d"
ALERTS_DIR="/etc/prometheus/alerts.d"
DIS_DIR="/etc/prometheus/disabled.dups.$TS"

echo "=== [0] sanity ==="
command -v promtool >/dev/null
test -d "$RULES_DIR"
test -d "$ALERTS_DIR"
test -f "$PROM_YML"
echo "[ok] promtool + dirs present"
echo

echo "=== [1] backup current Prom config ==="
BK="/root/prometheus-config-OK.before-dups-disable.$TS.tgz"
sudo tar -czf "$BK" \
  /etc/prometheus/prometheus.yml \
  /etc/prometheus/rules.d \
  /etc/prometheus/alerts.d
echo "[ok] backup=$BK"
echo

echo "=== [2] disable known duplicate-defining files (if present) ==="
sudo mkdir -p "$DIS_DIR"

# Keep this list tight and explicit (only known offenders). Safe if missing.
CANDIDATES=(
  "$RULES_DIR/void-portguard-rules.yml"
  "$RULES_DIR/void-datanet-receipts-textfile.yml"
  "$RULES_DIR/void-datanet-effective-alerts.yml"
  "$RULES_DIR/void-datanet-smoke-ok-addon.yml"
  "$RULES_DIR/void-datanet-receipts-compat.yml"
  "$ALERTS_DIR/void-datanet-textfile-alerts.yml"
  "$RULES_DIR/void-header3-main-safe-lastnumber.auto.yml"
  "$ALERTS_DIR/void-datanet-receipts-persist-stall.yml"
)

moved=0
for p in "${CANDIDATES[@]}"; do
  if sudo test -f "$p"; then
    sudo mv -v "$p" "$DIS_DIR/"
    moved=$((moved+1))
  else
    echo "[skip] not present: $p"
  fi
done
echo "[ok] disabled dir: $DIS_DIR (moved=$moved)"
echo

echo "=== [3] write README in disabled dir ==="
sudo tee "$DIS_DIR/README.DISABLED_DUPS.txt" >/dev/null <<TXT
Disabled on $(date -Is) to eliminate duplicate rule/alert/record names across rule groups.
These files were moved out of:
  - /etc/prometheus/rules.d/*.yml
  - /etc/prometheus/alerts.d/*.yml

Restore only if you also remove/rename the surviving canonical definitions.
Backup tarball: $BK
TXT
echo "[ok] wrote README"
echo

echo "=== [4] promtool check ==="
sudo promtool check config "$PROM_YML" >/dev/null
echo "[ok] promtool config OK"
echo

echo "=== [5] runtime dup rule-name guard + reload (guarded) ==="
if ! sudo test -x /usr/local/bin/prom-guard-no-duprules.sh; then
  echo "[FAIL] missing /usr/local/bin/prom-guard-no-duprules.sh"
  exit 2
fi
if ! sudo test -x /usr/local/bin/prom-safe-reload-guarded.sh; then
  echo "[FAIL] missing /usr/local/bin/prom-safe-reload-guarded.sh"
  exit 2
fi

/usr/local/bin/prom-guard-no-duprules.sh
/usr/local/bin/prom-safe-reload-guarded.sh
echo "[ok] guard OK + reload OK"
echo

echo "=== [done] ==="
echo "[hint] Restore if needed: sudo tar -xzf '$BK' -C /"

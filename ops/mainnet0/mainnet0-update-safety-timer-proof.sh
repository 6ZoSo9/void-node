#!/usr/bin/env bash
set -euo pipefail

REPO="${VOID_REPO:-$HOME/dev/void-node}"
cd "$REPO"

BASE="${BASE:-http://127.0.0.1:4100}"
PROM="${PROM:-http://127.0.0.1:9090}"
NODE_EXPORTER="${NODE_EXPORTER:-http://127.0.0.1:9100}"
TEXTFILE_DIR="${TEXTFILE_DIR:-/var/lib/node_exporter/textfile_collector}"
PROMFILE="$TEXTFILE_DIR/void-mainnet0-update-safety.prom"
SERVICE="void-mainnet0-update-safety-exporter.service"
TIMER="void-mainnet0-update-safety-exporter.timer"
EXPORTER="ops/mainnet0/mainnet0-update-safety-exporter.sh"
OUT="/tmp/void-mainnet0-update-safety-timer-proof.$(date +%Y%m%d-%H%M%S)"

mkdir -p "$OUT"

echo "=== mainnet0 update safety timer proof ==="
echo "repo=$REPO"
echo "base=$BASE"
echo "prom=$PROM"
echo "node_exporter=$NODE_EXPORTER"
echo "out=$OUT"

echo
echo "=== [1] required files + syntax ==="
test -f "$EXPORTER"
test -f ops/mainnet0/mainnet0-update-safety-prom-proof.sh
bash -n "$EXPORTER"
bash -n ops/mainnet0/mainnet0-update-safety-prom-proof.sh

echo
echo "=== [2] local VOID/update status smoke ==="
curl -fsS "$BASE/__void/ready.json" | tee "$OUT/ready.json"
echo
curl -fsS "$BASE/__void/update/notification-status.json" | tee "$OUT/update-status.json"
echo

python3 - "$OUT/ready.json" "$OUT/update-status.json" <<'PY'
import json, sys
ready=json.load(open(sys.argv[1]))
upd=json.load(open(sys.argv[2]))
assert ready.get("ready") is True, ready
assert upd.get("ok") is True, upd
assert upd.get("signature_valid") is True, upd
assert upd.get("installs_update") is False, upd
assert upd.get("sends_transaction") is False, upd
print("[ok] ready/update status safe")
PY

echo
echo "=== [3] install root systemd timer for recurring textfile export ==="
RUN_USER="${RUN_USER:-$(id -un)}"
RUN_GROUP="${RUN_GROUP:-$(id -gn)}"

sudo mkdir -p "$TEXTFILE_DIR"

# Root may run git in a user-owned repo inside the exporter.
sudo git config --global --add safe.directory "$REPO" >/dev/null 2>&1 || true

sudo tee "/etc/systemd/system/$SERVICE" >/dev/null <<UNIT_SERVICE
[Unit]
Description=VOID Mainnet-0 update safety textfile exporter
Wants=network-online.target
After=network-online.target

[Service]
Type=oneshot
WorkingDirectory=$REPO
Environment=VOID_REPO=$REPO
Environment=BASE=$BASE
ExecStart=/usr/bin/env bash $REPO/$EXPORTER
ExecStartPost=/usr/bin/chmod 0644 $PROMFILE
ExecStartPost=/bin/sh -c 'test ! -d "$REPO/.runtime/mainnet0" || chown -R "$RUN_USER:$RUN_GROUP" "$REPO/.runtime/mainnet0"'
UNIT_SERVICE

sudo tee "/etc/systemd/system/$TIMER" >/dev/null <<UNIT_TIMER
[Unit]
Description=Refresh VOID Mainnet-0 update safety textfile metric

[Timer]
OnBootSec=45s
OnUnitActiveSec=60s
AccuracySec=10s
Persistent=true
Unit=$SERVICE

[Install]
WantedBy=timers.target
UNIT_TIMER

sudo systemctl daemon-reload
sudo systemctl enable --now "$TIMER"
sudo systemctl start "$SERVICE"

echo
echo "=== [4] prove timer/service installed ==="
sudo systemctl is-enabled "$TIMER"
sudo systemctl is-active "$TIMER"
sudo systemctl status "$TIMER" --no-pager -l | sed -n '1,40p'
sudo systemctl status "$SERVICE" --no-pager -l | sed -n '1,60p' || true

echo
echo "=== [5] prove prom file is readable ==="
sudo test -f "$PROMFILE"
sudo stat -c 'owner=%U group=%G mode=%a path=%n' "$PROMFILE" | tee "$OUT/promfile.stat.txt"
MODE="$(sudo stat -c '%a' "$PROMFILE")"
if [ "$MODE" != "644" ]; then
  echo "[ERR] prom file mode is $MODE, expected 644"
  exit 1
fi

echo
echo "=== [6] prove node_exporter exposes update safety metrics ==="
ok_node=0
for i in $(seq 1 30); do
  curl -fsS "$NODE_EXPORTER/metrics" > "$OUT/node-exporter.metrics.txt" || true
  if grep -q '^void_mainnet0_update_safety_ok 1' "$OUT/node-exporter.metrics.txt" \
    && grep -q '^void_mainnet0_update_safety_signature_valid 1' "$OUT/node-exporter.metrics.txt" \
    && grep -q '^void_mainnet0_update_safety_update_available 0' "$OUT/node-exporter.metrics.txt" \
    && grep -q '^void_mainnet0_update_safety_active_markers 0' "$OUT/node-exporter.metrics.txt" \
    && grep -q '^node_textfile_scrape_error 0' "$OUT/node-exporter.metrics.txt"; then
    ok_node=1
    break
  fi
  sleep 3
done

grep 'void_mainnet0_update_safety_' "$OUT/node-exporter.metrics.txt" | tee "$OUT/node-exporter.update-safety.metrics.txt"
grep '^node_textfile_scrape_error ' "$OUT/node-exporter.metrics.txt" | tee "$OUT/node-exporter.textfile-error.txt"

if [ "$ok_node" != "1" ]; then
  echo "[ERR] node_exporter did not expose clean update safety metrics"
  exit 1
fi

echo "[ok] node_exporter exposes update safety metrics with scrape_error=0"

echo
echo "=== [7] prove Prometheus sees fresh update safety status ==="
curl -fsS "$PROM/-/ready"
echo

prom_check() {
  local query="$1"
  local label="$2"
  local outfile="$OUT/prom-${label}.json"

  for i in $(seq 1 30); do
    curl -fsS --get "$PROM/api/v1/query" \
      --data-urlencode "query=$query" \
      > "$outfile" || true

    if python3 - "$outfile" <<'PY'
import json, sys
try:
    j=json.load(open(sys.argv[1]))
    r=j.get("data",{}).get("result",[])
    sys.exit(0 if r else 1)
except Exception:
    sys.exit(1)
PY
    then
      cat "$outfile"
      echo
      echo "[ok] prom query passed: $query"
      return 0
    fi
    sleep 3
  done

  cat "$outfile" || true
  echo
  echo "[ERR] prom query failed/empty: $query"
  return 1
}

prom_check 'void_mainnet0_update_safety_ok == 1' 'ok'
prom_check 'void_mainnet0_update_safety_ready == 1' 'ready'
prom_check 'void_mainnet0_update_safety_signature_valid == 1' 'signature'
prom_check 'void_mainnet0_update_safety_update_available == 0' 'update_available_zero'
prom_check 'void_mainnet0_update_safety_active_markers == 0' 'active_markers_zero'
prom_check '(time() - void_mainnet0_update_safety_timestamp_seconds) < 180' 'fresh'

echo
echo "=== [8] write local proof artifact ==="
mkdir -p .runtime/mainnet0
python3 - "$OUT" <<'PY'
import json, os, subprocess, sys, time
out=sys.argv[1]
def sh(cmd):
    return subprocess.check_output(cmd, text=True).strip()
artifact={
  "ok": True,
  "kind": "mainnet0_update_safety_timer_proof",
  "timestampSeconds": int(time.time()),
  "gitHead": sh(["git","rev-parse","--short","HEAD"]),
  "gitDescribe": sh(["git","describe","--tags","--always","--dirty"]),
  "systemdTimer": "void-mainnet0-update-safety-exporter.timer",
  "systemdService": "void-mainnet0-update-safety-exporter.service",
  "textfile": "/var/lib/node_exporter/textfile_collector/void-mainnet0-update-safety.prom",
  "proofOut": out,
}
path=".runtime/mainnet0/mainnet0-update-safety-timer.local.current.json"
open(path,"w").write(json.dumps(artifact, indent=2, sort_keys=True)+"\n")
print(json.dumps(artifact, indent=2, sort_keys=True))
PY

echo
echo "=== [9] existing one-shot prom proof still green ==="
bash ops/mainnet0/mainnet0-update-safety-prom-proof.sh

echo
echo "[ok] mainnet0 update safety timer proof green"

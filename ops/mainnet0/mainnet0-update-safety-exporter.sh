#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

BASE="${BASE:-http://127.0.0.1:4100}"
TEXTFILE_DIR="${TEXTFILE_DIR:-/var/lib/node_exporter/textfile_collector}"
PROMFILE="${PROMFILE:-$TEXTFILE_DIR/void-mainnet0-update-safety.prom}"
ART="${ART:-.runtime/mainnet0/mainnet0-update-safety.local.current.json}"

mkdir -p "$(dirname "$ART")"

READY="$(curl -fsS --max-time 8 "$BASE/__void/ready.json")"
STATUS="$(curl -fsS --max-time 8 "$BASE/__void/update/notification-status.json")"
GIT_HEAD="$(git rev-parse --short HEAD 2>/dev/null || echo unknown)"
GIT_DESC="$(git describe --tags --always --dirty 2>/dev/null || echo unknown)"
TS="$(date +%s)"

STAGED=0
PENDING=0
ROLLBACK=0
test -f runtime/upgrade-staged.v1.json && STAGED=1
test -f runtime/upgrade-apply-pending.v1.json && PENDING=1
test -f runtime/upgrade-rollback-marker.v1.json && ROLLBACK=1

TMP="$(mktemp /tmp/void-mainnet0-update-safety.prom.XXXXXX)"
JSON_TMP="$(mktemp /tmp/void-mainnet0-update-safety.json.XXXXXX)"
trap 'rm -f "$TMP" "$JSON_TMP"' EXIT

python3 - "$READY" "$STATUS" "$GIT_HEAD" "$GIT_DESC" "$TS" "$STAGED" "$PENDING" "$ROLLBACK" "$ART" "$TMP" <<'PY'
import json, sys
from pathlib import Path

ready=json.loads(sys.argv[1])
status=json.loads(sys.argv[2])
git_head=sys.argv[3]
git_desc=sys.argv[4]
ts=int(sys.argv[5])
staged=int(sys.argv[6])
pending=int(sys.argv[7])
rollback=int(sys.argv[8])
art=Path(sys.argv[9])
prom=Path(sys.argv[10])

active=staged+pending+rollback
ok = (
  ready.get("ready") is True and
  status.get("ok") is True and
  status.get("signature_valid") is True and
  status.get("update_available") is False and
  status.get("installs_update") is False and
  active == 0
)

summary={
  "ok": bool(ok),
  "kind": "mainnet0_update_safety_export",
  "gitHead": git_head,
  "gitDescribe": git_desc,
  "timestampSeconds": ts,
  "ready": ready.get("ready"),
  "signatureValid": status.get("signature_valid"),
  "updateAvailable": status.get("update_available"),
  "installsUpdate": status.get("installs_update"),
  "activeMarkers": active,
}
art.write_text(json.dumps(summary, indent=2) + "\n")

def esc(s):
  return str(s).replace("\\", "\\\\").replace('"', '\\"')

prom.write_text(f'''# HELP void_mainnet0_update_safety_ok Latest Mainnet-0 update safety status.
# TYPE void_mainnet0_update_safety_ok gauge
void_mainnet0_update_safety_ok {1 if ok else 0}
# HELP void_mainnet0_update_safety_timestamp_seconds Export timestamp for Mainnet-0 update safety metric.
# TYPE void_mainnet0_update_safety_timestamp_seconds gauge
void_mainnet0_update_safety_timestamp_seconds {ts}
# HELP void_mainnet0_update_safety_ready VOID ready flag observed by update safety exporter.
# TYPE void_mainnet0_update_safety_ready gauge
void_mainnet0_update_safety_ready {1 if ready.get("ready") is True else 0}
# HELP void_mainnet0_update_safety_signature_valid Update manifest signature validity.
# TYPE void_mainnet0_update_safety_signature_valid gauge
void_mainnet0_update_safety_signature_valid {1 if status.get("signature_valid") is True else 0}
# HELP void_mainnet0_update_safety_update_available Update available flag.
# TYPE void_mainnet0_update_safety_update_available gauge
void_mainnet0_update_safety_update_available {1 if status.get("update_available") is True else 0}
# HELP void_mainnet0_update_safety_active_markers Active staged/pending/rollback update markers.
# TYPE void_mainnet0_update_safety_active_markers gauge
void_mainnet0_update_safety_active_markers {active}
# HELP void_mainnet0_update_safety_info Git metadata for latest Mainnet-0 update safety export.
# TYPE void_mainnet0_update_safety_info gauge
void_mainnet0_update_safety_info{{git_head="{esc(git_head)}",git_describe="{esc(git_desc)}"}} 1
''')
PY

if [ -w "$TEXTFILE_DIR" ]; then
  mv "$TMP" "$PROMFILE"
  chmod 0644 "$PROMFILE"
else
  sudo install -m 0644 "$TMP" "$PROMFILE"
fi

cat "$ART"
echo
echo "[ok] wrote $PROMFILE"

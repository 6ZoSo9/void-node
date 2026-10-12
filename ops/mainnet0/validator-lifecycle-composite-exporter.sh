#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

cd "${VOID_REPO:-$HOME/dev/void-node}"

ART="${ART:-.runtime/mainnet0/validator-lifecycle-composite.local.current.json}"
TEXTFILE_DIR="${TEXTFILE_DIR:-/var/lib/node_exporter/textfile_collector}"
PROMFILE="${PROMFILE:-$TEXTFILE_DIR/void-mainnet-validator-lifecycle.prom}"

if [ ! -f "$ART" ]; then
  echo "[ERR] missing lifecycle composite artifact: $ART"
  exit 1
fi

TMP="$(mktemp /tmp/void-mainnet-validator-lifecycle.prom.XXXXXX)"
trap 'rm -f "$TMP"' EXIT

CURRENT_HEAD="$(git rev-parse --short HEAD)"
ART_HEAD="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1])).get("gitHead",""))' "$ART")"
ART_OK="$(python3 -c 'import json,sys; print("1" if json.load(open(sys.argv[1])).get("ok") is True else "0")' "$ART")"
ART_LANES="$(python3 -c 'import json,sys; print(len(json.load(open(sys.argv[1])).get("lanes") or []))' "$ART")"

if [ "$ART_OK" != "1" ]; then
  echo "[ERR] refusing export: artifact ok is not true"
  exit 1
fi

if [ "$ART_HEAD" != "$CURRENT_HEAD" ]; then
  echo "[ERR] refusing export: artifact gitHead=$ART_HEAD current=$CURRENT_HEAD"
  exit 1
fi

if [ "$ART_LANES" != "7" ]; then
  echo "[ERR] refusing export: artifact lanes=$ART_LANES expected=7"
  exit 1
fi

echo "[ok] lifecycle artifact accepted for export: head=$ART_HEAD lanes=$ART_LANES"

python3 - "$ART" > "$TMP" <<'PY'
import json, sys, time

path = sys.argv[1]
j = json.load(open(path))

def esc(s):
    return str(s).replace("\\", "\\\\").replace("\n", "\\n").replace('"', '\\"')

ok = 1 if j.get("ok") is True else 0
ready_head = int(j.get("readyHead") or 0)
lanes = j.get("lanes") or []
lane_count = len(lanes)
ts = int(time.time())
git_head = esc(j.get("gitHead") or "")
git_desc = esc(j.get("gitDescribe") or "")

print("# HELP void_mainnet_validator_lifecycle_composite_ok Latest validator lifecycle composite proof status.")
print("# TYPE void_mainnet_validator_lifecycle_composite_ok gauge")
print(f"void_mainnet_validator_lifecycle_composite_ok {ok}")

print("# HELP void_mainnet_validator_lifecycle_composite_ready_head VOID head observed by the composite proof.")
print("# TYPE void_mainnet_validator_lifecycle_composite_ready_head gauge")
print(f"void_mainnet_validator_lifecycle_composite_ready_head {ready_head}")

print("# HELP void_mainnet_validator_lifecycle_composite_lanes_total Number of lifecycle lanes included in the composite proof.")
print("# TYPE void_mainnet_validator_lifecycle_composite_lanes_total gauge")
print(f"void_mainnet_validator_lifecycle_composite_lanes_total {lane_count}")

print("# HELP void_mainnet_validator_lifecycle_composite_timestamp_seconds Export timestamp for validator lifecycle composite proof metric.")
print("# TYPE void_mainnet_validator_lifecycle_composite_timestamp_seconds gauge")
print(f"void_mainnet_validator_lifecycle_composite_timestamp_seconds {ts}")

print("# HELP void_mainnet_validator_lifecycle_composite_info Git metadata for latest validator lifecycle composite proof.")
print("# TYPE void_mainnet_validator_lifecycle_composite_info gauge")
print(f'void_mainnet_validator_lifecycle_composite_info{{git_head="{git_head}",git_describe="{git_desc}"}} 1')
PY

if [ ! -d "$TEXTFILE_DIR" ]; then
  echo "[ERR] textfile dir missing: $TEXTFILE_DIR"
  exit 1
fi

if [ -w "$TEXTFILE_DIR" ]; then
  install -m 0644 "$TMP" "$PROMFILE"
else
  sudo install -m 0644 "$TMP" "$PROMFILE"
fi

echo "[ok] wrote $PROMFILE"
cat "$PROMFILE"

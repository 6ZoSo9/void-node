#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

RPC_URL="${RPC_URL:-http://127.0.0.1:10025}"
CHAIN_ID_EXPECTED="${CHAIN_ID_EXPECTED:-31337}"
PRIVATE_KEY="${PRIVATE_KEY:-0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80}"
FORCE_REAL_CHAIN="${FORCE_REAL_CHAIN:-0}"
OUT_DIR="${OUT_DIR:-/tmp/validator-epoch-manifest-export.$(date +%Y%m%d-%H%M%S)}"

BAD="script/mainnet_rebuild/VoidMainnetBootstrapDev.vaults-rebuild.s.sol"
PARK_DIR="script/mainnet_rebuild_disabled"
STAMP="$(date +%Y%m%d-%H%M%S)"
PARK="$PARK_DIR/$(basename "$BAD").park.run.$STAMP"
DEPLOY_LOG="$OUT_DIR/deploy.log"

restore_bad() {
  if [ -f "$PARK" ]; then
    mkdir -p "$(dirname "$BAD")"
    mv -f "$PARK" "$BAD"
  fi
}

trap restore_bad EXIT

mkdir -p "$OUT_DIR"

echo "=== [1] rpc truth ==="
cast chain-id --rpc-url "$RPC_URL"
ACTUAL_CHAIN_ID="$(cast chain-id --rpc-url "$RPC_URL")"
if [ "$ACTUAL_CHAIN_ID" != "$CHAIN_ID_EXPECTED" ]; then
  echo "[ERR] unexpected chain id: got=$ACTUAL_CHAIN_ID expected=$CHAIN_ID_EXPECTED"
  exit 1
fi

if [ "$ACTUAL_CHAIN_ID" = "2050" ] && [ "$FORCE_REAL_CHAIN" != "1" ]; then
  echo "[ERR] refusing to run validator-epoch-manifest-export local proof on real chain 2050"
  echo "[ERR] use a disposable anvil, or set FORCE_REAL_CHAIN=1 if you intentionally want that risk"
  exit 1
fi

echo
echo "=== [2] park known broken rebuild script for forge ==="
test -f "$BAD"
mkdir -p "$PARK_DIR"
mv -f "$BAD" "$PARK"
echo "parked=$PARK"

echo
echo "=== [3] deploy manifest export stack ==="
export PRIVATE_KEY
forge script script/mainnet_upgrade/ValidatorEpochManifestExportDeploy.s.sol:ValidatorEpochManifestExportDeploy \
  --rpc-url "$RPC_URL" \
  --private-key "$PRIVATE_KEY" \
  --broadcast | tee "$DEPLOY_LOG"

ADDRS="$(python3 - <<'PY' "$DEPLOY_LOG"
import re
import sys
from pathlib import Path

text = Path(sys.argv[1]).read_text(encoding="utf-8", errors="ignore").splitlines()
manifest = None
schedule = None

for line in text:
    m = re.match(r'^\s*manifestView\s+(0x[a-fA-F0-9]{40})\s*$', line)
    if m:
        manifest = m.group(1)
    s = re.match(r'^\s*scheduleView\s+(0x[a-fA-F0-9]{40})\s*$', line)
    if s:
        schedule = s.group(1)

if not manifest or not schedule:
    raise SystemExit("[ERR] could not parse manifestView/scheduleView addresses from deploy log")

print(manifest)
print(schedule)
PY
)"

MANIFEST_VIEW_ADDR="$(printf '%s\n' "$ADDRS" | sed -n '1p')"
SCHEDULE_VIEW_ADDR="$(printf '%s\n' "$ADDRS" | sed -n '2p')"

echo
echo "=== [4] export epoch JSON artifacts ==="
for EPOCH in 1 2; do
  START_SLOT=0
  END_SLOT_EXCLUSIVE=8
  OUT_JSON="$OUT_DIR/epoch-${EPOCH}.manifest.json"
  export RPC_URL MANIFEST_VIEW_ADDR SCHEDULE_VIEW_ADDR EPOCH START_SLOT END_SLOT_EXCLUSIVE OUT_JSON
  python3 ops/mainnet/export_validator_epoch_manifest_json.py
done

python3 - <<'PY' "$OUT_DIR" "$RPC_URL" "$MANIFEST_VIEW_ADDR" "$SCHEDULE_VIEW_ADDR"
import json
import sys
from pathlib import Path

out_dir = Path(sys.argv[1])
rpc_url = sys.argv[2]
manifest_view = sys.argv[3]
schedule_view = sys.argv[4]

index = {
    "rpcUrl": rpc_url,
    "manifestView": manifest_view,
    "scheduleView": schedule_view,
    "files": [
        "epoch-1.manifest.json",
        "epoch-2.manifest.json",
    ],
}
(out_dir / "index.json").write_text(json.dumps(index, indent=2) + "\n", encoding="utf-8")
print(f"[ok] wrote {out_dir / 'index.json'}")
PY

echo
echo "=== [5] artifact truth ==="
echo "out_dir=$OUT_DIR"
ls -1 "$OUT_DIR"

echo
echo "=== [6] restore parked rebuild script ==="
restore_bad
trap - EXIT

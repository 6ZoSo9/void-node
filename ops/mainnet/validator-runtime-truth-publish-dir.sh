#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

SRC_DIR="${1:-${SRC_DIR:-}}"
if [ -z "$SRC_DIR" ]; then
  echo "[ERR] usage: $0 <source_dir_with_epoch_manifest_verified_json_files>"
  exit 1
fi

DEST_ROOT="${DEST_ROOT:-$HOME/dev/void-node/.runtime/validator_epoch_manifests}"
LINK_PATH="${LINK_PATH:-$DEST_ROOT/verified-current}"
SERVICE="${SERVICE:-void-node.service}"
STAMP="$(date +%Y%m%d-%H%M%S)"
REAL_DIR="$DEST_ROOT/published-$STAMP"

mkdir -p "$REAL_DIR"

echo "=== [1] validate source manifests ==="
python3 - "$SRC_DIR" "$REAL_DIR" <<'PY'
import json
import shutil
import sys
from pathlib import Path

src = Path(sys.argv[1]).resolve()
dst = Path(sys.argv[2]).resolve()

if not src.is_dir():
    raise SystemExit(f"[ERR] source dir does not exist: {src}")

files = sorted(src.glob("epoch-*.manifest.verified.json"))
if not files:
    raise SystemExit(f"[ERR] no epoch-*.manifest.verified.json files found in {src}")

loaded_epochs = []
for p in files:
    j = json.loads(p.read_text())
    epoch = int(j["epoch"])
    requested_start = int(j["requestedStartSlot"])
    requested_end = int(j["requestedEndSlotExclusive"])
    published_start = int(j["publishedStartSlot"])
    published_end = int(j["publishedEndSlotExclusive"])
    schedule = j.get("scheduleWindow") or []

    if requested_end < requested_start:
        raise SystemExit(f"[ERR] invalid requested window in {p}: [{requested_start}, {requested_end})")
    if published_end < published_start:
        raise SystemExit(f"[ERR] invalid published window in {p}: [{published_start}, {published_end})")
    if requested_start != published_start or requested_end != published_end:
        raise SystemExit(
            f"[ERR] requested/published window mismatch in {p}: "
            f"requested=[{requested_start},{requested_end}) "
            f"published=[{published_start},{published_end})"
        )
    if len(schedule) != (requested_end - requested_start):
        raise SystemExit(
            f"[ERR] schedule length mismatch in {p}: "
            f"len={len(schedule)} expected={requested_end-requested_start}"
        )

    slots = [int(x["slot"]) for x in schedule]
    expected_slots = list(range(requested_start, requested_end))
    if slots != expected_slots:
        raise SystemExit(f"[ERR] slot sequence mismatch in {p}: got={slots} expected={expected_slots}")

    shutil.copy2(p, dst / p.name)
    loaded_epochs.append(epoch)
    print(f"[ok] copied {p} -> {dst / p.name} epoch={epoch} window=[{requested_start},{requested_end})")

print(f"[ok] validated epochs={loaded_epochs}")
PY

echo
echo "=== [2] publish verified-current atomically ==="
ln -sfn "$REAL_DIR" "$LINK_PATH"
echo "verified_current=$(readlink -f "$LINK_PATH")"

echo
echo "=== [3] restart service ==="
systemctl --user daemon-reload
systemctl --user restart "$SERVICE"
sleep 4

echo
echo "=== [4] env truth ==="
systemctl --user show "$SERVICE" -p Environment | tr ' ' '\n' | grep 'VOID_VALIDATOR_' || true

echo
echo "=== [5] done ==="
echo "published_dir=$REAL_DIR"

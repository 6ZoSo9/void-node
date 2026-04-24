#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

EPOCH="${1:?usage: validator-crossbox-closeout.sh <epoch> <vaultName>}"
VAULT="${2:?usage: validator-crossbox-closeout.sh <epoch> <vaultName>}"
ALIEN="${ALIEN:-zoso@100.122.79.39}"
BASE="${BASE:-http://127.0.0.1:4100}"
ROOT="$HOME/dev/void-node"
RUNTIME="$ROOT/.runtime/validator_epoch_manifests"
COMPARE_LATEST="$ROOT/.runtime/validator_truth_compare/latest.json"

OUT_DIR="$(
python3 - <<'PY' "$RUNTIME" "$VAULT" "$EPOCH"
import sys
from pathlib import Path
runtime, vault, epoch = sys.argv[1:4]
target = f"epoch-{int(epoch):06d}.manifest.verified.json"
cands = sorted(Path(runtime).glob(f"upgrade-track-{vault}-*"), key=lambda p: p.stat().st_mtime)
for p in reversed(cands):
    if (p / "import" / target).exists():
        print(p)
        raise SystemExit(0)
raise SystemExit(f"[ERR] no upgrade-track-{vault}-* with {target}")
PY
)"

LIVE_STAGE="$RUNTIME/upgrade-live-${VAULT}-final-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$LIVE_STAGE"

echo "=== [1] using ==="
echo "epoch=$EPOCH"
echo "vault=$VAULT"
echo "out_dir=$OUT_DIR"

echo
echo "=== [2] prove target files ==="
ls -l "$OUT_DIR/import/epoch-$(printf '%06d' "$EPOCH").manifest.verified.json" \
      "$OUT_DIR/import/epoch-$(printf '%06d' "$EPOCH").verify.json"

echo
echo "=== [3] stage manifests 1..$EPOCH ==="
readarray -t MANIFESTS < <(
python3 - <<'PY' "$COMPARE_LATEST" "$OUT_DIR" "$EPOCH"
import glob, json, sys
from pathlib import Path

compare_path, out_dir, target_epoch_s = sys.argv[1:4]
target_epoch = int(target_epoch_s)
home = Path.home() / "dev/void-node/.runtime/validator_epoch_manifests"

compare = json.loads(Path(compare_path).read_text(encoding="utf-8"))
print(str(compare["upgradeManifest"]))

for epoch in range(2, target_epoch + 1):
    if epoch == target_epoch:
        p = Path(out_dir) / "import" / f"epoch-{epoch:06d}.manifest.verified.json"
        if not p.exists():
            raise SystemExit(f"[ERR] missing target epoch manifest: {p}")
        print(str(p))
        continue

    matches = []
    for g in glob.glob(str(home / "**" / "import" / f"epoch-{epoch:06d}.manifest.verified.json"), recursive=True):
        p = Path(g)
        matches.append((p.stat().st_mtime, str(p)))

    if not matches:
        raise SystemExit(f"[ERR] no prior verified manifest found for epoch {epoch}")

    matches.sort()
    print(matches[-1][1])
PY
)

for f in "${MANIFESTS[@]}"; do
  cp -a "$f" "$LIVE_STAGE/"
done

echo
echo "=== [4] publish local verified-current ==="
"$ROOT/ops/mainnet/validator-runtime-truth-publish-dir.sh" "$LIVE_STAGE"

echo
echo "=== [5] refresh local shadow ==="
"$ROOT/ops/mainnet/validator-runtime-truth-shadow-run.sh" "$RUNTIME/verified-current"

echo
echo "=== [6] prove local ==="
curl -fsS "$BASE/__void/runtime/validator-truth/status" | python3 -m json.tool | sed -n '1,110p'
echo
curl -fsS "$BASE/__void/runtime/validator-truth/epoch/$EPOCH" | python3 -m json.tool

echo
echo "=== [7] sync Alien ==="
REMOTE_DIR="/home/zoso/dev/void-node/.runtime/validator_epoch_manifests/import-from-precision-epoch${EPOCH}-$(date +%Y%m%d-%H%M%S)"
ssh "$ALIEN" "mkdir -p '$REMOTE_DIR'"
tar -C "$RUNTIME/verified-current" -cf - . | ssh "$ALIEN" "tar -C '$REMOTE_DIR' -xf -"
ssh "$ALIEN" "rm -f /home/zoso/dev/void-node/.runtime/validator_epoch_manifests/verified-current && ln -s '$REMOTE_DIR' /home/zoso/dev/void-node/.runtime/validator_epoch_manifests/verified-current && systemctl --user restart void-node.service"

echo
echo "=== [8] prove Alien ==="
ssh "$ALIEN" "sleep 4; curl -fsS http://127.0.0.1:4100/__void/runtime/validator-truth/status | python3 -m json.tool | sed -n '1,110p'; echo; curl -fsS http://127.0.0.1:4100/__void/runtime/validator-truth/epoch/$EPOCH | python3 -m json.tool"

echo
echo "=== [9] tag checkpoint ==="
cd "$ROOT"
TAG="ckpt-validator${EPOCH}-crossbox-really-green-$(date +%Y%m%d-%H%M%S)"
git tag "$TAG"
git push origin "$TAG"
echo "tag=$TAG"

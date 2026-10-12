#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

MARKER="VOID_VALIDATOR_CROSSBOX_CLOSEOUT_V1"
EPOCH="${1:?usage: validator-crossbox-closeout.sh <epoch> <vaultName>}"
VAULT="${2:?usage: validator-crossbox-closeout.sh <epoch> <vaultName>}"
CROSSBOX_SSH_TARGET="${CROSSBOX_SSH_TARGET:-${ALIEN:-}}"
CONFIRM_VALIDATOR_CROSSBOX_CLOSEOUT="${CONFIRM_VALIDATOR_CROSSBOX_CLOSEOUT:-}"
BASE="${BASE:-http://127.0.0.1:4100}"
ROOT="${VOID_REPO:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
RUNTIME="$ROOT/.runtime/validator_epoch_manifests"
COMPARE_LATEST="$ROOT/.runtime/validator_truth_compare/latest.json"

hold(){
  echo "$MARKER HOLD: $*" >&2
  exit 2
}

valid_ssh_target(){
  local target="$1"
  [[ "$target" =~ ^([A-Za-z0-9][A-Za-z0-9._-]*@)?[A-Za-z0-9][A-Za-z0-9._-]*$ ]]
}

require_crossbox_source_parity(){
  local local_status local_head local_host local_short remote_truth remote_host remote_head
  local_status="$(git -C "$ROOT" status --porcelain=v1 --untracked-files=all)" \
    || hold "local repository status unavailable"
  [ -z "$local_status" ] || hold "local repository must be clean before validator closeout"
  local_head="$(git -C "$ROOT" rev-parse HEAD)" \
    || hold "local repository HEAD unavailable"
  [[ "$local_head" =~ ^[0-9a-f]{40}$ ]] || hold "local repository HEAD invalid"

  remote_truth="$(
    ssh -o BatchMode=yes -o ConnectTimeout=6 "$CROSSBOX_SSH_TARGET" '
set -euo pipefail
cd "$HOME/dev/void-node"
test -z "$(git status --porcelain=v1 --untracked-files=all)"
printf "%s\n%s\n" "$(hostname)" "$(git rev-parse HEAD)"
'
  )" || hold "remote clean repository identity unavailable"

  remote_host="$(printf '%s\n' "$remote_truth" | sed -n '1p')"
  remote_head="$(printf '%s\n' "$remote_truth" | sed -n '2p')"
  [[ "$remote_head" =~ ^[0-9a-f]{40}$ ]] || hold "remote repository HEAD invalid"
  [ "$remote_head" = "$local_head" ] || hold "local/remote repository HEAD mismatch"

  local_host="$(hostname)"
  local_short="$(hostname -s)"
  [ -n "$remote_host" ] || hold "remote hostname missing"
  [ "$remote_host" != "$local_host" ] || hold "remote resolved to local host"
  [ "$remote_host" != "$local_short" ] || hold "remote resolved to local host"

  echo "local_source_head=$local_head"
  echo "remote_source_head=$remote_head"
  echo "remote_source_host=$remote_host"
  echo "crossbox_source_parity=true"
}

[ -n "$CROSSBOX_SSH_TARGET" ] || hold "missing explicit CROSSBOX_SSH_TARGET (or legacy ALIEN)"
valid_ssh_target "$CROSSBOX_SSH_TARGET" || hold "invalid explicit CROSSBOX_SSH_TARGET"
[[ "$EPOCH" =~ ^[1-9][0-9]{0,5}$ ]] || hold "epoch must be a canonical positive integer <= 6 digits"
[[ "$VAULT" =~ ^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$ ]] || hold "vault name is unsafe"

target_guard="$(printf '%s' "$CROSSBOX_SSH_TARGET" | tr '[:upper:]' '[:lower:]')"
case "$target_guard" in
  *100.122.79.39*|*zoso-alienware-aurora-r7.taila47fd.ts.net*|*alienware*)
    hold "retired Alienware target is forbidden"
    ;;
esac

[ "$CONFIRM_VALIDATOR_CROSSBOX_CLOSEOUT" = "publishValidatorCrossboxCloseoutV1" ] \
  || hold "confirmation token required"

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

require_crossbox_source_parity

LIVE_STAGE="$RUNTIME/upgrade-live-${VAULT}-final-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$LIVE_STAGE"

echo "=== [1] using ==="
echo "marker=$MARKER"
echo "epoch=$EPOCH"
echo "vault=$VAULT"
echo "crossbox_ssh_target=$CROSSBOX_SSH_TARGET"
echo "explicit_remote_target=true"
echo "retired_alienware_target=false"
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
ssh "$CROSSBOX_SSH_TARGET" "mkdir -p '$REMOTE_DIR'"
tar -C "$RUNTIME/verified-current" -cf - . | ssh "$CROSSBOX_SSH_TARGET" "tar -C '$REMOTE_DIR' -xf -"
ssh "$CROSSBOX_SSH_TARGET" "rm -f /home/zoso/dev/void-node/.runtime/validator_epoch_manifests/verified-current && ln -s '$REMOTE_DIR' /home/zoso/dev/void-node/.runtime/validator_epoch_manifests/verified-current && systemctl --user restart void-node.service"

echo
echo "=== [8] prove Alien ==="
ssh "$CROSSBOX_SSH_TARGET" "sleep 4; curl -fsS http://127.0.0.1:4100/__void/runtime/validator-truth/status | python3 -m json.tool | sed -n '1,110p'; echo; curl -fsS http://127.0.0.1:4100/__void/runtime/validator-truth/epoch/$EPOCH | python3 -m json.tool"

echo
echo "=== [9] tag checkpoint ==="
cd "$ROOT"
TAG="ckpt-validator${EPOCH}-crossbox-really-green-$(date +%Y%m%d-%H%M%S)"
git tag "$TAG"
git push origin "$TAG"
echo "tag=$TAG"

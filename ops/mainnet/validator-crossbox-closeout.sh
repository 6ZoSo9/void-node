#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand
umask 077

MARKER="VOID_VALIDATOR_CROSSBOX_CLOSEOUT_V1"
EPOCH="${1:?usage: validator-crossbox-closeout.sh <epoch> <vaultName>}"
VAULT="${2:?usage: validator-crossbox-closeout.sh <epoch> <vaultName>}"

ROOT="${VOID_REPO:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
RUNTIME="$ROOT/.runtime/validator_epoch_manifests"
COMPARE_LATEST="$ROOT/.runtime/validator_truth_compare/latest.json"

CROSSBOX_SSH_TARGET="${CROSSBOX_SSH_TARGET:-}"
LOCAL_SERVICE="${CROSSBOX_LOCAL_SERVICE:-}"
REMOTE_SERVICE="${CROSSBOX_REMOTE_SERVICE:-}"
LOCAL_BASE="${CROSSBOX_LOCAL_BASE:-}"
REMOTE_BASE="${CROSSBOX_REMOTE_BASE:-}"
CONFIRM_VALIDATOR_CROSSBOX_CLOSEOUT="${CONFIRM_VALIDATOR_CROSSBOX_CLOSEOUT:-}"

hold(){
  echo "$MARKER HOLD: $*" >&2
  exit 2
}

valid_ssh_target(){
  local target="$1"
  [[ "$target" =~ ^([A-Za-z0-9][A-Za-z0-9._-]*@)?[A-Za-z0-9][A-Za-z0-9._-]*$ ]]
}

valid_service(){
  [[ "$1" =~ ^[A-Za-z0-9_.@-]+\.service$ ]]
}

valid_loopback_base(){
  python3 - "$1" <<'PY'
import sys
from urllib.parse import urlsplit

value = sys.argv[1]
try:
    u = urlsplit(value)
except Exception:
    raise SystemExit(1)

if u.scheme != "http":
    raise SystemExit(1)
if u.hostname not in {"127.0.0.1", "::1"}:
    raise SystemExit(1)
if u.username is not None or u.password is not None:
    raise SystemExit(1)
if u.query or u.fragment:
    raise SystemExit(1)
if u.path not in {"", "/"}:
    raise SystemExit(1)
try:
    port = u.port
except ValueError:
    raise SystemExit(1)
if port is None or not (1024 <= port <= 65535):
    raise SystemExit(1)
PY
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
    ssh -o BatchMode=yes -o ConnectTimeout=8 "$CROSSBOX_SSH_TARGET" '
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

[ -n "$CROSSBOX_SSH_TARGET" ] \
  || hold "missing explicit CROSSBOX_SSH_TARGET"
valid_ssh_target "$CROSSBOX_SSH_TARGET" \
  || hold "invalid explicit CROSSBOX_SSH_TARGET"

target_guard="$(printf '%s' "$CROSSBOX_SSH_TARGET" | tr '[:upper:]' '[:lower:]')"
case "$target_guard" in
  *100.122.79.39*|*zoso-alienware-aurora-r7.taila47fd.ts.net*|*alienware*)
    hold "retired Alienware target is forbidden"
    ;;
esac

[[ "$EPOCH" =~ ^[1-9][0-9]{0,5}$ ]] \
  || hold "epoch must be a canonical positive integer <= 6 digits"
[[ "$VAULT" =~ ^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$ ]] \
  || hold "vault name is unsafe"

[ -n "$LOCAL_SERVICE" ] \
  || hold "missing explicit CROSSBOX_LOCAL_SERVICE"
[ -n "$REMOTE_SERVICE" ] \
  || hold "missing explicit CROSSBOX_REMOTE_SERVICE"
valid_service "$LOCAL_SERVICE" \
  || hold "invalid CROSSBOX_LOCAL_SERVICE"
valid_service "$REMOTE_SERVICE" \
  || hold "invalid CROSSBOX_REMOTE_SERVICE"

[ -n "$LOCAL_BASE" ] \
  || hold "missing explicit CROSSBOX_LOCAL_BASE"
[ -n "$REMOTE_BASE" ] \
  || hold "missing explicit CROSSBOX_REMOTE_BASE"
valid_loopback_base "$LOCAL_BASE" \
  || hold "CROSSBOX_LOCAL_BASE must be an explicit loopback http base with port"
valid_loopback_base "$REMOTE_BASE" \
  || hold "CROSSBOX_REMOTE_BASE must be an explicit loopback http base with port"

[ "$CONFIRM_VALIDATOR_CROSSBOX_CLOSEOUT" = "publishValidatorCrossboxCloseoutV1" ] \
  || hold "confirmation token required"

OUT_DIR="$(
python3 - <<'PY' "$RUNTIME" "$VAULT" "$EPOCH"
import sys
from pathlib import Path

runtime, vault, epoch = sys.argv[1:4]
target = f"epoch-{int(epoch):06d}.manifest.verified.json"
cands = sorted(
    Path(runtime).glob(f"upgrade-track-{vault}-*"),
    key=lambda p: p.stat().st_mtime,
)
for p in reversed(cands):
    if (p / "import" / target).exists():
        print(p)
        raise SystemExit(0)
raise SystemExit(f"[ERR] no upgrade-track-{vault}-* with {target}")
PY
)" || hold "target verified manifest generation unavailable"

require_crossbox_source_parity

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
LIVE_STAGE="$RUNTIME/upgrade-live-$VAULT-final-$STAMP"
mkdir -p "$LIVE_STAGE"
chmod 700 "$LIVE_STAGE"

echo "=== [1] bounded closeout plan ==="
echo "marker=$MARKER"
echo "epoch=$EPOCH"
echo "vault=$VAULT"
echo "crossbox_ssh_target=$CROSSBOX_SSH_TARGET"
echo "local_service=$LOCAL_SERVICE"
echo "remote_service=$REMOTE_SERVICE"
echo "local_base=$LOCAL_BASE"
echo "remote_base=$REMOTE_BASE"
echo "out_dir=$OUT_DIR"
echo "legacy_void_node_service_assumption=false"
echo "legacy_remote_4100_assumption=false"
echo "retired_alienware_target=false"

echo
echo "=== [2] prove target files ==="
ls -l \
  "$OUT_DIR/import/epoch-$(printf '%06d' "$EPOCH").manifest.verified.json" \
  "$OUT_DIR/import/epoch-$(printf '%06d' "$EPOCH").verify.json"

echo
echo "=== [3] stage verified manifests 1..$EPOCH inertly ==="
readarray -t MANIFESTS < <(
python3 - <<'PY' "$COMPARE_LATEST" "$OUT_DIR" "$EPOCH" "$RUNTIME"
import glob
import json
import sys
from pathlib import Path

compare_path, out_dir, target_epoch_s, runtime_s = sys.argv[1:5]
target_epoch = int(target_epoch_s)
runtime = Path(runtime_s)

compare = json.loads(Path(compare_path).read_text(encoding="utf-8"))
upgrade_manifest = Path(str(compare["upgradeManifest"]))
if not upgrade_manifest.exists():
    raise SystemExit(f"[ERR] upgrade manifest missing: {upgrade_manifest}")
print(str(upgrade_manifest))

for epoch in range(2, target_epoch + 1):
    if epoch == target_epoch:
        p = Path(out_dir) / "import" / f"epoch-{epoch:06d}.manifest.verified.json"
        if not p.exists():
            raise SystemExit(f"[ERR] missing target epoch manifest: {p}")
        print(str(p))
        continue

    matches = []
    pattern = str(runtime / "**" / "import" / f"epoch-{epoch:06d}.manifest.verified.json")
    for g in glob.glob(pattern, recursive=True):
        p = Path(g)
        matches.append((p.stat().st_mtime, str(p)))

    if not matches:
        raise SystemExit(f"[ERR] no prior verified manifest found for epoch {epoch}")

    matches.sort()
    print(matches[-1][1])
PY
) || hold "failed to resolve verified manifest generation"

for f in "${MANIFESTS[@]}"; do
  cp -a "$f" "$LIVE_STAGE/"
done

echo "staged_manifest_count=${#MANIFESTS[@]}"
echo "live_stage=$LIVE_STAGE"
echo "publication_performed=false"

echo
echo "=== [4] enter reviewed crash-atomic transaction runner ==="
exec node "$ROOT/ops/mainnet/void-validator-crossbox-transaction-run-v1.mjs" run \
  --source-dir "$LIVE_STAGE" \
  --epoch "$EPOCH" \
  --vault "$VAULT" \
  --ssh-target "$CROSSBOX_SSH_TARGET" \
  --local-service "$LOCAL_SERVICE" \
  --remote-service "$REMOTE_SERVICE" \
  --local-base "$LOCAL_BASE" \
  --remote-base "$REMOTE_BASE" \
  --confirm "runReviewedValidatorCrossboxTransactionV1"

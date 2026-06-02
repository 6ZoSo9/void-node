#!/usr/bin/env bash
set -uo pipefail
set +H
set +o histexpand 2>/dev/null || true

cd "${VOID_REPO:-$HOME/dev/void-node}" || exit 1

NODE="${NODE:-http://127.0.0.1:4100}"
ALIEN="${ALIEN:-zoso@100.122.79.39}"
OUT="${OUT:-/tmp/void-public-site-bundle-auto-materialize-proof-$(date +%Y%m%d-%H%M%S)}"
mkdir -p "$OUT"

VOIDCHAIN_DATASET="1b8bf41db2d64f8877d0aec397373fa1"
VOIDCHAIN_ROOT="db0c54edcad0130b8de61e73ec61ff60701e97bee6bb3ac065d6c55efbd634e2"
NULLFEED_DATASET="2930d5e8436eb5674be06d2b0152d20c"
NULLFEED_ROOT="f4c8b03bb8f5dae627bb6df9eddab48060bc0dab1a8c886d56dbeab2b4b0c372"

FAIL=0
RESTORE_ITEMS=()

ok(){ echo "[ok] $*"; }
fail(){ echo "[fail] $*"; FAIL=1; }

restore_backups(){
  for item in "${RESTORE_ITEMS[@]:-}"; do
    site="${item%%::*}"
    rest="${item#*::}"
    dir="${rest%%::*}"
    bak="${rest#*::}"
    if [ -d "$bak" ] && [ ! -f "$dir/chunk_000000.bin" ]; then
      echo "[restore] $site restoring packed dir"
      rm -rf "$dir"
      cp -a "$bak" "$dir"
    fi
  done
}
trap restore_backups EXIT

check_ready(){
  local url="$1"
  local file="$2"
  curl -fsS --max-time 8 "$url/__void/ready.json" > "$file" || return 1
  python3 - "$file" <<'PY'
import json, sys
j=json.load(open(sys.argv[1], encoding="utf-8"))
assert j.get("ready") is True, j
assert int(j.get("gap", -1)) == 0, j
assert int(j.get("txroot_live", 0)) == 1, j
print("[ok] ready/gap/txroot")
PY
}

check_packed(){
  local dir="$1"
  local root="$2"
  local label="$3"

  if [ ! -f "$dir/chunk_000000.bin" ]; then
    fail "$label chunk missing"
    return
  fi
  if [ ! -f "$dir/root.txt" ]; then
    fail "$label root.txt missing"
    return
  fi

  got="$(sha256sum "$dir/chunk_000000.bin" | awk '{print $1}')"
  rt="$(cat "$dir/root.txt" | tr -d '\r\n')"

  if [ "$got" = "$root" ] && [ "$rt" = "$root" ]; then
    ok "$label packed dir hash/root"
  else
    fail "$label mismatch got=$got root_txt=$rt expected=$root"
  fi
}

exercise_site(){
  local site="$1"
  local dataset="$2"
  local root="$3"
  local route="/site/$site"
  local dir="data_a/datanet/publish_shim_v1/packed/$dataset"
  local bak="$OUT/$site.packed.backup"

  echo
  echo "=== exercise $site auto-materialization ==="

  if [ ! -d "$dir" ]; then
    fail "$site packed dir missing before proof"
    return
  fi

  rm -rf "$bak"
  cp -a "$dir" "$bak"
  RESTORE_ITEMS+=("$site::$dir::$bak")

  echo "[test] removing local packed dir for $site to force peer materialization"
  rm -rf "$dir"

  curl -fsS --max-time 12 -D "$OUT/$site.headers" -o "$OUT/$site.html" "$NODE$route" || {
    fail "$site route failed during materialization"
    return
  }

  grep -qi '^x-void-datanet-backed: true' "$OUT/$site.headers" \
    && ok "$site served DataNet-backed after materialization" \
    || fail "$site not DataNet-backed"

  grep -qi '^x-void-site-source: datanet_live_v1_peer_materialized' "$OUT/$site.headers" \
    && ok "$site source is peer materialized" \
    || fail "$site source not peer materialized"

  grep -qi '^x-void-site-peer-materialized: true' "$OUT/$site.headers" \
    && ok "$site peer materialized header present" \
    || fail "$site peer materialized header missing"

  grep -qi '^x-void-site-peer-http:' "$OUT/$site.headers" \
    && ok "$site peer http header present" \
    || fail "$site peer http header missing"

  check_packed "$dir" "$root" "$site materialized"
}

echo "=== public site bundle auto-materialize proof ==="
echo "mutation=local_site_bundle_cache_restore_only"
echo "note=Temporarily removes fixed local packed site bundle dirs, fetches from configured peer, verifies hash/root, and leaves verified packed dirs in place."
echo

echo "=== [1] git/runtime truth ==="
git status --short
git rev-parse --short HEAD
git describe --tags --always --dirty
check_ready "$NODE" "$OUT/local.ready.json" || fail "local ready"

echo
echo "=== [2] remote truth and peer fetch preflight ==="
ssh "$ALIEN" 'cd "$HOME/dev/void-node" && git status --short && git rev-parse --short HEAD && git describe --tags --always --dirty && curl -fsS --max-time 8 http://127.0.0.1:4100/__void/ready.json && echo' | tee "$OUT/remote.truth.txt"

for id in "$VOIDCHAIN_DATASET" "$NULLFEED_DATASET"; do
  ssh "$ALIEN" "curl -fsS --max-time 8 'http://127.0.0.1:4100/datanet/v1/fetch/$id?who=void-site-bundle-v1'" > "$OUT/remote.$id.fetch.json" \
    && ok "remote fetch preflight $id" \
    || fail "remote fetch preflight $id"
done

echo
echo "=== [3] force local auto-materialization from peer ==="
exercise_site "voidchain" "$VOIDCHAIN_DATASET" "$VOIDCHAIN_ROOT"
exercise_site "nullfeed" "$NULLFEED_DATASET" "$NULLFEED_ROOT"

echo
echo "=== [4] post-proof routes stay DataNet-backed ==="
for site in voidchain nullfeed; do
  curl -fsS --max-time 8 -D "$OUT/$site.post.headers" -o "$OUT/$site.post.html" "$NODE/site/$site" || fail "$site post route"
  grep -qi '^x-void-datanet-backed: true' "$OUT/$site.post.headers" \
    && ok "$site post DataNet-backed" \
    || fail "$site post not DataNet-backed"
done

echo
echo "=== [5] status smoke ==="
make mainnet0-status-smoke || FAIL=1
ssh "$ALIEN" 'cd "$HOME/dev/void-node" && make mainnet0-status-smoke' || FAIL=1

echo
echo "=== [6] summary ==="
python3 - <<PY
print({
  "public_site_bundle_auto_materialize": "green" if $FAIL == 0 else "failed",
  "mutation": "local_site_bundle_cache_restore_only",
  "peer": "Alienware via SSH/local HTTP",
  "voidchain_dataset": "$VOIDCHAIN_DATASET",
  "nullfeed_dataset": "$NULLFEED_DATASET",
  "out": "$OUT"
})
PY

if [ "$FAIL" -eq 0 ]; then
  echo "[ok] public site bundle auto-materialize proof passed"
  echo "out=$OUT"
  exit 0
fi

echo "[fail] public site bundle auto-materialize proof failed"
echo "out=$OUT"
exit 1

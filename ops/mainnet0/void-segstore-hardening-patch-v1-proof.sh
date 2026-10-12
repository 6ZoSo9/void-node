#!/usr/bin/env bash

SRC="src/chain/seg_store.ts"
FIXTURE="fixtures/chain/void-segstore-hardening-patch-v1.json"
DOC="docs/architecture/void-segstore-hardening-patch-v1.md"
MARKER="VOID_SEGSTORE_HARDENING_PATCH_V1"

fail() {
  echo "void_segstore_hardening_patch_v1_proof=FAIL reason=$1"
  exit 1
}

[ -f "$SRC" ] || fail "missing_source"
[ -f "$FIXTURE" ] || fail "missing_fixture"
[ -f "$DOC" ] || fail "missing_doc"

grep -Fq "$MARKER" "$FIXTURE" || fail "missing_marker_fixture"
grep -Fq "$MARKER" "$DOC" || fail "missing_marker_doc"

grep -Fq "function atomicWriteText" "$SRC" || fail "missing_atomic_write_text"
grep -Fq "atomicWriteJson(meta, m);" "$SRC" || fail "missing_atomic_meta_write"
grep -Fq "atomicWriteText(wp, keep.join" "$SRC" || fail "missing_atomic_wal_prune"

if grep -Fq "fs.writeFileSync(meta, JSON.stringify(m, null, 2));" "$SRC"; then
  fail "inplace_meta_write_still_present"
fi

if grep -Fq "fs.writeFileSync(wp, keep.join" "$SRC"; then
  fail "inplace_wal_prune_still_present"
fi

python3 - "$FIXTURE" <<'PY'
import json
import sys
with open(sys.argv[1], "r", encoding="utf-8") as f:
    data = json.load(f)

assert data["marker"] == "VOID_SEGSTORE_HARDENING_PATCH_V1"
assert data["scope"]["meta_json_writes_atomic"] is True
assert data["scope"]["wal_prune_rewrite_atomic"] is True
assert data["authority_boundary"]["activates_new_authority"] is False
assert data["authority_boundary"]["enables_public_mutation"] is False
assert data["authority_boundary"]["grants_signer_wallet_access"] is False
assert data["authority_boundary"]["authorizes_execution"] is False
assert data["authority_boundary"]["moves_funds"] is False
assert data["authority_boundary"]["mutates_ledgers"] is False
assert data["authority_boundary"]["changes_route_behavior"] is False

print("fixture_json_green=true")
PY

echo "void_segstore_hardening_patch_v1_proof=GREEN marker=$MARKER"

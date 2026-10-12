#!/usr/bin/env bash

SRC="src/index.ts"
FIXTURE="fixtures/boot/void-startup-storage-readiness-gate-v1.json"
DOC="docs/architecture/void-startup-storage-readiness-gate-v1.md"
MARKER="VOID_STARTUP_STORAGE_READINESS_GATE_V1"

fail() {
  echo "void_startup_storage_readiness_gate_v1_proof=FAIL reason=$1"
  exit 1
}

[ -f "$SRC" ] || fail "missing_source"
[ -f "$FIXTURE" ] || fail "missing_fixture"
[ -f "$DOC" ] || fail "missing_doc"

grep -Fq "$MARKER" "$SRC" || fail "missing_marker_source"
grep -Fq "$MARKER" "$FIXTURE" || fail "missing_marker_fixture"
grep -Fq "$MARKER" "$DOC" || fail "missing_marker_doc"

grep -Fq 'type StorageRepairState = "pending" | "green" | "failed" | "skipped";' "$SRC" || fail "missing_state_type"
grep -Fq 'let storageRepairState: StorageRepairState = "pending";' "$SRC" || fail "missing_pending_initial_state"
grep -Fq '__void_storage_repair_state' "$SRC" || fail "missing_global_state_getter"
grep -Fq '__void_storage_repair_readiness_v1' "$SRC" || fail "missing_global_readiness_getter"

grep -Fq 'VOID_SKIP_AUTOREPAIR === "1"' "$SRC" || fail "missing_skip_autorepair_branch"
grep -Fq 'storageRepairState = "skipped";' "$SRC" || fail "missing_skipped_state"
grep -Fq 'storageRepairState = "green";' "$SRC" || fail "missing_green_state"
grep -Fq 'storageRepairState = "failed";' "$SRC" || fail "missing_failed_state"
grep -Fq 'VOID_ALLOW_PUBLIC_STORAGE_WITH_REPAIR_SKIPPED' "$SRC" || fail "missing_skipped_override"

grep -Fq 'function requireStorageRepairGreen' "$SRC" || fail "missing_guard_function"
grep -Fq 'return res.status(503).json(storageRepairPublicBody(state, req));' "$SRC" || fail "missing_503_response"
grep -Fq 'const STORAGE_DERIVED_PREFIXES' "$SRC" || fail "missing_prefix_list"
grep -Fq 'storageRepairGateMatchesPath' "$SRC" || fail "missing_path_matcher"
grep -Fq 'app.use((req:any, res:any, next:any) => {' "$SRC" || fail "missing_gate_middleware"

grep -Fq '"/head"' "$SRC" || fail "missing_head_prefix"
grep -Fq '"/blocks/"' "$SRC" || fail "missing_blocks_prefix"
grep -Fq '"/tx/lookup"' "$SRC" || fail "missing_tx_lookup_prefix"
grep -Fq '"/receipts/"' "$SRC" || fail "missing_receipts_prefix"
grep -Fq '"/mempool"' "$SRC" || fail "missing_mempool_prefix"
grep -Fq '"/datanet/v1/"' "$SRC" || fail "missing_datanet_prefix"
grep -Fq '"/__void/mainnet0/validator-candidate-registry/"' "$SRC" || fail "missing_validator_registry_prefix"
grep -Fq '"/__void/runtime/validator-truth/"' "$SRC" || fail "missing_validator_truth_prefix"

grep -Fq '/__void/diag/storage-repair-readiness-v1.json' "$SRC" || fail "missing_local_diag_route"

python3 - "$SRC" "$FIXTURE" <<'PY'
import json
import re
import sys

src_path, fixture_path = sys.argv[1], sys.argv[2]
src = open(src_path, "r", encoding="utf-8").read()
data = json.load(open(fixture_path, "r", encoding="utf-8"))

assert data["marker"] == "VOID_STARTUP_STORAGE_READINESS_GATE_V1"
assert data["default_behavior"]["pending_blocks_storage_derived_public_truth"] is True
assert data["default_behavior"]["failed_blocks_storage_derived_public_truth"] is True
assert data["default_behavior"]["skipped_blocks_by_default"] is True
assert data["default_behavior"]["green_allows_storage_derived_public_truth"] is True
assert data["route_boundary"]["peers_routes_gated"] is False
assert data["authority_boundary"]["activates_new_authority"] is False
assert data["authority_boundary"]["enables_public_mutation"] is False
assert data["authority_boundary"]["adds_public_repair_trigger"] is False
assert data["authority_boundary"]["grants_signer_wallet_access"] is False
assert data["authority_boundary"]["authorizes_execution"] is False
assert data["authority_boundary"]["moves_funds"] is False
assert data["authority_boundary"]["mutates_ledgers"] is False
assert data["authority_boundary"]["changes_segstore"] is False
assert data["authority_boundary"]["changes_wal_model"] is False

m = re.search(r"const STORAGE_DERIVED_PREFIXES = \[(.*?)\];", src, re.S)
assert m, "prefix list not found"
prefix_block = m.group(1)
assert '"/peers"' not in prefix_block
assert '"/peers/' not in prefix_block
assert '"/tx/submit"' not in prefix_block
assert '"/maintenance/auto-repair"' not in prefix_block

print("fixture_json_green=true")
print("prefix_boundary_green=true")
PY

echo "void_startup_storage_readiness_gate_v1_proof=GREEN marker=$MARKER"

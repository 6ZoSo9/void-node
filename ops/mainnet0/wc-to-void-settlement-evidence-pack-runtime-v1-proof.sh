#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

python3 - <<'PY'
import json
from pathlib import Path

src = Path("src/index.ts").read_text()
static_pack = json.loads(Path("docs/public/public-node-wc-to-void-settlement-evidence-pack-v1.json").read_text())

assert static_pack["marker"] == "VOID_WC_TO_VOID_SETTLEMENT_EVIDENCE_PACK_V1"
assert static_pack["tx_hash"] == "0xaccef593ae1cab3f99ff786a26913b0d873ee789dfb96056007dd9dab9f3e717"
assert static_pack["chain_id"] == "2050"
assert static_pack["value_void"] == "1.000000"
assert static_pack["settlement_record_key"] == "710e514643aa0e77c52ea07b24986f0cfcf23ab5426be352b7e52265fb46cec1"

assert "VOID_WC_TO_VOID_SETTLEMENT_EVIDENCE_PACK_RUNTIME_V1" in src
assert "wcToVoidSettlementEvidencePackV1" in src
assert "__void_wc_to_void_settlement_evidence_pack_runtime_v1_mounted" in src
assert "mountWcToVoidSettlementEvidencePackRuntimeV1" in src
assert 'const APP: any = G.__void_http_app || G.app || null;' in src
assert 'setTimeout(mountWcToVoidSettlementEvidencePackRuntimeV1, 400);' in src
assert 'APP.get("/public-node/wc-to-void/settlement-evidence-pack-v1.json"' in src
assert 'APP.get("/public-node/wc-to-void/settlement-evidence-pack-v1"' in src
assert '\napp.get("/public-node/wc-to-void/settlement-evidence-pack-v1' not in src

assert "read_only_public_evidence_pack: true" in src
assert "does_not_create_public_mutation: true" in src
assert "private_settlement_ledger_not_served_publicly: true" in src
assert "does_not_call_rpc: true" in src
assert "does_not_broadcast_tx: true" in src
assert "does_not_send_void: true" in src

print("VOID_WC_TO_VOID_SETTLEMENT_EVIDENCE_PACK_RUNTIME_V1_JSON_ASSERT_GREEN")
PY

echo "VOID_WC_TO_VOID_SETTLEMENT_EVIDENCE_PACK_RUNTIME_V1_PROOF_GREEN"

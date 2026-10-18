#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
from pathlib import Path
import stat

ROOT = Path(__file__).resolve().parents[1]
PLAN_REL = "ops/security/buy-void-presale-host-evidence-collection-plan-v1.json"
PLAN_BLOB = "ad68175e629fd1cf90180db3a904f84834314fdd"
PLAN_ID = "voidbuyhostevplan1_665336abc8030749d2d540f412c4dc597ecece47ecb5aa9f2928529adeba5aab"
PARENT_HEAD = "a15326fc288f0bb01bfc179fdf93b2da9231f8b6"

PARENT_PINS = {
    "scripts/void_buy_void_presale_source_freeze_host_install_qualification_v2.py": "64e6e5733f1f85da342f8c2da9c5e2c5e5e41a09",
    "scripts/prove_buy_void_presale_source_freeze_host_install_qualification_v2.py": "fd2e917142f2571407af6bd13a9cf7d103d2428b",
    "docs/operators/buy-void-presale-source-freeze-host-install-qualification-v2.md": "95b0c7e5c12c58eb7a49d68185282767f3a91ff0",
    ".github/workflows/buy-void-presale-source-freeze-host-install-qualification-v2.yml": "a3100bc249a51f0b1c612bc8b9474920b89d9bb5",
}

PRIMITIVE_PINS = {
    "ops/precision/void_buy_void_source_finality_v7_deployment_receipt_install_v1.ts": "3de6e4bd1f9aa2e9c0a0889cc7c0ab489cb306c0",
    "ops/precision/void_buy_void_source_finality_live_process_binding_v2_receipt_publish_v1.ts": "a334ab29477dec3e36862a512191b9701debb73e",
    "src/economic/buy_void_source_finality_live_process_binding_v2.ts": "987c97568a4d1b9814218603df48a65dbfeed18f",
    "ops/precision/void_buy_void_source_finality_live_process_v2_collection_plan_v1.ts": "d47a6f99870f385c1bc938adbef74535b78eba1f",
    "src/economic/buy_void_allocation_custody_witness_live_read_replay_rollback_independence_v1.ts": "2d5fc24498b569f20701445d6214a8ca31e4f701",
    "tools/void-buy-allocation-custody-witness-live-read-replay-rollback-policy-evidence-v1.mjs": "cf40d9d4a19d138d74aee849a6c02f96ee362dbb",
    "src/economic/buy_void_allocation_custody_witness_live_read_replay_rollback_second_control_composition_v1.ts": "97180cc03e3f1b2f9935191ac6aafe4b15307708",
    "ops/precision/void_buy_void_epoch2_live_composition_native_installed_qualification_v5.py": "a04c2e7665294cdd142426e9eb01ee27c5292b8d",
    "scripts/prove_void_buy_void_epoch2_live_composition_native_installed_qualification_v5.py": "c14ec00acffbc55630aa68db0013d97cac068ab3",
}

def git_blob(raw: bytes) -> str:
    return hashlib.sha1(
        b"blob " + str(len(raw)).encode("ascii") + b"\0" + raw
    ).hexdigest()

def read_pinned(relative: str, expected: str, max_bytes: int = 1024 * 1024) -> bytes:
    path = ROOT / relative
    meta = path.lstat()
    assert stat.S_ISREG(meta.st_mode) and not stat.S_ISLNK(meta.st_mode)
    assert meta.st_nlink == 1 and 0 < meta.st_size <= max_bytes
    raw = path.read_bytes()
    assert len(raw) == meta.st_size
    assert git_blob(raw) == expected, relative
    return raw

def canonical(value: object) -> bytes:
    return json.dumps(
        value,
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=True,
    ).encode("ascii")

plan_raw = read_pinned(PLAN_REL, PLAN_BLOB, 64 * 1024)
plan = json.loads(plan_raw.decode("utf-8", "strict"))
assert plan["schema"] == "void_buy_void_presale_host_evidence_collection_plan_v1"
assert plan["marker"] == "VOID_BUY_VOID_PRESALE_HOST_EVIDENCE_COLLECTION_PLAN_V1"
assert plan["version"] == 1
assert plan["repository"] == "6ZoSo9/void-node"
assert plan["plan_id"] == PLAN_ID
body = dict(plan)
body.pop("plan_id")
assert PLAN_ID == "voidbuyhostevplan1_" + hashlib.sha256(canonical(body)).hexdigest()

parent = plan["parent_host_install_qualification"]
assert parent["review_head"] == PARENT_HEAD
assert parent["required_terminal_status"] == (
    "HOST_INSTALL_QUALIFICATION_HOLD_INDEPENDENT_EVIDENCE_REQUIRED"
)
for relative, expected in PARENT_PINS.items():
    read_pinned(relative, expected)

compat = plan["current_main_compatibility"]
assert compat == {
    "reference_head": "e64049c3f460eae077364567f63aa3298ecf9c31",
    "all_pinned_primitive_blobs_match": True,
    "auto_adopt_later_main": False,
}

for relative, expected in PRIMITIVE_PINS.items():
    read_pinned(relative, expected, 2 * 1024 * 1024)

lanes = plan["evidence_lanes"]
receipt = lanes["authenticated_receipt_and_live_process"]
assert receipt["required"] is True
assert receipt["evidence_collected"] is False
assert receipt["authenticated_receipt_verified"] is False
assert receipt["same_live_process_binding_verified"] is False

custody = lanes["allocation_custody_storage_and_rollback"]
assert custody["required"] is True
assert custody["evidence_collected"] is False
assert custody["live_durable_storage_proven"] is False
assert custody["rollback_resistance_proven"] is False
assert custody["independent_custody_proven"] is False

epoch2 = lanes["epoch2_installed_generation"]
assert epoch2["required"] is True
assert epoch2["evidence_collected"] is False
assert epoch2["installed_generation_qualified"] is False

authority = plan["authority"]
assert authority["plan_only"] is True
for key, value in authority.items():
    if key != "plan_only":
        assert value is False, key
assert plan["next_gate"] == "SEPARATELY_AUTHORIZE_READ_ONLY_HOST_EVIDENCE_COLLECTION"

print("VOID_BUY_VOID_PRESALE_HOST_EVIDENCE_COLLECTION_PLAN_V1_PROOF_GREEN")
print("plan_id=" + PLAN_ID)
print("primitive_path_count=9")
print("all_pinned_primitive_blobs_match_current_stack=true")
print("receipt_evidence_collected=false")
print("custody_evidence_collected=false")
print("epoch2_installed_evidence_collected=false")
print("host_execution_authorized=false")
print("filesystem_read_authorized=false")
print("payment_acceptance_authorized=false")
print("public_presale_activation_authorized=false")
print("wc_void_market_activation_authorized=false")
print("funds_movement=false")
print("next_gate=SEPARATELY_AUTHORIZE_READ_ONLY_HOST_EVIDENCE_COLLECTION")

#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
LOCK_REL = "ops/security/buy-void-epoch2-dormant-first-entry-bootstrap-v5-candidate-lock-v1.json"
LOCK = ROOT / LOCK_REL
CANDIDATE_REL = "scripts/prove_buy_void_epoch2_dormant_first_entry_bootstrap_v5_candidate_v1.py"
CANDIDATE = ROOT / CANDIDATE_REL
WORKFLOW_REL = ".github/workflows/buy-void-epoch2-dormant-first-entry-bootstrap-v5-candidate-v1.yml"
DOC_REL = "docs/operators/buy-void-epoch2-dormant-first-entry-bootstrap-v5-candidate-v1.md"
SOURCE_REL = "ops/precision/void_buy_void_epoch2_dormant_first_entry_protected_install_bootstrap_v5.c"
MANIFEST_REL = "ops/security/buy-void-epoch2-dormant-first-entry-source-generation-v2.conf"
INSTALLER_REL = "ops/precision/void_buy_void_epoch2_dormant_binder_installer_first_entry_protected_install_v4.py"

MARKER = "VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_BOOTSTRAP_V5_CANDIDATE_LOCK_V1"
LOCK_ID = "voidbuye2dormantbootstraplock2_f2e419eb1643989a4b881b2d817ff097eff9d68d6d763a933d624301a93930e3"
SUPERSEDED_LOCK = "voidbuye2dormantbootstraplock1_ffd5e877b4bf594b7af4eac3f03fd7b846686949febcae54318ef08ee5793796"


def canonical(value: object) -> bytes:
    return json.dumps(
        value,
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=True,
    ).encode("ascii")


def sha256(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def git_blob(raw: bytes) -> str:
    return hashlib.sha1(
        b"blob " + str(len(raw)).encode("ascii") + b"\0" + raw
    ).hexdigest()


lock = json.loads(LOCK.read_bytes())
assert lock["schema"] == "void_buy_void_epoch2_dormant_first_entry_bootstrap_v5_candidate_lock_v1"
assert lock["marker"] == MARKER
assert lock["version"] == 1
assert lock["lock_id"] == LOCK_ID
material = dict(lock)
material.pop("lock_id")
assert LOCK_ID == "voidbuye2dormantbootstraplock2_" + sha256(canonical(material))

assert lock["repository"] == "6ZoSo9/void-node"
assert lock["candidate_source_head"] == "6808a0fb094b8e466e4726d36189d21c8988aa0e"
assert lock["candidate_merge"] == "80011ca7fa4e39963ca58fb2409b85a203910fe9"

assert lock["source_generation"] == {
    "id": "voidbuye2dormantsourcegen2_3ab7f9b6e23c6fd2fe82486fd2a396c3bd207e335675e6c5bfe58776ab99d6ff",
    "manifest_git_blob_sha1": "782f747cda24a214c64e8ec3f49b6791bbb62f97",
    "manifest_bytes": 2382,
    "manifest_sha256": "3ab7f9b6e23c6fd2fe82486fd2a396c3bd207e335675e6c5bfe58776ab99d6ff",
    "bootstrap_source_git_blob_sha1": "81fc960f1cec597b01875ed944b25e5b6574d34d",
    "bootstrap_source_bytes": 106764,
    "bootstrap_source_sha256": "3971380e0aa814ec2b600b7913f82080c27fa34a8d817b351c2cc8e0470d5ff8",
    "inner_installer_git_blob_sha1": "88577de29dddbe61d2c2f59179d0dcb62a49165a",
    "inner_installer_bytes": 127102,
    "inner_installer_sha256": "dff059887354ee0759ccf7d42165c6dddeb36a0f2fbb44ba977a8f0a506ccb51",
}

hosted = lock["candidate_hosted_evidence"]
assert hosted == {
    "workflow_run": 39039200493,
    "source_proof_job": 117415054432,
    "derive_job_a": 117415113850,
    "derive_job_b": 117415113791,
    "derive_job_c": 117415113837,
    "compare_job": 117415225295,
    "artifact_a": 12103626114,
    "artifact_b": 12103386715,
    "artifact_c": 12102984202,
    "three_report_byte_identity_verified": True,
    "three_binary_byte_identity_verified": True,
    "independent_rederivation_verified": True,
}

report = lock["candidate_report"]
assert report == {
    "candidate_id": "voidbuye2dormantbootstrapcand2_e256825988055133055605a8111fce96abdddc19ff890b483bfd5f341d6eccc2",
    "bytes": 2567,
    "sha256": "2d6343e40a8a97b22ccd49f48e056db62d26eb90eec883072c547deb9d985550",
    "git_blob_sha1": "06768084f59223f78330b8f7734d3ca03341eabb",
    "candidate_script_git_blob_sha1": "2b17ad5aebd44caf8162b88ea9b9d7e25161c75e",
    "candidate_workflow_git_blob_sha1": "a67b9a47dd18f8cd279bf1ed5c8eeeda8eaa3ce5",
    "candidate_doc_git_blob_sha1": "0597f155335f69fdd7ec11ccd63ee8ad4ae86205",
    "sealed_source_snapshot": True,
    "toolchain_revalidated_after_build": True,
}

assert lock["native_binary"] == {
    "bytes": 874600,
    "sha256": "4392f1aa3e35edf4e347fd81c15c9b1ba0810c71111f4e96dafcbf2e1cb52374",
    "static_no_interp": True,
    "two_builds_byte_identical": True,
    "hosted_three_way_byte_identical": True,
    "independent_rederivation_verified": True,
}

assert lock["superseded_sourcegen1_lock"] == SUPERSEDED_LOCK
assert lock["superseded_sourcegen1_lock_install_authority"] is False

expected_blobs = {
    CANDIDATE_REL: "2b17ad5aebd44caf8162b88ea9b9d7e25161c75e",
    WORKFLOW_REL: "a67b9a47dd18f8cd279bf1ed5c8eeeda8eaa3ce5",
    DOC_REL: "0597f155335f69fdd7ec11ccd63ee8ad4ae86205",
    SOURCE_REL: "81fc960f1cec597b01875ed944b25e5b6574d34d",
    MANIFEST_REL: "782f747cda24a214c64e8ec3f49b6791bbb62f97",
    INSTALLER_REL: "88577de29dddbe61d2c2f59179d0dcb62a49165a",
}
for rel, expected in expected_blobs.items():
    observed = git_blob((ROOT / rel).read_bytes())
    assert observed == expected, (rel, observed)

for key in (
    "candidate_accepted",
    "native_binary_identity_accepted",
    "source_generation_identity_accepted",
):
    assert lock[key] is True

for key in (
    "protected_install_authorized",
    "live_execution_authorized",
    "credential_access_authorized",
    "private_key_access_authorized",
    "signing_authorized",
    "transaction_authorized",
    "rpc_call_authorized",
    "payment_acceptance_authorized",
    "public_presale_activation_authorized",
    "wc_void_market_activation_authorized",
    "treasury_liquidity_action_authorized",
    "funds_movement_authorized",
    "production_host_evidence_authority",
):
    assert lock[key] is False, key

assert lock["next_gate"] == (
    "void_buy_void_epoch2_dormant_first_entry_bootstrap_v5_materializer_v1"
)

cp = subprocess.run(
    ["/usr/bin/python3", "-I", "-B", str(CANDIDATE), "--self-test"],
    cwd=ROOT,
    stdin=subprocess.DEVNULL,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    check=False,
    timeout=30,
)
assert cp.returncode == 0, cp.stderr
for line in (
    "VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_BOOTSTRAP_V5_CANDIDATE_V1_SELF_TEST_GREEN",
    "exact_source_generation_bound=true",
    "sealed_source_snapshot_required=true",
    "candidate_accepted=false",
    "protected_install_authorized=false",
    "funds_movement=false",
):
    assert line in cp.stdout.splitlines(), line

print(MARKER + "_PROOF_GREEN")
print("lock_id=" + LOCK_ID)
print("hosted_three_way_candidate_identity_bound=true")
print("independent_rederivation_bound=true")
print("candidate_report_content_address_bound=true")
print("source_generation_identity_accepted=true")
print("candidate_accepted=true")
print("native_binary_identity_accepted=true")
print("superseded_sourcegen1_lock_install_authority=false")
print("protected_install_authorized=false")
print("live_execution_authorized=false")
print("credential_access_authorized=false")
print("signing_authorized=false")
print("transaction_authorized=false")
print("rpc_call_authorized=false")
print("funds_movement_authorized=false")
print("next_gate=void_buy_void_epoch2_dormant_first_entry_bootstrap_v5_materializer_v1")

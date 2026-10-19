#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
LOCK=ROOT/"ops/security/buy-void-epoch2-live-composition-runner-policy-candidate-lock-v6r3.json"
RUNNER=ROOT/"ops/precision/void_buy_void_epoch2_authenticated_credential_live_composition_v4.mjs"
CANDIDATE=ROOT/"scripts/prove_buy_void_epoch2_live_composition_runner_policy_candidate_v6r3.py"

MARKER="VOID_BUY_VOID_EPOCH2_LIVE_COMPOSITION_RUNNER_POLICY_CANDIDATE_LOCK_V6R3"
RUNNER_BLOB="62029fafa7073ab3768fec01f2147a7f4eefce2b"
CANDIDATE_BLOB="cecca32b8c9de8105e92abea915bd142813eb429"
SUPERSEDED_CANDIDATE="voidbuye2runnerpolcand6r3_eee91de4d93ea4ab3068621659a8420255772b49f25556f3d93cbd67d3059c0a"
SUPERSEDED_LOCK="voidbuye2runnerpollock6r3_4d55eadc456d48aed2e77df8a4897c0756b173761e7a10b0f1b53b24dd4d50a2"

def git_blob(raw:bytes)->str:
    return hashlib.sha1(b"blob "+str(len(raw)).encode("ascii")+b"\0"+raw).hexdigest()

assert git_blob(RUNNER.read_bytes())==RUNNER_BLOB
assert git_blob(CANDIDATE.read_bytes())==CANDIDATE_BLOB

lock=json.loads(LOCK.read_bytes())
assert lock["schema"]=="void_buy_void_epoch2_live_composition_runner_policy_candidate_lock_v6r3"
assert lock["marker"]==MARKER
assert lock["version"]==1
assert lock["status"]=="SUPERSEDED_RUNNER_V4_GENERATION_REDERIVATION_REQUIRED"
assert lock["superseded_candidate_id"]==SUPERSEDED_CANDIDATE
assert lock["superseded_lock_id"]==SUPERSEDED_LOCK
assert lock["superseded_runner_git_blob_sha1"]=="46da5a2df6ccace675ae6f572b11ba011b41efc8"
assert lock["current_runner_git_blob_sha1"]==RUNNER_BLOB
assert lock["current_candidate_script_git_blob_sha1"]==CANDIDATE_BLOB
assert lock["historical_v6r2_native_identity_remains_accepted"] is True
assert lock["current_candidate_id"] is None
assert lock["lock_id"] is None
for key in (
    "candidate_accepted","runner_identity_accepted",
    "native_reuse_identity_accepted","policy_template_accepted",
    "protected_install_authorized","live_execution_authorized",
    "credential_access_authorized","private_key_access_authorized",
    "signing_authorized","transaction_authorized","rpc_call_authorized",
    "payment_acceptance_authorized","public_presale_activation_authorized",
    "wc_void_market_activation_authorized","treasury_liquidity_action_authorized",
    "funds_movement_authorized","production_host_evidence_authority",
):
    assert lock[key] is False,key
assert lock["next_gate"]=="REDERIVE_V6R3_RUNNER_POLICY_CANDIDATE_FROM_REPAIRED_RUNNER_V4"

print(MARKER+"_SUPERSEDED_BARRIER_GREEN")
print("superseded_candidate_id="+SUPERSEDED_CANDIDATE)
print("superseded_lock_id="+SUPERSEDED_LOCK)
print("repaired_runner_v4_blob_bound=true")
print("repaired_candidate_source_blob_bound=true")
print("current_candidate_id=none")
print("current_lock_id=none")
print("candidate_accepted=false")
print("protected_install_authorized=false")
print("live_execution_authorized=false")
print("credential_access_authorized=false")
print("signing_authorized=false")
print("transaction_authorized=false")
print("funds_movement_authorized=false")

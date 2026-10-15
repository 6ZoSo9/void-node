#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import subprocess
import tempfile
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
RUNNER=ROOT/"tools/apollyon-live-custody-source-session-runner-v2.mjs"
LAUNCHER=ROOT/"ops/xiphos/apollyon_live_custody_source_session_launcher_v2.py"
PREENTRY=ROOT/"ops/xiphos/apollyon_live_custody_source_session_preentry_v2.c"

def git_blob(path:Path)->str:
    data=path.read_bytes()
    h=hashlib.sha1()
    h.update(f"blob {len(data)}\0".encode("ascii"))
    h.update(data)
    return h.hexdigest()

expected={
    "tools/apollyon-live-custody-source-session-runner-v2.mjs":
        "420b922a1fa79c28841576357dcbf94f77855205",
    "ops/xiphos/apollyon_installed_training_bus_isolation_qualification_v1.py":
        "0f9263ddfb2bc6974e77c2d4eb0f1ee93fed52e7",
    "ops/xiphos/apollyon_designated_host_custody_evidence_readonly_v2.py":
        "c7c63106511ee285f8f1cf79b97d32afe0424c65",
    "tools/apollyon-candidate-training-preclaim-v2.mjs":
        "9db6154ba2b6c539ad6462e008024d52f7356d5c",
    "tools/apollyon-v2-raw-collector-adapter-v1.mjs":
        "b9edc663ff51d863af5c5fe052bdf8a6c90b6da3",
    "tools/apollyon-candidate-training-attempt-claim-contract-v2.mjs":
        "722558eca8055cd3b4dd495887e849d7eeb1530c",
    "tools/apollyon-live-custody-service-source-session-binding-v2.mjs":
        "c64983ed20c12ff797b250b65581de54919363d3",
    "tools/apollyon-authorization-custody-launcher-v2.mjs":
        "d23ff045d8c355401fed499c6bcffd503ba4c7fd",
    "tools/apollyon-designated-host-custody-live-qualification-v2.mjs":
        "a46cae54131bd25c25f2efb2d67c24b57a872a7e",
    "tools/apollyon-custody-host-policy-qualification-v2.mjs":
        "db5493a513a42780865e7194580eec3b770dc8e1",
    "tools/apollyon-custody-host-policy-qualification-v1.mjs":
        "6f34e79d94c502e31ca4923fd78922d4875550a5",
    "tools/apollyon-authorization-custody-client-v1.mjs":
        "fb31dbbda76c94f0ad08e38094c151a24a78b486",
    "tools/apollyon-authorization-custody-service-v1.mjs":
        "8961572ba5834371b1229f790a1960940fc74935",
    "tools/apollyon-authorization-custody-core-v1.mjs":
        "f9f18db5bbfeea466202ef0d7babe08c3c401d66",
    "scripts/apollyon_operator_authorization_packet_v1.mjs":
        "c224ebc4fcb332b70e83900a8e086e0257f31670",
    "tools/apollyon-candidate-training-attempt-claim-contract-v1.mjs":
        "f97fafb0148527ae3a954e2752faef8c7fc9e88e",
}
for relative,digest in expected.items():
    assert git_blob(ROOT/relative)==digest, relative

runner=RUNNER.read_text(encoding="utf-8")
for required in (
    "prepareApollyonReviewedExecutionTreeV2",
    "runApollyonV2RawCollectorAdapterV1",
    "composeApollyonCandidateTrainingPreclaimV2",
    "qualifyApollyonCandidateTrainingAttemptClaimContractV2",
    "finalizeApollyonLiveCustodyServiceSourceSessionBindingV2",
    "client.assertConsumed(config.authorization_id",
    'runSystemctl(["start",TRAINING_UNIT])',
    'runSystemctl(["stop",TRAINING_UNIT],false)',
    "custody_service_action_performed:false",
    "durable_attempt_claim_performed:false",
    "training_execution_performed:false",
):
    assert required in runner, required

for forbidden in (
    "attempt_claimed:true",
    "training_execution_performed:true",
    "candidate_weight_mutation_performed:true",
    "createPrivateKey",
    "crypto.sign(",
    "eth_sendRawTransaction",
):
    assert forbidden not in runner, forbidden

subprocess.run(
    ["node","--check",str(RUNNER)],
    check=True,
)
runner_test=subprocess.run(
    ["node",str(RUNNER),"--self-test"],
    check=True,
    text=True,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
)
assert "VOID_APOLLYON_LIVE_CUSTODY_SOURCE_SESSION_RUNNER_V2_SELF_TEST=GREEN" in runner_test.stdout

subprocess.run(
    ["python3","-m","py_compile",str(LAUNCHER)],
    check=True,
)
launcher_test=subprocess.run(
    ["python3","-I","-B",str(LAUNCHER),"--self-test"],
    check=True,
    text=True,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
)
assert "VOID_APOLLYON_LIVE_CUSTODY_SOURCE_SESSION_LAUNCHER_V2_SELF_TEST=GREEN" in launcher_test.stdout

with tempfile.TemporaryDirectory(prefix="void-live-session-preentry-test-") as td:
    binary=Path(td)/"preentry"
    subprocess.run([
        "cc","-std=c11","-O2","-Wall","-Wextra","-Werror",
        "-D_FORTIFY_SOURCE=2","-fstack-protector-strong",
        "-Wl,-z,relro,-z,now","-Wl,--build-id=none",
        str(PREENTRY),"-o",str(binary),
    ],check=True)
    result=subprocess.run(
        [str(binary),"--self-test"],
        check=True,text=True,stdout=subprocess.PIPE,stderr=subprocess.PIPE,
    )
    assert "VOID_APOLLYON_LIVE_CUSTODY_SOURCE_SESSION_PREENTRY_V2_SELF_TEST=GREEN" in result.stdout

print("VOID_APOLLYON_LIVE_CUSTODY_SOURCE_SESSION_EXECUTION_CLOSURE_V2_PROOF_GREEN")
print("complete_reviewed_closure_bound=true")
print("native_preentry_source_green=true")
print("installed_launcher_source_green=true")
print("runner_source_green=true")
print("live_worktree_invocation_supported=false")
print("durable_attempt_claim=false")
print("training_execution=false")

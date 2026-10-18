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
        "8c2c92055ab05c074653cee971e095934b5cb85c",
    "ops/xiphos/apollyon_installed_training_bus_isolation_qualification_v1.py":
        "1fdb495aafa136119d50f41410b015930d9fc90d",
    "ops/xiphos/apollyon_designated_host_custody_evidence_readonly_v2.py":
        "2a285b5b1da2597a8b9eae6d08cd42d010bf7f71",
    "tools/apollyon-candidate-training-preclaim-v2.mjs":
        "d062fe9d8f70f731e157c8d9f835d3f936ac5d59",
    "tools/apollyon-v2-raw-collector-adapter-v1.mjs":
        "1cce303c25317b66e5f264f1b3f8c05712879cfe",
    "tools/apollyon-candidate-training-attempt-claim-contract-v2.mjs":
        "fd671b3303946143d927473e4ed04e7cd5030bac",
    "tools/apollyon-live-custody-service-source-session-binding-v2.mjs":
        "5ee36c89275c29b008094ad030b8664ed9d7b60b",
    "tools/apollyon-authorization-custody-launcher-v2.mjs":
        "d23ff045d8c355401fed499c6bcffd503ba4c7fd",
    "tools/apollyon-designated-host-custody-live-qualification-v2.mjs":
        "435e23d26fa32405e36d5dad17b033ea4ec910e0",
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
assert 'NODE=Path("/opt/void-apollyon-node-runtime-v1/node")' in LAUNCHER.read_text(encoding="utf-8")
assert '"/opt/void-apollyon-live-custody-binding-v2-reviewed-v2"' in LAUNCHER.read_text(encoding="utf-8")
assert 'const NODE_BIN="/opt/void-apollyon-node-runtime-v1/node";' in RUNNER.read_text(encoding="utf-8")

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
    "trainingServiceExactlyDormant",
    "function waitTrainingServiceDormant(generation)",
    "return waitTrainingServiceDormant(generation);",
    "apollyon_live_runner_training_generation_still_present",
    "custody_loader_environment_seven_name_boundary=true",
    "trainingStartAttempted=true",
    "stopTrainingAndAttest(training)",
    "verifyTrainingStartBoundary();",
    "apollyon_live_runner_training_execstart_invalid",
    "apollyon_live_runner_unreviewed_dependency_entry",
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

stop_fn=runner.index("function stopTrainingAndAttest(generation)")
stop_call=runner.index('runSystemctl(["stop",TRAINING_UNIT],false)',stop_fn)
dormant_wait=runner.index("return waitTrainingServiceDormant(generation);",stop_call)
runner_finally=runner.index("}finally{",runner.index("export async function runApollyonLiveCustodySourceSessionRunnerV2"))
cleanup_call=runner.index("stopTrainingAndAttest(training);",runner_finally)
main_fn=runner.index("async function main()")
post_run_boundary=runner.index("verifyTrainingStartBoundary();",main_fn)
post_run_dormant=runner.index("requireTrainingServiceDormant(",post_run_boundary)
generation_absence=runner.index("processGenerationPresent(",post_run_dormant)
success_output=runner.index("process.stdout.write(canonical({",generation_absence)
assert stop_fn<stop_call<dormant_wait
assert runner_finally<cleanup_call
assert main_fn<post_run_boundary<post_run_dormant<generation_absence<success_output

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
assert "training_start_attempt_cleanup_required=true" in runner_test.stdout
assert "training_first_instruction_boundary_required=true" in runner_test.stdout
assert "training_effective_unit_path_bound=true" in runner_test.stdout
assert "training_service_exact_dormancy_required=true" in runner_test.stdout
assert "training_generation_absence_required=true" in runner_test.stdout
assert "custody_loader_environment_seven_name_boundary=true" in runner_test.stdout

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
print("training_stop_then_dormancy_order_bound=true")
print("final_success_requires_second_dormancy_and_generation_absence=true")
print("live_worktree_invocation_supported=false")
print("durable_attempt_claim=false")
print("training_execution=false")

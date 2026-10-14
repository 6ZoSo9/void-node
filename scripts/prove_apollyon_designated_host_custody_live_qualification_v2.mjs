#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const TOOL=path.join(
  ROOT,"tools/apollyon-designated-host-custody-live-qualification-v2.mjs",
);
const INSTALLED_LAUNCHER=path.join(
  ROOT,"ops/xiphos/apollyon_v2_installed_live_launcher_v1.py",
);
const NATIVE_PREENTRY=path.join(
  ROOT,"ops/xiphos/apollyon_v2_native_preentry_v1.c",
);
const NATIVE_PREENTRY_BLOB_SHA1=
  "7863007de9d55614305be4d01083c3f8e8bd7453";
const INSTALLED_LAUNCHER_BLOB_SHA1=
  "431b91aafcb36b4aa2d77ec05061dc98cf7ec668";
const REVIEWED=Object.freeze({
  "tools/apollyon-custody-host-policy-qualification-v1.mjs":
    "6f34e79d94c502e31ca4923fd78922d4875550a5",
  "tools/apollyon-custody-host-policy-qualification-v2.mjs":
    "db5493a513a42780865e7194580eec3b770dc8e1",
  "ops/xiphos/apollyon_designated_host_custody_evidence_readonly_v2.py":
    "cc194b7f239eea049c6ca7e5a536487634d800ab",
  "tools/apollyon-authorization-custody-core-v1.mjs":
    "f9f18db5bbfeea466202ef0d7babe08c3c401d66",
  "tools/apollyon-authorization-custody-service-v1.mjs":
    "8961572ba5834371b1229f790a1960940fc74935",
  "tools/apollyon-authorization-custody-client-v1.mjs":
    "fb31dbbda76c94f0ad08e38094c151a24a78b486",
});
const HISTORICAL=Object.freeze({
  "tools/apollyon-designated-host-custody-live-qualification-v1.mjs":
    "3dae4db82a9316eaa88f475cec41ddc05a441536",
  "scripts/prove_apollyon_designated_host_custody_live_qualification_v1.mjs":
    "f0c8aaf395d0f5d0a2495b4d25aefc5bdffd01f5",
  "docs/security/apollyon-designated-host-custody-live-qualification-v1.md":
    "ef772d91f74ea875b34c725bde2551d47dbd2adb",
});
function gitBlob(bytes){
  return crypto.createHash("sha1")
    .update(Buffer.from(`blob ${bytes.length}\0`,"ascii"))
    .update(bytes).digest("hex");
}
for(const [relative,expected] of Object.entries({...REVIEWED,...HISTORICAL})){
  assert.equal(gitBlob(fs.readFileSync(path.join(ROOT,relative))),expected,relative);
}
assert.equal(
  gitBlob(fs.readFileSync(INSTALLED_LAUNCHER)),
  INSTALLED_LAUNCHER_BLOB_SHA1,
  "installed launcher source blob",
);
assert.equal(
  gitBlob(fs.readFileSync(NATIVE_PREENTRY)),
  NATIVE_PREENTRY_BLOB_SHA1,
  "native pre-entry source blob",
);
const launcherSource=fs.readFileSync(INSTALLED_LAUNCHER,"utf8");
for(const required of [
  'FIXED_LAUNCHER=Path(',
  '"/opt/void-apollyon-custody-v2-preentry-v1/"',
  'INSTALLED_SOURCE_ROOT=Path("/opt/void-apollyon-custody-v2-reviewed-v1")',
  'RUNNER_REL="tools/apollyon-designated-host-custody-live-qualification-v2.mjs"',
  '"32447680186fb7a231f8e16bea2c220eb7f08fa7"',
  '"cc194b7f239eea049c6ca7e5a536487634d800ab"',
  '"db5493a513a42780865e7194580eec3b770dc8e1"',
  '"VOID_APOLLYON_V2_INSTALLED_LAUNCHER":MARKER',
  'modified_runner_rejected_before_node=true',
  'post_prepare_source_replacement_inert=true',
  'live_worktree_invocation_supported=false',
  'trusted_node_descriptor_execution=true',
  'writable_node_rejected=true',
  'materialization_failure_cleanup=true',
  'temporary_filesystem_cleanup_proven=false',
  'retained_private_tree_possible=true',
  'persistent_host_mutation=unknown',
  'def open_trusted_executable(',
  'f"/proc/self/fd/{node_fd}"',
  'pass_fds=(node_fd,)',
  'apollyon_v2_installed_launcher_node_untrusted',
  'apollyon_v2_installed_launcher_materialization_cleanup_failed',
  'NATIVE_PREENTRY_MARKER="VOID_APOLLYON_V2_NATIVE_PREENTRY_V1"',
  'VOID_APOLLYON_V2_NATIVE_PREENTRY',
  'apollyon_v2_installed_launcher_native_preentry_required',
  'apollyon_v2_installed_launcher_post_execution_cleanup_failed:',
  'post_execution_cleanup_failure_classified=true',
  'cleanup_failure_retained_path_reported=true',
]){
  assert.equal(launcherSource.includes(required),true,"launcher missing "+required);
}
const source=fs.readFileSync(TOOL,"utf8");
for(const required of [
  "host_observation_read_only:true",
  "private_temporary_filesystem_write:true",
  "repository_source_write:false",
  "persistent_host_mutation:false",
  "installed_preentry_launcher_required:true",
  "direct_worktree_privileged_invocation_supported:false",
  "two_live_observations_required:true",
  "same_boot_required:true",
  "increasing_boottime_generation_required:true",
  "stable_host_projection_required:true",
  "socket_parent_namespace_v2_required:true",
  "source_policy_v2_qualification_required:true",
  "live_service_source_identity_required:true",
  "live_service_source_identity_proven:false",
  "same_live_custody_session_binding_proven:false",
  "independent_custody_proven:false",
  "custody_production_gate_ready:false",
  "COLLECTOR_BLOB_SHA1=\"cc194b7f239eea049c6ca7e5a536487634d800ab\"",
  "POLICY_V1_BLOB_SHA1=\"6f34e79d94c502e31ca4923fd78922d4875550a5\"",
  "POLICY_BLOB_SHA1=\"db5493a513a42780865e7194580eec3b770dc8e1\"",
  "prepareApollyonReviewedExecutionTreeV2",
  "VOID_APOLLYON_V2_INSTALLED_LAUNCHER_V1",
  "apollyon_live_qualification_v2_installed_preentry_launcher_required",
  "loadApollyonReviewedPolicyV2",
  "runApollyonReviewedCollectorSelfTestV2",
  '"--training-pid"',
  '"/proc/self/fd/3"',
  '"/usr/bin/python3"',
  'openTrustedPythonInterpreter',
  'spawnSync("/proc/self/fd/4"',
  'stdio:["ignore","pipe","pipe",collectorFd,python.fd]',
  'apollyon_live_qualification_v2_python_interpreter_untrusted',
  'apollyon_live_qualification_v2_cleanup_failed:',
  'temporary_filesystem_cleanup_proven=false',
  'retained_private_tree_possible=true',
  'persistent_host_mutation=unknown',
  'next_gate:"live_custody_service_source_identity_binding_v2"',
  "attempt_claim:false",
  "training_execution:false",
]) assert.equal(source.includes(required),true,required);
for(const forbidden of [
  'from "./apollyon-custody-host-policy-qualification-v2.mjs"',
  "appendFileSync(", "chownSync(",
  "systemctl start", "systemctl stop", "systemctl restart",
  "createPrivateKey", "crypto.sign(", "Wallet(", "signTransaction(",
  "eth_sendRawTransaction", "fetch(",
  "custody_production_gate_ready:true",
  "live_service_source_identity_proven:true",
  "attempt_claimed:true", "training_execution_performed:true",
]) assert.equal(source.includes(forbidden),false,forbidden);

const nativeSource=fs.readFileSync(NATIVE_PREENTRY,"utf8");
for(const required of [
  '#define MARKER "VOID_APOLLYON_V2_NATIVE_PREENTRY_V1"',
  '#define FIXED_SELF "/opt/void-apollyon-custody-v2-preentry-v1/apollyon_v2_native_preentry_v1"',
  '#define FIXED_PYTHON "/usr/bin/python3"',
  '#define FIXED_LAUNCHER "/opt/void-apollyon-custody-v2-preentry-v1/apollyon_v2_installed_live_launcher_v1.py"',
  'require_self_identity();',
  'open_trusted_python()',
  'O_RDONLY | O_NOFOLLOW',
  'fexecve(python_fd, next_argv, envp);',
  'VOID_APOLLYON_V2_NATIVE_PREENTRY=VOID_APOLLYON_V2_NATIVE_PREENTRY_V1',
  'setuid_binary=false',
  'setuid_setgid_rejected=true',
  '(S_ISUID | S_ISGID)',
]){
  assert.equal(nativeSource.includes(required),true,"native pre-entry missing "+required);
}
for(const forbidden of [
  'setuid(', 'seteuid(', 'setresuid(', 'chmod(', 'chown(',
  'system(', 'popen(', 'execvp(', 'execlp(', '/bin/sh',
]){
  assert.equal(nativeSource.includes(forbidden),false,"native pre-entry forbidden "+forbidden);
}

const module=await import(pathToFileURL(TOOL).href+"?proof="+Date.now());
const synthetic=fs.mkdtempSync(
  path.join(os.tmpdir(),"void-apollyon-v2-reviewed-adversary-"),
);
const copyReviewed=()=>{
  for(const relative of Object.keys(REVIEWED)){
    const target=path.join(synthetic,...relative.split("/"));
    fs.mkdirSync(path.dirname(target),{recursive:true});
    fs.writeFileSync(target,fs.readFileSync(path.join(ROOT,relative)));
  }
};
const policyMarker=path.join(synthetic,"policy-sentinel");
const collectorMarker=path.join(synthetic,"collector-sentinel");
try{
  copyReviewed();

  // A malicious policy present before preparation is rejected as bytes and is
  // never imported/executed.
  const policyV2=path.join(
    synthetic,"tools/apollyon-custody-host-policy-qualification-v2.mjs",
  );
  fs.writeFileSync(
    policyV2,
    `import fs from "node:fs";fs.writeFileSync(${JSON.stringify(policyMarker)},"ran");\n`,
  );
  assert.throws(
    ()=>module.prepareApollyonReviewedExecutionTreeV2(synthetic),
    /reviewed_source_blob_mismatch/u,
  );
  assert.equal(fs.existsSync(policyMarker),false);

  copyReviewed();
  const prepared=module.prepareApollyonReviewedExecutionTreeV2(synthetic);
  try{
    // After exact bytes have been copied into the private tree, replacing the
    // original V1/V2 policy and collector cannot redirect execution.
    fs.writeFileSync(
      path.join(synthetic,"tools/apollyon-custody-host-policy-qualification-v1.mjs"),
      `import fs from "node:fs";fs.writeFileSync(${JSON.stringify(policyMarker)},"v1");\n`,
    );
    fs.writeFileSync(
      policyV2,
      `import fs from "node:fs";fs.writeFileSync(${JSON.stringify(policyMarker)},"v2");\n`,
    );
    fs.writeFileSync(
      path.join(
        synthetic,
        "ops/xiphos/apollyon_designated_host_custody_evidence_readonly_v2.py",
      ),
      `from pathlib import Path\nPath(${JSON.stringify(collectorMarker)}).write_text("ran")\n`,
    );

    const qualifier=await module.loadApollyonReviewedPolicyV2(prepared);
    assert.equal(typeof qualifier,"function");
    const collector=module.runApollyonReviewedCollectorSelfTestV2(prepared);
    assert.equal(collector.error,undefined);
    assert.equal(collector.signal,null);
    assert.equal(collector.status,0);
    assert.match(
      String(collector.stdout||""),
      /VOID_APOLLYON_DESIGNATED_HOST_CUSTODY_EVIDENCE_READONLY_V2_SELF_TEST=GREEN/u,
    );
    assert.equal(fs.existsSync(policyMarker),false);
    assert.equal(fs.existsSync(collectorMarker),false);
  }finally{
    module.cleanupApollyonReviewedExecutionTreeV2(prepared);
  }
}finally{
  fs.rmSync(synthetic,{recursive:true,force:true});
}

console.log(
  "VOID_APOLLYON_DESIGNATED_HOST_CUSTODY_LIVE_QUALIFICATION_V2_PROOF_GREEN",
);
console.log("historical_v1_live_qualification_unchanged=true");
console.log("exact_v2_policy_blob=true");
console.log("exact_v2_collector_blob=true");
console.log("private_reviewed_execution_tree=true");
console.log("native_pre_python_entry_required=true");
console.log("native_preentry_source_blob=7863007de9d55614305be4d01083c3f8e8bd7453");
console.log("installed_preentry_launcher_required=true");
console.log("direct_worktree_privileged_invocation_supported=false");
console.log("modified_runner_rejected_before_node=true");
console.log("policy_preimport_replacement_rejected=true");
console.log("postprepare_policy_replacement_inert=true");
console.log("postprepare_collector_replacement_inert=true");
console.log("collector_descriptor_execution=true");
console.log("runner_cleanup_failure_persistence_unknown=true");
console.log("launcher_cleanup_failure_persistence_unknown=true");
console.log("two_live_observations_required=true");
console.log("socket_parent_namespace_v2_required=true");
console.log("live_host_qualification_performed_capability=true");
console.log("live_service_source_identity_proven=false");
console.log("custody_production_gate_ready=false");
console.log("attempt_claimed=false");
console.log("training_execution=false");

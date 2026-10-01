#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

const files={
  crossbox:fs.readFileSync(
    "ops/mainnet/mainnet0-crossbox-status-smoke.sh",
    "utf8",
  ),
  prelaunch:fs.readFileSync(
    "ops/mainnet/mainnet0-prelaunch-safety-proof.sh",
    "utf8",
  ),
  validator:fs.readFileSync(
    "ops/mainnet/mainnet0-validator-live-admission-final-preflight-proof.sh",
    "utf8",
  ),
  statusRunbook:fs.readFileSync(
    "ops/mainnet/mainnet0-status-runbook.md",
    "utf8",
  ),
  prelaunchRunbook:fs.readFileSync(
    "ops/mainnet/mainnet0-prelaunch-safety-runbook.md",
    "utf8",
  ),
  makefile:fs.readFileSync("Makefile","utf8"),
  launchApprovalTemplate:fs.readFileSync(
    "ops/mainnet/mainnet0-launch-approval-artifact.template.md",
    "utf8",
  ),
  finalPath:fs.readFileSync(
    "ops/mainnet/mainnet0-final-path.current.md",
    "utf8",
  ),
  authorityFunding:fs.readFileSync(
    "ops/mainnet/mainnet0-authority-funding-preflight.current.md",
    "utf8",
  ),
  keyCeremonyRunbook:fs.readFileSync(
    "ops/mainnet/mainnet0-key-ceremony-result-runbook.template.md",
    "utf8",
  ),
  finalGonogo:fs.readFileSync(
    "ops/mainnet/mainnet0-final-gonogo-map.current.md",
    "utf8",
  ),
  launchApprovalPrep:fs.readFileSync(
    "ops/mainnet/mainnet0-launch-approval-artifact-prep.current.md",
    "utf8",
  ),
  blockers:fs.readFileSync(
    "ops/mainnet/mainnet0-blockers.current.md",
    "utf8",
  ),
  workflow:fs.readFileSync(
    ".github/workflows/void-mainnet0-crossbox-peer-safety-v1.yml",
    "utf8",
  ),
};

const retiredIp="100.122.79.39";
const launchTruthPaths=[
  "ops/mainnet/mainnet0-launch-approval-artifact.template.md",
  "ops/mainnet/mainnet0-final-path.current.md",
  "ops/mainnet/mainnet0-authority-funding-preflight.current.md",
  "ops/mainnet/mainnet0-key-ceremony-result-runbook.template.md",
  "ops/mainnet/mainnet0-final-gonogo-map.current.md",
  "ops/mainnet/mainnet0-launch-approval-artifact-prep.current.md",
  "ops/mainnet/mainnet0-blockers.current.md",
];
const prStart=files.workflow.indexOf("  pull_request:\n");
const pushStart=files.workflow.indexOf("  push:\n");
const permissionsStart=files.workflow.indexOf("\npermissions:\n");
assert.ok(prStart>=0&&pushStart>prStart&&permissionsStart>pushStart);
const prBlock=files.workflow.slice(prStart,pushStart);
const pushBlock=files.workflow.slice(pushStart,permissionsStart);
for(const path of launchTruthPaths) {
  const token='- "'+path+'"';
  assert.equal(prBlock.split(token).length-1,1,"pull_request trigger mismatch: "+path);
  assert.equal(pushBlock.split(token).length-1,1,"push trigger mismatch: "+path);
}

const explicitEnv="VOID_MAINNET0_CROSSBOX_PEER";
const guardedInvocation=
  'VOID_MAINNET0_CROSSBOX_PEER="$CROSSBOX_PEER" make mainnet0-crossbox-status-smoke';

for(const [name,source] of Object.entries({
  crossbox:files.crossbox,
  prelaunch:files.prelaunch,
  validator:files.validator,
})) {
  assert.doesNotMatch(source,/\bALIEN=/u,name);
  assert.doesNotMatch(source,/local status smoke fallback/iu,name);
  assert.match(source,new RegExp(explicitEnv),name);
}

for(const [name,source] of Object.entries({
  prelaunch:files.prelaunch,
  validator:files.validator,
})) {
  assert.doesNotMatch(source,new RegExp(retiredIp.replaceAll(".","\\.")),name);
}

assert.equal(
  (files.crossbox.match(/100\.122\.79\.39/gu)??[]).length,
  1,
);
assert.match(
  files.crossbox,
  /\*alienware\*\|\*100\.122\.79\.39\*\)\n\s+fail "crossbox_peer_retired"/u,
);

assert.match(files.crossbox,/crossbox_peer_required/u);
assert.match(files.crossbox,/crossbox_peer_retired/u);
assert.match(files.crossbox,/crossbox_peer_loopback_forbidden/u);
assert.match(files.crossbox,/crossbox_peer_local_host_forbidden/u);
assert.match(files.crossbox,/crossbox_remote_resolved_to_local_host/u);
assert.match(files.crossbox,/crossbox_local_repo_dirty/u);
assert.match(files.crossbox,/crossbox_head_mismatch/u);
assert.match(files.crossbox,/exact_head_match=true/u);
assert.match(files.crossbox,/distinct_remote_host_verified=true/u);
assert.match(files.crossbox,/local_fallback_allowed=false/u);
assert.match(
  files.crossbox,
  /ssh -o BatchMode=yes -o ConnectTimeout=6 "\$CROSSBOX_PEER"/u,
);
assert.doesNotMatch(
  files.crossbox,
  /VOID_MAINNET0_CROSSBOX_PEER:-[^}]+/u,
);

for(const [name,source] of Object.entries({
  prelaunch:files.prelaunch,
  validator:files.validator,
})) {
  assert.match(source,/crossbox_peer_required/u,name);
  assert.match(source,/local_fallback_allowed=false/u,name);
  assert.ok(source.includes(guardedInvocation),name);
}

assert.ok(
  files.validator.includes(
    'VOID_MAINNET0_CROSSBOX_PEER="$CROSSBOX_PEER" make mainnet0-prelaunch-safety-proof',
  ),
);
assert.match(
  files.statusRunbook,
  /VOID_MAINNET0_CROSSBOX_PEER=<ssh-alias-or-user@host> make mainnet0-crossbox-status-smoke/u,
);
assert.match(files.statusRunbook,/There is intentionally no default peer/u);
assert.match(
  files.statusRunbook,
  /A local smoke must never substitute for required cross-box evidence/u,
);
assert.doesNotMatch(files.statusRunbook,/Precision and Alienware together/u);

assert.match(
  files.prelaunchRunbook,
  /VOID_MAINNET0_CROSSBOX_PEER=<ssh-alias-or-user@host> make mainnet0-prelaunch-safety-proof/u,
);
assert.match(
  files.prelaunchRunbook,
  /A missing or unreachable peer is a hard prelaunch failure/u,
);
assert.doesNotMatch(
  files.prelaunchRunbook,
  /only requires Alienware to pass status smoke/u,
);

assert.match(
  files.makefile,
  /mainnet0-crossbox-status-smoke:\n\tbash ops\/mainnet\/mainnet0-crossbox-status-smoke\.sh/u,
);

const launchTruthDocs={
  launchApprovalTemplate:files.launchApprovalTemplate,
  finalPath:files.finalPath,
  authorityFunding:files.authorityFunding,
  keyCeremonyRunbook:files.keyCeremonyRunbook,
  finalGonogo:files.finalGonogo,
  launchApprovalPrep:files.launchApprovalPrep,
  blockers:files.blockers,
};

for(const [name,source] of Object.entries(launchTruthDocs)) {
  assert.match(source,/VOID_MAINNET0_CROSSBOX_PEER/u,name);
  for(const forbidden of [
    /Precision and Alienware/iu,
    /Alienware node readiness/iu,
    /Alienware readiness result/iu,
    /passes on Alienware/iu,
    /alienware_ready_result/iu,
    /alienware_status_smoke_log/iu,
  ]) {
    assert.doesNotMatch(source,forbidden,name);
  }
}

assert.match(files.launchApprovalTemplate,/crossbox_peer_target: REQUIRED/u);
assert.match(files.launchApprovalTemplate,/crossbox_peer_head_result: REQUIRED/u);
assert.match(files.launchApprovalTemplate,/crossbox_peer_ready_result: REQUIRED/u);
assert.match(files.launchApprovalTemplate,/crossbox_peer_status_smoke_log: REQUIRED/u);
assert.match(files.launchApprovalTemplate,/retired Alienware identity must be rejected/u);

assert.match(
  files.finalPath,
  /Historical retired second-host checkpoint: ready=true, gap=0, txroot_live=1/u,
);
assert.match(
  files.finalGonogo,
  /Historical retired second-host readiness checkpoint is recorded/u,
);
assert.match(
  files.blockers,
  /Historical retired second-host readiness checkpoint is recorded/u,
);
assert.match(
  files.authorityFunding,
  /present-tense use requires fresh Precision readiness/u,
);
assert.match(
  files.keyCeremonyRunbook,
  /explicitly reviewed nonlocal current-fleet peer/u,
);
assert.match(
  files.launchApprovalPrep,
  /explicit reviewed cross-box peer target and readiness result/u,
);

console.log("VOID_MAINNET0_CROSSBOX_PEER_SAFETY_V1_GREEN");
console.log("explicit_crossbox_peer_required=true");
console.log("retired_alienware_default_removed=true");
console.log("retired_alienware_identity_rejected=true");
console.log("launch_truth_retired_host_requirements_removed=true");
console.log("launch_truth_workflow_trigger_symmetry=true");
console.log("loopback_and_local_peer_rejected=true");
console.log("distinct_remote_host_required=true");
console.log("local_and_remote_repo_clean_required=true");
console.log("exact_git_head_match_required=true");
console.log("crossbox_ssh_failure_fails_closed=true");
console.log("local_smoke_fallback_for_crossbox_forbidden=true");
console.log("network_execution=false");
console.log("runtime_mutation=false");
console.log("validator_mutation=false");
console.log("funds_movement=false");

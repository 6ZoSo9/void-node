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
};

const retiredIp="100.122.79.39";
const explicitEnv="VOID_MAINNET0_CROSSBOX_PEER";
const guardedInvocation=
  'VOID_MAINNET0_CROSSBOX_PEER="$CROSSBOX_PEER" make mainnet0-crossbox-status-smoke';

for(const [name,source] of Object.entries({
  crossbox:files.crossbox,
  prelaunch:files.prelaunch,
  validator:files.validator,
})) {
  assert.doesNotMatch(source,new RegExp(retiredIp.replaceAll(".","\\.")),name);
  assert.doesNotMatch(source,/\bALIEN=/u,name);
  assert.doesNotMatch(source,/local status smoke fallback/iu,name);
  assert.match(source,new RegExp(explicitEnv),name);
}

assert.match(files.crossbox,/crossbox_peer_required/u);
assert.match(files.crossbox,/crossbox_peer_retired/u);
assert.match(files.crossbox,/crossbox_peer_loopback_forbidden/u);
assert.match(files.crossbox,/crossbox_peer_local_host_forbidden/u);
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

console.log("VOID_MAINNET0_CROSSBOX_PEER_SAFETY_V1_GREEN");
console.log("explicit_crossbox_peer_required=true");
console.log("retired_alienware_default_removed=true");
console.log("retired_alienware_identity_rejected=true");
console.log("loopback_and_local_peer_rejected=true");
console.log("crossbox_ssh_failure_fails_closed=true");
console.log("local_smoke_fallback_for_crossbox_forbidden=true");
console.log("network_execution=false");
console.log("runtime_mutation=false");
console.log("validator_mutation=false");
console.log("funds_movement=false");

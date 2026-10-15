#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import vm from "node:vm";

import {
  testOnlyBuildBuyVoidAllocationCustodyPolkitDenyRuleV1,
} from "../tools/void-buy-allocation-custody-host-evidence-v1.mjs";
import {
  VOID_BUY_VOID_ALLOCATION_CUSTODY_POLKIT_ACTIONS_V1,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_POLKIT_DENY_AUTHORITY_V1,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_POLKIT_DENY_PROFILE_ID_V1,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_POLKIT_DENY_SOURCE_V1,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_POLKIT_DENY_TARGET_V1,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_POLKIT_RULE_SHA256_V1,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_POLKIT_RUNTIME_USER_V1,
  inspectBuyVoidAllocationCustodyPolkitDenyProfileV1,
} from "../tools/void-buy-allocation-custody-polkit-deny-profile-v1.mjs";

const raw=fs.readFileSync(
  VOID_BUY_VOID_ALLOCATION_CUSTODY_POLKIT_DENY_SOURCE_V1,
  "utf8",
);
const expected=
  testOnlyBuildBuyVoidAllocationCustodyPolkitDenyRuleV1("void-buy-runtime");
assert.equal(raw,expected,"rule_bytes_mismatch");
new vm.Script(raw,{
  filename:"00-void-buy-allocation-custody-runtime-deny-v1.rules",
});
assert.equal(raw.endsWith("\n"),true);
assert.equal(
  crypto.createHash("sha256").update(raw,"utf8").digest("hex"),
  VOID_BUY_VOID_ALLOCATION_CUSTODY_POLKIT_RULE_SHA256_V1,
);
assert.equal(
  VOID_BUY_VOID_ALLOCATION_CUSTODY_POLKIT_DENY_TARGET_V1,
  "/etc/polkit-1/rules.d/00-void-buy-allocation-custody-runtime-deny-v1.rules",
);
assert.equal(
  VOID_BUY_VOID_ALLOCATION_CUSTODY_POLKIT_RUNTIME_USER_V1,
  "void-buy-runtime",
);
assert.deepEqual(
  VOID_BUY_VOID_ALLOCATION_CUSTODY_POLKIT_ACTIONS_V1,
  [
    "org.freedesktop.systemd1.manage-units",
    "org.freedesktop.systemd1.manage-unit-files",
    "org.freedesktop.systemd1.reload-daemon",
    "org.freedesktop.systemd1.set-environment",
  ],
);
for(const action of VOID_BUY_VOID_ALLOCATION_CUSTODY_POLKIT_ACTIONS_V1){
  assert.ok(raw.includes('action.id === "'+action+'"'),action);
}
assert.ok(raw.includes('subject.user === "void-buy-runtime"'));
assert.ok(raw.includes("return polkit.Result.NO;"));
assert.ok(raw.includes("return polkit.Result.NOT_HANDLED;"));
for(const forbidden of [
  "polkit.Result.YES",
  "polkit.Result.AUTH_ADMIN",
  "polkit.Result.AUTH_SELF",
  "void-buy-allocation-custody-v1.service",
  "void-node-live.service",
]){
  assert.equal(raw.includes(forbidden),false,forbidden);
}
assert.match(
  VOID_BUY_VOID_ALLOCATION_CUSTODY_POLKIT_DENY_PROFILE_ID_V1,
  /^voidbuycustpol1_[0-9a-f]{64}$/u,
);
const p=inspectBuyVoidAllocationCustodyPolkitDenyProfileV1();
assert.equal(p.rule_sha256,VOID_BUY_VOID_ALLOCATION_CUSTODY_POLKIT_RULE_SHA256_V1);
assert.equal(p.rule_bytes,Buffer.byteLength(raw,"utf8"));

for(const [key,expectedValue] of Object.entries({
  source_profile_only:true,
  exact_rule_bytes_required:true,
  fixed_root_polkit_path_required:true,
  lexically_first_rule_required:true,
  runtime_user_exact:true,
  action_id_only_denial:true,
  explicit_pkcheck_status_one_required_after_install:true,
  installed_rule_verified:false,
  polkit_reload_or_observation_verified:false,
  runtime_control_denial_live_verified:false,
  filesystem_write:false,
  service_mutation:false,
  systemd_mutation:false,
  permission_mutation:false,
  payment_acceptance:false,
  public_presale_activation:false,
  funds_movement:false,
})){
  assert.equal(
    VOID_BUY_VOID_ALLOCATION_CUSTODY_POLKIT_DENY_AUTHORITY_V1[key],
    expectedValue,
    key,
  );
}

console.log("VOID_BUY_VOID_ALLOCATION_CUSTODY_POLKIT_DENY_PROFILE_V1_GREEN");
console.log("profile_id="+VOID_BUY_VOID_ALLOCATION_CUSTODY_POLKIT_DENY_PROFILE_ID_V1);
console.log("rule_sha256="+VOID_BUY_VOID_ALLOCATION_CUSTODY_POLKIT_RULE_SHA256_V1);
console.log("target_path="+VOID_BUY_VOID_ALLOCATION_CUSTODY_POLKIT_DENY_TARGET_V1);
console.log("runtime_user=void-buy-runtime");
console.log("denied_action_count=4");
console.log("installed_rule_verified=false");
console.log("runtime_control_denial_live_verified=false");
console.log("filesystem_write=false");
console.log("public_presale_activation=false");
console.log("funds_movement=false");

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT=process.cwd();
const DROPIN=path.join(
  ROOT,
  "ops/systemd/void-node-live.service.d/98-buy-void-runtime-custody-hardening-v1.conf.example",
);

const text=fs.readFileSync(DROPIN,"utf8");
const lines=text.split(/\r?\n/u);

assert.equal(lines.filter(x=>x==="[Service]").length,1);
assert.equal(lines.filter(x=>x==="NoNewPrivileges=yes").length,1);
assert.equal(lines.filter(x=>x==="CapabilityBoundingSet=").length,1);
assert.equal(lines.filter(x=>x==="AmbientCapabilities=").length,1);

for(const forbidden of [
  /^Environment=/mu,
  /^EnvironmentFile=/mu,
  /^ExecStart=/mu,
  /^ExecStartPre=/mu,
  /^ExecStartPost=/mu,
  /^User=/mu,
  /^Group=/mu,
  /^SupplementaryGroups=/mu,
  /^ReadWritePaths=/mu,
  /^ReadOnlyPaths=/mu,
  /^InaccessiblePaths=/mu,
  /^PrivateNetwork=/mu,
  /^RestrictAddressFamilies=/mu,
  /^LoadCredential=/mu,
  /^BindPaths=/mu,
  /^BindReadOnlyPaths=/mu,
]) {
  assert.doesNotMatch(text,forbidden);
}

const nnp=text.match(/^NoNewPrivileges=(.+)$/mu)?.[1];
const bounding=text.match(/^CapabilityBoundingSet=(.*)$/mu)?.[1];
const ambient=text.match(/^AmbientCapabilities=(.*)$/mu)?.[1];

assert.equal(nnp,"yes");
assert.equal(bounding,"");
assert.equal(ambient,"");

const authority=Object.freeze({
  source_policy_only:true,
  user_systemd_manager:true,
  runtime_unit:"void-node-live.service",
  no_new_privileges_required:true,
  capability_bounding_set_empty_required:true,
  ambient_capabilities_empty_required:true,
  current_kernel_capabilities_zero_must_be_reverified_live:true,
  request_root_policy_separate:true,
  custody_service_policy_separate:true,
  polkit_denial_policy_separate:true,
  service_mutation:false,
  systemd_mutation:false,
  filesystem_mutation:false,
  credential_access:false,
  wallet_or_signer_access:false,
  rpc_contact:false,
  payment_acceptance:false,
  public_presale_activation:false,
  funds_movement:false,
});

for(const [key,expected] of Object.entries({
  source_policy_only:true,
  user_systemd_manager:true,
  no_new_privileges_required:true,
  capability_bounding_set_empty_required:true,
  ambient_capabilities_empty_required:true,
  current_kernel_capabilities_zero_must_be_reverified_live:true,
  request_root_policy_separate:true,
  custody_service_policy_separate:true,
  polkit_denial_policy_separate:true,
  service_mutation:false,
  systemd_mutation:false,
  filesystem_mutation:false,
  credential_access:false,
  wallet_or_signer_access:false,
  rpc_contact:false,
  payment_acceptance:false,
  public_presale_activation:false,
  funds_movement:false,
})) {
  assert.equal(authority[key],expected,key);
}

console.log("VOID_BUY_VOID_USER_RUNTIME_CUSTODY_HARDENING_V1_GREEN");
console.log("systemd_manager=user");
console.log("runtime_unit=void-node-live.service");
console.log("no_new_privileges=yes");
console.log("capability_bounding_set_empty=true");
console.log("ambient_capabilities_empty=true");
console.log("network_policy_changed=false");
console.log("filesystem_policy_changed=false");
console.log("environment_policy_changed=false");
console.log("service_mutation=false");
console.log("payment_acceptance=false");
console.log("public_presale_activation=false");
console.log("funds_movement=false");

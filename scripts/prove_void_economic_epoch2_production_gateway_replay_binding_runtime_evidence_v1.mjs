#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  VOID_ECONOMIC_EPOCH2_INACTIVE_PUBLIC_SUBMISSION_GATEWAY_RUNTIME_V1,
  VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_REPLAY_BINDING_RUNTIME_EVIDENCE_V1,
  buildVoidEconomicEpoch2ProductionGatewayReplayBindingRuntimeEvidenceV1,
} from "../tools/void-economic-epoch2-production-gateway-replay-binding-runtime-evidence-v1.mjs";
import {
  VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_REPLAY_BINDING_V1,
} from "../tools/void-economic-epoch2-production-gateway-replay-binding-v1.mjs";
import {
  VOID_ECONOMIC_EPOCH2_DURABLE_REPLAY_STORE_V1,
} from "../tools/void-economic-epoch2-durable-replay-store-v1.mjs";

const sourcePolicy=JSON.parse(fs.readFileSync(
  "ops/mainnet0/economic-epoch2-production-gateway-replay-binding-runtime-evidence-contract-v1.json",
  "utf8",
));
assert.equal(
  sourcePolicy.marker,
  "VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_REPLAY_BINDING_RUNTIME_EVIDENCE_CONTRACT_V1",
);
assert.equal(
  sourcePolicy.status,
  "SOURCE_RUNTIME_EVIDENCE_CONTRACT_GREEN_PRECISION_DEPLOYMENT_HOLD",
);
assert.equal(sourcePolicy.production_host.machine_role,"precision");
assert.equal(
  sourcePolicy.production_host.hostname,
  "zoso-Precision-Tower-7810",
);
assert.equal(
  sourcePolicy.production_host.service_identity,
  "void-economic-epoch2-public-submission-gateway-v1.service",
);
assert.equal(
  sourcePolicy.custody.same_uid_service_operator_and_replay_root_required,
  true,
);
assert.equal(sourcePolicy.custody.af_unix_only_service_required,true);
assert.equal(sourcePolicy.custody.no_network_listener_required,true);
assert.equal(
  sourcePolicy.custody.bounded_canary_replay_store_mutation_required,
  true,
);
assert.equal(
  sourcePolicy.custody.production_store_mutation_scope,
  "single_synthetic_digest_marker",
);
assert.equal(sourcePolicy.gates.runtime_evidence_contract_source_proven,true);
assert.equal(
  sourcePolicy.gates.production_gateway_replay_store_binding_verified,
  false,
);
assert.equal(sourcePolicy.gates.runtime_route_active,false);
assert.equal(sourcePolicy.gates.public_submission_open,false);
assert.equal(sourcePolicy.gates.cross_epoch_replay_protection_proven,false);
assert.equal(sourcePolicy.authority.service_installation_authorized,false);
assert.equal(sourcePolicy.authority.service_start_authorized,false);
assert.equal(
  sourcePolicy.authority.bounded_canary_replay_store_mutation_authorized,
  false,
);
assert.equal(sourcePolicy.authority.rpc_call,false);
assert.equal(sourcePolicy.authority.authoritative_chain2050_write,false);
assert.equal(sourcePolicy.authority.funds_movement,false);

const homeDir="/home/zoso";
const hostName="zoso-Precision-Tower-7810";
const stateDir=path.join(
  homeDir,
  ".local",
  "state",
  "void-economic-epoch2-public-submission-gateway-v1",
);
const facts={
  marker:"VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_REPLAY_BINDING_RUNTIME_FACTS_V1",
  version:1,
  hostname:hostName,
  service_identity:"void-economic-epoch2-public-submission-gateway-v1.service",
  service_active:true,
  service_main_pid:4242,
  service_uid:1000,
  operator_uid:1000,
  node_exec_path:"/usr/bin/node",
  unit_file_path:path.join(
    homeDir,
    ".config",
    "systemd",
    "user",
    "void-economic-epoch2-public-submission-gateway-v1.service",
  ),
  unit_file_sha256:"1".repeat(64),
  status_file_path:path.join(stateDir,"status-v1.json"),
  status_file_sha256:"2".repeat(64),
  runtime_marker:
    VOID_ECONOMIC_EPOCH2_INACTIVE_PUBLIC_SUBMISSION_GATEWAY_RUNTIME_V1,
  gateway_binding_marker:
    VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_REPLAY_BINDING_V1,
  durable_replay_store_marker:VOID_ECONOMIC_EPOCH2_DURABLE_REPLAY_STORE_V1,
  replay_root:path.join(stateDir,"replay-v1"),
  replay_root_realpath:path.join(stateDir,"replay-v1"),
  replay_root_dev:"123",
  replay_root_ino:"456",
  replay_root_uid:1000,
  replay_root_gid:1000,
  replay_root_mode:"700",
  same_uid_production_trust_proven:true,
  production_replay_root_selected:true,
  production_service_identity_bound:true,
  unit_af_unix_only:true,
  unit_no_new_privileges:true,
  unit_protect_system_strict:true,
  unit_protect_home_read_only:true,
  unit_umask_0077:true,
  runtime_route_active:false,
  public_submission_open:false,
  canary_digest:"0x"+"a".repeat(64),
  canary_fresh_consumed:true,
  canary_replay_rejected_after_reopen:true,
  bounded_canary_replay_store_mutation:true,
  production_store_mutation_scope:"single_synthetic_digest_marker",
  ephemeral_test_signer_used:true,
  ephemeral_signer_private_key_persisted:false,
  operator_wallet_access:false,
  rpc_call:false,
  transaction_construction:false,
  transaction_signing:false,
  transaction_submission:false,
  transaction_broadcast:false,
  authoritative_chain2050_write:false,
  credential_content_access:false,
  validator_mutation:false,
  token_movement:false,
  funds_movement:false,
  migration_authorized:false,
  public_activation_authorized:false,
};

const evidence=
  buildVoidEconomicEpoch2ProductionGatewayReplayBindingRuntimeEvidenceV1({
    facts,
    observedAtUtc:"2030-01-01T00:00:00Z",
    validUntilUtc:"2030-01-01T00:30:00Z",
    hostName,
    homeDir,
  });

assert.equal(
  evidence.marker,
  VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_REPLAY_BINDING_RUNTIME_EVIDENCE_V1,
);
assert.equal(
  evidence.status,
  "INACTIVE_PRODUCTION_GATEWAY_REPLAY_BINDING_RUNTIME_EVIDENCE_CANDIDATE",
);
assert.equal(evidence.hostname,hostName);
assert.equal(evidence.chain_id,2050);
assert.equal(evidence.execution_epoch,2);
assert.equal(evidence.same_uid_production_trust_proven,true);
assert.equal(evidence.production_replay_root_selected,true);
assert.equal(evidence.production_service_identity_bound,true);
assert.equal(evidence.unit_af_unix_only,true);
assert.equal(evidence.canary_fresh_consumed,true);
assert.equal(evidence.canary_replay_rejected_after_reopen,true);
assert.equal(evidence.bounded_canary_replay_store_mutation,true);
assert.equal(
  evidence.production_store_mutation_scope,
  "single_synthetic_digest_marker",
);
assert.equal(evidence.runtime_route_active,false);
assert.equal(evidence.public_submission_open,false);
assert.equal(
  evidence.production_gateway_replay_store_binding_verified,
  false,
);
assert.equal(evidence.cross_epoch_replay_protection_proven,false);
assert.equal(evidence.authoritative_chain2050_write,false);
assert.equal(evidence.funds_movement,false);
assert.match(evidence.evidence_id,/^voide2gre1_[0-9a-f]{64}$/);

for(const [name,mutate,reason] of [
  [
    "service uid mismatch",
    (x)=>{x.service_uid=1001;},
    /runtime_facts_binding_invalid/,
  ],
  [
    "replay root mode open",
    (x)=>{x.replay_root_mode="755";},
    /runtime_facts_binding_invalid/,
  ],
  [
    "network family not restricted",
    (x)=>{x.unit_af_unix_only=false;},
    /runtime_facts_binding_invalid/,
  ],
  [
    "canary mutation undisclosed",
    (x)=>{x.bounded_canary_replay_store_mutation=false;},
    /runtime_facts_binding_invalid/,
  ],
  [
    "route active",
    (x)=>{x.runtime_route_active=true;},
    /runtime_facts_binding_invalid/,
  ],
]){
  const bad=structuredClone(facts);
  mutate(bad);
  assert.throws(
    ()=>buildVoidEconomicEpoch2ProductionGatewayReplayBindingRuntimeEvidenceV1({
      facts:bad,
      observedAtUtc:"2030-01-01T00:00:00Z",
      validUntilUtc:"2030-01-01T00:30:00Z",
      hostName,
      homeDir,
    }),
    reason,
    name,
  );
}

assert.throws(
  ()=>buildVoidEconomicEpoch2ProductionGatewayReplayBindingRuntimeEvidenceV1({
    facts,
    observedAtUtc:"2030-01-01T00:00:00Z",
    validUntilUtc:"2030-01-01T02:00:00Z",
    hostName,
    homeDir,
  }),
  /runtime_evidence_time_window_invalid/,
);

const runtime=fs.readFileSync(
  "scripts/run_void_economic_epoch2_inactive_public_submission_gateway_v1.mjs",
  "utf8",
);
for(const required of [
  "INACTIVE_PRODUCTION_GATEWAY_REPLAY_BINDING_READY",
  "production_gateway_replay_store_binding_verified: false",
  "runtime_route_active: false",
  "public_submission_open: false",
  "authoritative_chain2050_write: false",
  "funds_movement: false",
]){
  assert.ok(runtime.includes(required),required);
}
for(const forbidden of [
  "createServer(",
  ".listen(",
  "eth_sendRawTransaction",
  "eth_sendTransaction",
  "http://",
  "https://",
]){
  assert.equal(runtime.includes(forbidden),false,forbidden);
}

const installer=fs.readFileSync(
  "ops/mainnet0/install-void-economic-epoch2-inactive-public-submission-gateway-v1.sh",
  "utf8",
);
for(const required of [
  'START_SERVICE="\${START_SERVICE:-0}"',
  "NoNewPrivileges=true",
  "ProtectSystem=strict",
  "ProtectHome=read-only",
  "RestrictAddressFamilies=AF_UNIX",
  "UMask=0077",
  "ReadWritePaths=\$STATE_DIR",
]){
  assert.ok(installer.includes(required),required);
}

for(const forbidden of [
  "After=default.target",
  "RestrictAddressFamilies=AF_INET",
  "RestrictAddressFamilies=AF_INET AF_INET6",
]){
  assert.equal(installer.includes(forbidden),false,forbidden);
}

const collector=fs.readFileSync(
  "scripts/run_void_economic_epoch2_production_gateway_replay_binding_runtime_evidence_v1.sh",
  "utf8",
);
for(const required of [
  "Wallet.createRandom()",
  "intent_replay_detected_at_atomic_consume",
  "bounded_canary_replay_store_mutation:true",
  'production_store_mutation_scope:"single_synthetic_digest_marker"',
  "operator_wallet_access:false",
  "rpc_call:false",
  "transaction_submission:false",
  "transaction_broadcast:false",
  "authoritative_chain2050_write:false",
]){
  assert.ok(collector.includes(required),required);
}
for(const forbidden of [
  "systemctl --user restart",
  "eth_sendRawTransaction",
  "eth_sendTransaction",
  "curl ",
  "wget ",
  "sudo ",
]){
  assert.equal(collector.includes(forbidden),false,forbidden);
}

console.log(
  "VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_REPLAY_BINDING_RUNTIME_EVIDENCE_V1_PROOF_GREEN",
);
console.log("production_host=precision");
console.log("same_uid_production_trust_required=true");
console.log("production_replay_root_selected=true");
console.log("production_service_identity_bound=true");
console.log("unit_af_unix_only=true");
console.log("bounded_canary_replay_store_mutation=true");
console.log("production_store_mutation_scope=single_synthetic_digest_marker");
console.log("runtime_route_active=false");
console.log("public_submission_open=false");
console.log("production_gateway_replay_store_binding_verified=false");
console.log("cross_epoch_replay_protection_proven=false");
console.log("authoritative_chain2050_write=false");
console.log("funds_movement=false");

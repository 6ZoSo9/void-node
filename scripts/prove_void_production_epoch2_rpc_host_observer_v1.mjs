#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";

import {
  EXPECTED_VALIDATORS_V1,
} from "../tools/void-economic-epoch2-qbft-private-runtime-activation-v1.mjs";
import {
  VOID_PRODUCTION_EPOCH2_RPC_HOST_OBSERVER_AUTHORITY_V1,
  VOID_PRODUCTION_EPOCH2_RPC_HOST_OBSERVER_PREVIEW_V1,
  VOID_PRODUCTION_EPOCH2_RPC_HOST_OBSERVER_V1,
  buildVoidProductionEpoch2RpcHostObservationV1,
  testOnlyExerciseVoidProductionEpoch2RpcOutputParentReplacementV1,
  testOnlyNormalizeVoidProductionEpoch2RpcDockerInspectV1,
  testOnlyValidateVoidProductionEpoch2RpcDockerDaemonInfoV1,
} from "../tools/void-production-epoch2-rpc-host-observer-v1.mjs";
import {
  buildVoidDatanetRegistryUnsignedCandidateFixtureV1,
} from "./fixtures/void-datanet-registry-unsigned-candidate-fixture-v1.mjs";

function bytes(value) {
  return Buffer.from(JSON.stringify(value, null, 2) + "\n", "utf8");
}
function sha(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

const fixture = await buildVoidDatanetRegistryUnsignedCandidateFixtureV1();
const activationPlan = structuredClone(fixture.activationPlan);
const precision = activationPlan.install_receipts.find(
  (row) => row.role === "precision",
);
assert.ok(precision);
precision.runtime_root =
  "/home/zoso/.local/share/void/epoch2-qbft-private-runtime-v1/precision";
precision.unit_install_path =
  "/home/zoso/.config/systemd/user/void-economic-epoch2-qbft-validator-v1.service";
precision.systemd_unit_sha256 = "a".repeat(64);

const planBytes = bytes(activationPlan);
const receiptBytes = bytes(fixture.activationReceipt);
const BESU_IMAGE =
  "hyperledger/besu@sha256:6f3f21ce533383fcc8db3bce02252b59d5a9e776b72b5a1c8ecd2db011600042";
const RPC_URL = "http://127.0.0.1:18553/";
const precisionHost = Object.freeze({
  role: "precision",
  hostname: "zoso-Precision-Tower-7810",
  container_name: "void-e2-qbft-precision-v1",
  service_name: "void-economic-epoch2-qbft-validator-v1.service",
  nodekey_path_relative:
    ".local/share/void/epoch2-qbft-validator-identity-v1/precision/nodekey",
  plugin_path_relative:
    "Downloads/void-epoch2-raw-transaction-domain-plugin-v1.jar",
  p2p: Object.freeze({
    host_publish: "100.64.1.1:30313:30313/tcp",
  }),
  rpc: Object.freeze({
    enabled: true,
    host_publish: "127.0.0.1:18553:8545/tcp",
    loopback_url: RPC_URL,
  }),
  besu_args: Object.freeze(["--network-id=2050"]),
});
const privateRuntimePlan = Object.freeze({
  marker: "VOID_ECONOMIC_EPOCH2_QBFT_PRIVATE_RUNTIME_PLAN_V1",
  status: "PRIVATE_QBFT_RUNTIME_PLAN_READY_ACTIVATION_HOLD",
  runtime: Object.freeze({ besu_image: BESU_IMAGE }),
  hosts: Object.freeze([precisionHost]),
});
const targetIdentity = Object.freeze({
  prospective_production_rpc_url: RPC_URL,
  prospective_production_service_unit:
    "void-economic-epoch2-qbft-validator-v1.service",
  genesis_block_hash:
    "0x8b522cd3dad5301f2d48c2fb1a750fca1e55dfcaa8bf699423bccdb5a061d01d",
  genesis_state_root:
    "0x7aef6c030a691569cdb0d033f1b9333c1a07cdc9de0c0fbfb952fddbd96cc2b2",
  production_validator_binding_evidence_path:
    "ops/mainnet0/economic-epoch2-production-successor-equivalence-evidence-v1.json",
  production_validator_binding_evidence_sha256: "b".repeat(64),
  production_validator_binding_evidence_id:
    "voide2pse1_" + "c".repeat(64),
});
const expectedContainer = Object.freeze({
  docker_host:
    "unix:///run/user/" + String(process.getuid()) + "/docker.sock",
  container_name: precisionHost.container_name,
  image_reference: BESU_IMAGE,
  entrypoint: Object.freeze(["/opt/besu/bin/besu"]),
  command: precisionHost.besu_args,
  binds: Object.freeze([
    "/home/zoso/.local/share/void/epoch2-qbft-private-runtime-v1/precision/data:/data",
    "/home/zoso/.local/share/void/epoch2-qbft-private-runtime-v1/precision/genesis.json:/config/genesis.json:ro",
    "/home/zoso/.local/share/void/epoch2-qbft-private-runtime-v1/precision/static-nodes.json:/config/static-nodes.json:ro",
    "/home/zoso/.local/share/void/epoch2-qbft-validator-identity-v1/precision/nodekey:/key/nodekey:ro",
    "/home/zoso/Downloads/void-epoch2-raw-transaction-domain-plugin-v1.jar:/plugins/void-epoch2-raw-transaction-domain-plugin-v1.jar:ro",
  ].sort()),
  port_bindings: Object.freeze([
    Object.freeze({
      container_port: "30313/tcp",
      host_ip: "100.64.1.1",
      host_port: "30313",
    }),
    Object.freeze({
      container_port: "8545/tcp",
      host_ip: "127.0.0.1",
      host_port: "18553",
    }),
  ]),
});
const validContainer = Object.freeze({
  docker_host: expectedContainer.docker_host,
  container_name: expectedContainer.container_name,
  container_id: "d".repeat(64),
  image_reference: expectedContainer.image_reference,
  image_id: "sha256:" + "e".repeat(64),
  running: true,
  started_at_utc: "2030-01-01T00:04:59.000Z",
  auto_remove: true,
  user: "0:0",
  entrypoint: expectedContainer.entrypoint,
  command: expectedContainer.command,
  binds: expectedContainer.binds,
  port_bindings: expectedContainer.port_bindings,
  besu_plugins_env_verified: true,
  cap_drop_all: true,
  no_new_privileges: true,
  rootless_security_verified: true,
  docker_socket_owner_uid: String(process.getuid()),
  systemd_exec_start_matches_reviewed_contract: true,
});
const reviewedSemantic = Object.freeze({
  reviewed_execution_verified: true,
  reviewed_source_head_sha: "a".repeat(40),
  reviewed_source_tree_sha: "b".repeat(40),
  reviewed_execution_manifest_sha256: "f".repeat(64),
  activation_plan: activationPlan,
  activation_receipt: fixture.activationReceipt,
  private_runtime_plan: privateRuntimePlan,
  target_value: Object.freeze({
    reviewed_successor_identity: targetIdentity,
  }),
  expected_validators: Object.freeze([...EXPECTED_VALIDATORS_V1]),
  target_status: "HOLD_PRODUCTION_EPOCH2_RPC_TARGET_NOT_SELECTED",
  target_selected: false,
  rpc_url_fingerprint_sha256: sha(Buffer.from(RPC_URL, "utf8")),
});

function validInput() {
  return {
    activation_plan_bytes: Buffer.from(planBytes),
    activation_plan_file_sha256: sha(planBytes),
    activation_receipt_bytes: Buffer.from(receiptBytes),
    activation_receipt_file_sha256: sha(receiptBytes),
    source_binding: {
      branch: "main",
      head: "a".repeat(40),
      tree: "b".repeat(40),
      canonical_remote_url: "https://github.com/6ZoSo9/void-node.git",
      remote_main_sha: "a".repeat(40),
      canonical_main_live_match: true,
    },
    reviewed_semantic: reviewedSemantic,
    host_observation: {
      hostname: "zoso-Precision-Tower-7810",
      service_unit: "void-economic-epoch2-qbft-validator-v1.service",
      fragment_path: precision.unit_install_path,
      fragment_file_sha256: precision.systemd_unit_sha256,
      active_state: "active",
      sub_state: "running",
      main_pid: "4242",
      invocation_id: "1".repeat(32),
      drop_in_paths: "",
      listener_address: "127.0.0.1",
      listener_port: 18553,
      listener_present: true,
      canonical_main_stable_during_observation: true,
      service_invocation_stable_during_observation: true,
      listener_stable_during_observation: true,
      container_stable_during_observation: true,
      service_container_contract_verified: true,
      container: structuredClone(validContainer),
      activation_source_lineage_ancestor_current_main: true,
      activation_plan_rederived_from_upstream: true,
      activation_upstream: {
        private_runtime_plan_file_sha256: "4".repeat(64),
        bundle_set_receipt_file_sha256: "5".repeat(64),
        start_admission_receipt_file_sha256: "6".repeat(64),
        install_precision_file_sha256: "7".repeat(64),
        install_nimo_file_sha256: "8".repeat(64),
        install_xiphos_file_sha256: "9".repeat(64),
      },
      rpc: {
        url: "http://127.0.0.1:18553/",
        chain_id_hex: "0x802",
        chain_id: 2050,
        execution_epoch: 2,
        genesis_block_number: "0",
        genesis_block_hash:
          "0x8b522cd3dad5301f2d48c2fb1a750fca1e55dfcaa8bf699423bccdb5a061d01d",
        genesis_state_root:
          "0x7aef6c030a691569cdb0d033f1b9333c1a07cdc9de0c0fbfb952fddbd96cc2b2",
        head_block_number: "50",
        head_block_hash: "0x" + "2".repeat(64),
        head_state_root: "0x" + "3".repeat(64),
        peer_count: 2,
        validators: [...EXPECTED_VALIDATORS_V1],
      },
      observed_at_utc: "2030-01-01T00:06:00.000Z",
    },
  };
}

const observation =
  buildVoidProductionEpoch2RpcHostObservationV1(validInput());
assert.equal(
  observation.marker,
  VOID_PRODUCTION_EPOCH2_RPC_HOST_OBSERVER_PREVIEW_V1,
);
assert.equal(
  observation.status,
  "PRODUCTION_EPOCH2_RPC_HOST_OBSERVATION_PREVIEW_NOT_SOURCE_VERIFIED",
);
assert.match(
  observation.preview_id,
  /^voidpe2rpcobspreview1_[0-9a-f]{64}$/u,
);
assert.equal(Object.hasOwn(observation, "observation_id"), false);
assert.equal(observation.rpc.url, "http://127.0.0.1:18553/");
assert.equal(observation.rpc.peer_count, 2);
assert.deepEqual(observation.rpc.validators, [...EXPECTED_VALIDATORS_V1].sort());
assert.equal(
  observation.write_capability_classification,
  "write_capable_not_authorized",
);
assert.equal(observation.independent_host_acceptance, false);
assert.equal(observation.target_descriptor_promotion_authorized, false);
assert.equal(observation.canonical_main_stable_during_observation, false);
assert.equal(observation.service.invocation_stable_during_observation, true);
assert.equal(observation.service.listener_stable_during_observation, true);
assert.equal(observation.service.container_stable_during_observation, true);
assert.equal(observation.service.service_container_contract_verified, true);
assert.equal(observation.service_container_listener_binding_verified, true);
assert.equal(observation.container.container_id, validContainer.container_id);
assert.deepEqual(
  observation.container.port_bindings,
  expectedContainer.port_bindings,
);
assert.equal(
  observation.activation_lineage.source_lineage_ancestor_current_main,
  true,
);
assert.equal(
  observation.activation_lineage.activation_plan_rederived_from_upstream,
  true,
);
assert.equal(
  observation.activation_lineage.private_runtime_plan_file_sha256,
  "4".repeat(64),
);
assert.equal(observation.authority.structural_preview_only, true);
assert.equal(observation.authority.canonical_main_live_read, false);
assert.equal(observation.authority.activation_lineage_rederived, false);
assert.equal(observation.authority.systemd_observation_performed, false);
assert.equal(observation.authority.docker_observation_performed, false);
assert.equal(observation.authority.rpc_observation_performed, false);
assert.equal(observation.authority.independent_host_acceptance, false);
assert.equal(
  observation.authority.target_descriptor_promotion,
  false,
);
assert.notDeepEqual(
  observation.authority,
  VOID_PRODUCTION_EPOCH2_RPC_HOST_OBSERVER_AUTHORITY_V1,
);

{
  const inspect = {
    Id: validContainer.container_id,
    Name: "/" + expectedContainer.container_name,
    Image: validContainer.image_id,
    State: {
      Running: true,
      Status: "running",
      StartedAt: validContainer.started_at_utc,
    },
    Config: {
      Image: expectedContainer.image_reference,
      User: "0:0",
      Entrypoint: [...expectedContainer.entrypoint],
      Cmd: [...expectedContainer.command],
      Env: ["BESU_OPTS=-Dbesu.plugins.dir=/plugins"],
    },
    HostConfig: {
      AutoRemove: true,
      Binds: [...expectedContainer.binds],
      CapDrop: ["ALL"],
      SecurityOpt: ["no-new-privileges:true"],
      PortBindings: {
        "30313/tcp": [{ HostIp: "100.64.1.1", HostPort: "30313" }],
        "8545/tcp": [{ HostIp: "127.0.0.1", HostPort: "18553" }],
      },
    },
    NetworkSettings: {
      Ports: {
        "30313/tcp": [{ HostIp: "100.64.1.1", HostPort: "30313" }],
        "8545/tcp": [{ HostIp: "127.0.0.1", HostPort: "18553" }],
      },
    },
  };
  assert.equal(
    testOnlyValidateVoidProductionEpoch2RpcDockerDaemonInfoV1({
      SecurityOptions: ["name=seccomp,profile=builtin", "name=rootless"],
    }),
    true,
  );
  assert.throws(
    () => testOnlyValidateVoidProductionEpoch2RpcDockerDaemonInfoV1({
      SecurityOptions: ["name=seccomp,profile=builtin"],
    }),
    /DOCKER_DAEMON_NOT_ROOTLESS/u,
  );

  inspect.NetworkSettings.Ports["8546/tcp"] = null;
  const normalized =
    testOnlyNormalizeVoidProductionEpoch2RpcDockerInspectV1(
      inspect,
      expectedContainer,
      process.getuid(),
    );
  assert.equal(normalized.container_id, validContainer.container_id);
  assert.deepEqual(normalized.port_bindings, expectedContainer.port_bindings);

  const extraPublished = structuredClone(inspect);
  extraPublished.NetworkSettings.Ports["8546/tcp"] = [
    { HostIp: "127.0.0.1", HostPort: "18554" },
  ];
  assert.throws(
    () => testOnlyNormalizeVoidProductionEpoch2RpcDockerInspectV1(
      extraPublished,
      expectedContainer,
      process.getuid(),
    ),
    /DOCKER_RUNTIME_CONTRACT_INVALID/u,
  );

  const wrongPort = structuredClone(inspect);
  wrongPort.NetworkSettings.Ports["8545/tcp"][0].HostPort = "18552";
  assert.throws(
    () => testOnlyNormalizeVoidProductionEpoch2RpcDockerInspectV1(
      wrongPort,
      expectedContainer,
      process.getuid(),
    ),
    /DOCKER_RUNTIME_CONTRACT_INVALID/u,
  );
}

function rejected(mutator, pattern) {
  const input = validInput();
  mutator(input);
  assert.throws(
    () => buildVoidProductionEpoch2RpcHostObservationV1(input),
    pattern,
  );
}

rejected(
  (v) => { v.host_observation.fragment_file_sha256 = "0".repeat(64); },
  /UNIT_IDENTITY_MISMATCH/u,
);
rejected(
  (v) => { v.host_observation.drop_in_paths = "/tmp/override.conf"; },
  /SERVICE_OR_LISTENER_INVALID/u,
);
rejected(
  (v) => { v.host_observation.container.container_id = "0".repeat(64); },
  /CONTAINER_IDENTITY_INVALID/u,
);
rejected(
  (v) => {
    v.host_observation.container.port_bindings[1] = {
      container_port: "8545/tcp",
      host_ip: "127.0.0.1",
      host_port: "18552",
    };
  },
  /CONTAINER_IDENTITY_INVALID/u,
);
rejected(
  (v) => { v.host_observation.container_stable_during_observation = false; },
  /SERVICE_OR_LISTENER_INVALID/u,
);
rejected(
  (v) => { v.host_observation.listener_port = 18552; },
  /SERVICE_OR_LISTENER_INVALID/u,
);
rejected(
  (v) => { v.host_observation.rpc.chain_id_hex = "0x801"; },
  /RPC_IDENTITY_MISMATCH/u,
);
rejected(
  (v) => { v.host_observation.rpc.peer_count = 1; },
  /RPC_IDENTITY_MISMATCH/u,
);
rejected(
  (v) => { v.host_observation.rpc.validators[0] = "0x" + "f".repeat(40); },
  /RPC_IDENTITY_MISMATCH/u,
);
rejected(
  (v) => {
    v.host_observation.rpc.genesis_block_hash = "0x" + "0".repeat(64);
  },
  /RPC_IDENTITY_MISMATCH/u,
);
rejected(
  (v) => { v.host_observation.rpc.head_block_number = "0"; },
  /HEAD_BELOW_ACTIVATION_FLOOR/u,
);
rejected(
  (v) => { v.source_binding.remote_main_sha = "c".repeat(40); },
  /SOURCE_OR_HOST_INVALID/u,
);
rejected(
  (v) => { v.host_observation.service_invocation_stable_during_observation = false; },
  /SERVICE_OR_LISTENER_INVALID/u,
);
rejected(
  (v) => { v.host_observation.activation_source_lineage_ancestor_current_main = false; },
  /SERVICE_OR_LISTENER_INVALID/u,
);
rejected(
  (v) => { v.host_observation.activation_plan_rederived_from_upstream = false; },
  /SERVICE_OR_LISTENER_INVALID/u,
);
rejected(
  (v) => { v.host_observation.activation_upstream.bundle_set_receipt_file_sha256 = "bad"; },
  /ACTIVATION_UPSTREAM_INVALID/u,
);
rejected(
  (v) => { v.host_observation.observed_at_utc = "2029-12-31T23:59:59.000Z"; },
  /TIME_INVALID/u,
);

{
  const input = validInput();
  const receipt = JSON.parse(input.activation_receipt_bytes.toString("utf8"));
  receipt.observations.after_xiphos_peer_count += 1;
  input.activation_receipt_bytes = bytes(receipt);
  input.activation_receipt_file_sha256 = sha(input.activation_receipt_bytes);
  assert.throws(
    () => buildVoidProductionEpoch2RpcHostObservationV1(input),
    /ACTIVATION_RECEIPT_REBUILD_MISMATCH/u,
  );
}

const parentRace =
  testOnlyExerciseVoidProductionEpoch2RpcOutputParentReplacementV1();
assert.match(
  String(parentRace.reason || ""),
  /OUTPUT_PARENT_CHANGED_DURING_WRITE/u,
);
assert.equal(parentRace.replacement_output_exists, false);
assert.equal(parentRace.original_output_exists, false);

const source = fs.readFileSync(
  "tools/void-production-epoch2-rpc-host-observer-v1.mjs",
  "utf8",
);
for (const forbidden of [
  "eth_sendRawTransaction",
  "eth_sendTransaction",
  "personal_sendTransaction",
  '"--user", "start"',
  '"--user", "restart"',
]) {
  assert.equal(source.includes(forbidden), false, forbidden);
}
for (const required of [
  '"eth_chainId"',
  '"eth_blockNumber"',
  '"eth_getBlockByNumber"',
  '"net_peerCount"',
  '"qbft_getValidatorsByBlockNumber"',
  '"--user", "show"',
  '"sport = :18553"',
  '"/info"',
  '"/containers/"',
  '"SecurityOptions"',
  '"NetworkSettings"',
  '"PortBindings"',
  "dockerContainerFacts",
  "reviewedSemanticExecution",
  "buildVerifiedVoidProductionEpoch2RpcHostObservationV1",
  "VERIFIED_SOURCE_CAPABILITY",
  "VERIFIED_SOURCE_OBSERVATIONS.has",
  "PRODUCTION_EPOCH2_RPC_OBSERVER_VERIFIED_SOURCE_REQUIRED",
  "container_stable_during_observation",
  "service_container_contract_verified",
  '"merge-base", "--is-ancestor"',
  "compileVoidEconomicEpoch2QbftPrivateRuntimeActivationPlanV1",
  '"private-runtime-plan"',
  '"bundle-set"',
  '"install-precision"',
  '"install-nimo"',
  '"install-xiphos"',
  '"start-admission"',
  '"/proc/self/fd/"',
  "fs.constants.O_DIRECTORY",
]) {
  assert.ok(source.includes(required), required);
}

console.log("VOID_PRODUCTION_EPOCH2_RPC_HOST_OBSERVER_V1_PROOF_GREEN");
console.log("activation_receipt_rederived=true");
console.log("canonical_main_live_match_required=true");
console.log("exact_installed_unit_sha_required=true");
console.log("dropins_forbidden=true");
console.log("precision_18553_listener_required=true");
console.log("chain2050_exact=true");
console.log("genesis_identity_exact=true");
console.log("validator_set_exact=true");
console.log("peer_count_minimum_two=true");
console.log("head_at_or_above_activation_floor=true");
console.log("canonical_main_stable_during_observation=true");
console.log("service_invocation_stable_during_observation=true");
console.log("listener_stable_during_observation=true");
console.log("rootless_docker_daemon_verified=true");
console.log("rootless_docker_container_identity_verified=true");
console.log("service_container_listener_binding_verified=true");
console.log("container_stable_during_observation=true");
console.log("docker_live_port_mapping_verified=true");
console.log("activation_source_lineage_ancestor_current_main=true");
console.log("activation_lineage_git_ancestry_execution_present=true");
console.log("activation_plan_upstream_reexecution_required=true");
console.log("exact_upstream_activation_artifacts_required=true");
console.log("private_output_parent_fd_bound=true");
console.log("private_output_redirect_forbidden=true");
console.log("write_capability_classification=write_capable_not_authorized");
console.log("synthetic_builder_independent_host_acceptance=false");
console.log("synthetic_builder_authoritative_marker_emitted=false");
console.log("live_verified_source_capability_required=true");
console.log("target_descriptor_promotion_authorized=false");
console.log("transaction_broadcast=false");
console.log("funds_movement=false");

#!/usr/bin/env -S node --experimental-strip-types
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  appendChain2050RoleAuthorityRecordV1,
  createEmptyChain2050RoleAuthorityRegistryV1,
} from "../src/security/chain2050_role_authority_registry_v1.js";
import {
  createChain2050RoleAuthorityLiveRpcBindingV1,
} from "../src/security/chain2050_role_authority_live_rpc_binding_v1.js";
import {
  VOID_CHAIN2050_ROLE_AUTHORITY_LIVE_RPC_QUERY_CONTRACT_SHA256_V1,
  computeChain2050RoleAuthorityLiveRpcFinalityPolicySha256V1,
} from "../tools/chain2050-role-authority-live-rpc-observer-v1.mjs";
import {
  EXPECTED_ROLE_AUTHORITY_LIVE_BINDING_V1,
  VOID_CHAIN2050_ROLE_AUTHORITY_PARTICIPANT_LIVE_BINDING_AUTHORITY_V1,
  VOID_CHAIN2050_ROLE_AUTHORITY_PARTICIPANT_LIVE_BINDING_PREFLIGHT_V1,
  buildRoleAuthorityParticipantLiveBindingPreflightV1,
} from "../tools/chain2050-role-authority-participant-live-binding-preflight-v1.mjs";

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const checkpoint = JSON.parse(
  fs.readFileSync(
    path.join(
      ROOT,
      "ops/mainnet0/chain2050-role-authority-checkpoint-verified-attestation-evidence-v1.json",
    ),
    "utf8",
  ),
);
const genesisEvidence = JSON.parse(
  fs.readFileSync(
    path.join(
      ROOT,
      "ops/mainnet0/chain2050-role-authority-sovereign-genesis-append-reconciliation-evidence-v1.json",
    ),
    "utf8",
  ),
);
const genesisPreparation = JSON.parse(
  fs.readFileSync(
    path.join(
      ROOT,
      "ops/mainnet0/chain2050-role-authority-sovereign-genesis-preparation-v1.json",
    ),
    "utf8",
  ),
);

const genesis = appendChain2050RoleAuthorityRecordV1(
  createEmptyChain2050RoleAuthorityRegistryV1(),
  genesisPreparation.candidate.record,
);
assert.equal(genesis.ok, true);
if (genesis.ok === false) throw new Error(genesis.reason);

const state = genesis.state;
assert.equal(state.entry_count, "1");
assert.equal(
  state.registry_root_sha256,
  EXPECTED_ROLE_AUTHORITY_LIVE_BINDING_V1
    .sovereign_genesis_registry_root_sha256,
);

function contractEntry(entry: (typeof state.entries)[number]) {
  return {
    entry_index: entry.entry_index,
    previous_registry_root_sha256:
      entry.previous_registry_root_sha256,
    role_record_sha256: entry.role_record_sha256,
    registry_root_sha256: entry.registry_root_sha256,
    record: {
      identity_id: entry.record.identity_id,
      role: entry.record.role,
      authority_status: entry.record.authority_status,
      role_authority_generation:
        entry.record.role_authority_generation,
      subject_binding_sha256:
        entry.record.subject_binding_sha256,
      authority_policy_sha256:
        entry.record.authority_policy_sha256,
      predecessor_role_record_sha256:
        entry.record.predecessor_role_record_sha256,
      transition: entry.record.transition,
      role_record_sha256: entry.role_record_sha256,
    },
  };
}

function canonicalSnapshot() {
  return {
    schema:
      "void.chain2050-role-authority-contract-snapshot.v1",
    chain_id: 2050,
    contract_address:
      EXPECTED_ROLE_AUTHORITY_LIVE_BINDING_V1.contract_address,
    runtime_code_sha256:
      EXPECTED_ROLE_AUTHORITY_LIVE_BINDING_V1
        .accepted_runtime_sha256,
    empty_registry_root_sha256:
      EXPECTED_ROLE_AUTHORITY_LIVE_BINDING_V1
        .empty_registry_root_sha256,
    entry_count: state.entry_count,
    registry_root_sha256: state.registry_root_sha256,
    entries: state.entries.map(contractEntry),
  };
}

const observationBlock = "37403";
const observationHash = "0x" + "7a".repeat(32);
const finalitySha =
  computeChain2050RoleAuthorityLiveRpcFinalityPolicySha256V1({
    confirmation_depth: 12,
  });
assert.match(finalitySha ?? "", /^[a-f0-9]{64}$/);

function makeFixture({
  snapshot = canonicalSnapshot(),
  observationBlockNumber = observationBlock,
} = {}) {
  let currentSnapshot = structuredClone(snapshot);
  const observerSource = {
    marker: "VOID_CHAIN2050_ROLE_AUTHORITY_LIVE_RPC_OBSERVER_V1",
    chain_id: 2050,
    contract_address:
      EXPECTED_ROLE_AUTHORITY_LIVE_BINDING_V1.contract_address,
    runtime_code_sha256:
      EXPECTED_ROLE_AUTHORITY_LIVE_BINDING_V1
        .accepted_runtime_sha256,
    registry_contract_sha256:
      EXPECTED_ROLE_AUTHORITY_LIVE_BINDING_V1
        .reviewed_registry_contract_sha256,
    query_contract_sha256:
      VOID_CHAIN2050_ROLE_AUTHORITY_LIVE_RPC_QUERY_CONTRACT_SHA256_V1,
    finality_policy_sha256: finalitySha,
    rpc_url_fingerprint_sha256: "88".repeat(32),
    transport_kind: "loopback_http_json_rpc",
    synthetic_transport: false,
    authority: {
      canonical_chain_id: "2050",
      loopback_http_only: true,
      fixed_block_observation: true,
      block_hash_revalidation_required: true,
      runtime_code_revalidation_required: true,
      terminal_state_revalidation_required: true,
      read_only_rpc_methods: [
        "eth_chainId",
        "eth_blockNumber",
        "eth_getBlockByNumber",
        "eth_getCode",
        "eth_call",
      ],
      filesystem_read: false,
      filesystem_write: false,
      credential_access: false,
      wallet_access: false,
      signing: false,
      transaction_construction: false,
      transaction_broadcast: false,
      deployment: false,
      chain2050_mutation: false,
      validator_mutation: false,
      governance_mutation: false,
      work_credit_mutation: false,
      runtime_service_action: false,
      automatic_retry: false,
      funds_action: false,
    },
    async readContractSnapshotV1() {
      return structuredClone(currentSnapshot);
    },
  };

  const binding = createChain2050RoleAuthorityLiveRpcBindingV1({
    observer: observerSource,
    binding_id:
      EXPECTED_ROLE_AUTHORITY_LIVE_BINDING_V1.binding_id,
  });

  const observerResult = {
    ok: true,
    status: "read_only_live_rpc_observer_ready",
    marker: "VOID_CHAIN2050_ROLE_AUTHORITY_LIVE_RPC_OBSERVER_V1",
    version: 1,
    rpc_url_fingerprint_sha256:
      observerSource.rpc_url_fingerprint_sha256,
    rpc_methods_used: [
      "eth_chainId",
      "eth_blockNumber",
      "eth_getBlockByNumber",
      "eth_getCode",
      "eth_call",
    ],
    initial_snapshot: structuredClone(snapshot),
    observation: {
      chain_id: "2050",
      head_block_number:
        (BigInt(observationBlockNumber) + 11n).toString(),
      observation_block_number: observationBlockNumber,
      observation_block_hash: observationHash,
      confirmation_depth: "12",
      fixed_block_observation: true,
      observation_block_hash_revalidated: true,
      runtime_code_revalidated: true,
      terminal_state_revalidated: true,
    },
    source: observerSource,
    deployment_verified: false,
    production_activation_authorized: false,
    mutation_performed: false,
    credential_access_performed: false,
    wallet_access_performed: false,
    signing_performed: false,
    transaction_constructed: false,
    transaction_broadcast_performed: false,
    chain2050_mutation_performed: false,
    runtime_service_action_performed: false,
    automatic_retry_allowed: false,
    funds_action_performed: false,
  };

  return {
    observerSource,
    observerResult,
    binding,
    setSnapshot(value: unknown) {
      currentSnapshot = structuredClone(value);
    },
  };
}

async function run(fixture = makeFixture(), overrides: any = {}) {
  return await buildRoleAuthorityParticipantLiveBindingPreflightV1({
    checkpoint_evidence: structuredClone(checkpoint),
    genesis_reconciliation_evidence:
      structuredClone(genesisEvidence),
    observer_result: fixture.observerResult,
    ...overrides,
  });
}

const green = await run();
assert.equal(green.ok, true);
if (green.ok === false) throw new Error(green.reason);
assert.equal(
  green.marker,
  VOID_CHAIN2050_ROLE_AUTHORITY_PARTICIPANT_LIVE_BINDING_PREFLIGHT_V1,
);
assert.match(green.preflight_id, /^voidcrapalb1_[a-f0-9]{64}$/);
assert.equal(
  green.contract_address,
  EXPECTED_ROLE_AUTHORITY_LIVE_BINDING_V1.contract_address,
);
assert.equal(green.confirmation_depth, "12");
assert.equal(green.initial_observed_registry_entry_count, "1");
assert.equal(
  green.initial_observed_registry_root_sha256,
  EXPECTED_ROLE_AUTHORITY_LIVE_BINDING_V1
    .sovereign_genesis_registry_root_sha256,
);
assert.equal(green.facts.live_chain_registry_bound, true);
assert.equal(green.facts.participant_role_source_ready, true);
assert.equal(
  green.facts.canonical_snapshot_validation_exercised,
  true,
);
assert.equal(green.facts.bound_sovereign_read_verified, true);
assert.equal(
  green.facts.durable_participant_session_state_bound,
  false,
);
assert.equal(
  green.facts.public_session_route_mount_authorized,
  false,
);
assert.equal(green.facts.runtime_activation_authorized, false);
assert.equal(
  green.next_gate,
  "merge_durable_participant_session_state_then_review_composition_wiring_and_restart_rollback_preflight",
);

for (const [key, value] of Object.entries(
  VOID_CHAIN2050_ROLE_AUTHORITY_PARTICIPANT_LIVE_BINDING_AUTHORITY_V1,
)) {
  if (
    [
      "source_only_preflight",
      "accepted_deployment_checkpoint_required",
      "reconciled_sovereign_genesis_required",
      "fresh_live_rpc_observer_required",
      "fixed_block_revalidation_required",
      "twelve_confirmation_policy_required",
      "canonical_binding_descriptor_required",
      "canonical_snapshot_validation_required",
      "bound_sovereign_read_required",
      "live_chain_registry_binding_claim_green_only",
      "durable_participant_session_state_required_separately",
    ].includes(key)
  ) {
    assert.equal(value, true, key);
  } else {
    assert.equal(value, false, key);
  }
}

{
  const bad = structuredClone(checkpoint);
  bad.checkpoint_hash = "0x" + "00".repeat(32);
  const result = await run(makeFixture(), {
    checkpoint_evidence: bad,
  });
  assert.equal(result.ok, false);
  if (result.ok === true) throw new Error("bad checkpoint admitted");
  assert.match(
    result.reason,
    /role_authority_deployment_checkpoint_invalid/,
  );
}

{
  const bad = structuredClone(genesisEvidence);
  bad.post_state.registry_root_sha256 = "00".repeat(32);
  const result = await run(makeFixture(), {
    genesis_reconciliation_evidence: bad,
  });
  assert.equal(result.ok, false);
  if (result.ok === true) throw new Error("bad genesis admitted");
  assert.match(
    result.reason,
    /role_authority_sovereign_genesis_invalid/,
  );
}

{
  const fixture = makeFixture({
    observationBlockNumber: "37391",
  });
  const result = await run(fixture);
  assert.equal(result.ok, false);
  if (result.ok === true) throw new Error("pre-genesis observation admitted");
  assert.equal(
    result.reason,
    "role_authority_live_observation_invalid",
  );
}

{
  const bad = canonicalSnapshot();
  bad.entries[0].record.role = "AGENT";
  const fixture = makeFixture({ snapshot: bad });
  const result = await run(fixture);
  assert.equal(result.ok, false);
  if (result.ok === true) throw new Error("bad genesis prefix admitted");
  assert.equal(
    result.reason,
    "role_authority_sovereign_genesis_prefix_mismatch",
  );
}

{
  const fixture = makeFixture();
  assert.equal(fixture.binding.ok, true);
  if (fixture.binding.ok === false) {
    throw new Error(fixture.binding.reason);
  }

  // Descriptor-perfect forged executable source must not be accepted as
  // authority. The preflight input is closed and constructs the canonical
  // binding itself from the reviewed observer source.
  const forgedBinding = {
    ...fixture.binding,
    source: {
      ...fixture.binding.source,
      async readCurrentRoleAuthorityRecordV1() {
        return structuredClone(
          genesisPreparation.candidate.record,
        );
      },
    },
  };
  const result = await run(fixture, {
    binding_result: forgedBinding,
  });
  assert.equal(result.ok, false);
  if (result.ok === true) {
    throw new Error("forged executable binding input admitted");
  }
  assert.equal(
    result.reason,
    "role_authority_participant_live_binding_input_shape_invalid",
  );
}

{
  const fixture = makeFixture();
  const bad = canonicalSnapshot();
  bad.registry_root_sha256 = "00".repeat(32);
  fixture.setSnapshot(bad);
  const result = await run(fixture);
  assert.equal(result.ok, false);
  if (result.ok === true) throw new Error("invalid canonical snapshot admitted");
  assert.equal(
    result.reason,
    "role_authority_bound_sovereign_read_failed",
  );
}

console.log(
  "VOID_CHAIN2050_ROLE_AUTHORITY_PARTICIPANT_LIVE_BINDING_PREFLIGHT_V1_PROOF_GREEN",
);
console.log("accepted_deployment_checkpoint_verified=true");
console.log("sovereign_genesis_reconciled=true");
console.log("sovereign_genesis_prefix_exact=true");
console.log("fresh_live_12_confirmation_observation_required=true");
console.log("runtime_code_identity_revalidated=true");
console.log("canonical_binding_constructed_inside_preflight=true");
console.log("caller_supplied_binding_result_rejected=true");
console.log("canonical_binding_descriptor_recomputed=true");
console.log("canonical_snapshot_validation_exercised=true");
console.log("bound_sovereign_read_verified=true");
console.log("live_chain_registry_bound=true");
console.log("participant_role_source_ready=true");
console.log("durable_participant_session_state_bound=false");
console.log("public_session_route_mount_authorized=false");
console.log("runtime_activation_authorized=false");
console.log("credential_access=false");
console.log("private_key_access=false");
console.log("transaction_signing=false");
console.log("transaction_broadcast=false");
console.log("chain2050_write=false");
console.log("registry_append=false");
console.log("funds_action=false");

#!/usr/bin/env node
// VOID Community License (VCL) v1.0 — see LICENSE

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  ACTIVATION_CHURN_LIMIT,
  CHAIN_ID,
  CONTRACT_PATH,
  DECISION,
  MARKER,
  MAX_ACTIVE_VALIDATORS,
  MIN_VALIDATOR_STAKE_WEI,
  PROTOCOL,
  RESOLVER_MARKER,
  buildPreparation,
  canonicalJson,
  encodeConstructorArguments,
  sha256,
  validateResolverReport,
} from "../tools/void-validator-candidate-registry-deployment-preparation-v1.mjs";

const ROOT = process.cwd();
const read = (relative) => fs.readFileSync(path.join(ROOT, relative), "utf8");
const readJson = (relative) => JSON.parse(read(relative));
const TOOL_PATH =
  "tools/void-validator-candidate-registry-deployment-preparation-v1.mjs";
const SCHEMA_PATH =
  "schemas/void-validator-candidate-registry-deployment-preparation-v1.schema.json";
const DOC_PATH =
  "docs/operators/void-validator-candidate-registry-deployment-preparation-v1.md";
const WORKFLOW_PATH =
  ".github/workflows/void-validator-candidate-registry-deployment-preparation-v1.yml";
const SOURCE_COMMIT = "7dc10098a87dee5e27a558ef73a5ea3c52479f99";
const STALE_ADDRESS = "0x9092b4a06c76cf1192a87ff9f6f5f8c758b9327b";
const SECOND_ADDRESS = "0x1111111111111111111111111111111111111111";
const OBSERVED_AT = "2026-08-05T09:00:00.000Z";
const PREPARED_AT = "2026-08-05T09:01:00.000Z";

function resolverReport() {
  return {
    marker: RESOLVER_MARKER,
    version: 1,
    observed_at_utc: OBSERVED_AT,
    chain_id: CHAIN_ID,
    rpc_origin: "http://127.0.0.1:8545",
    artifact_scan: {
      directory: "/home/zoso/dev/void-node/.runtime/mainnet0",
      exists: true,
      scanned_files: 16,
      rejected_files: [],
      artifacts: Array.from({ length: 16 }, (_, index) => ({
        name: index === 0
          ? "validator-candidate-registry.local.current.json"
          : `validator-candidate-registry.local.${String(index).padStart(2, "0")}.json`,
        sha256: index.toString(16).padStart(64, "0"),
        bytes: 512 + index,
        addresses: index === 0 ? [STALE_ADDRESS] : [],
      })),
    },
    results: [
      {
        address: STALE_ADDRESS,
        sources: [
          {
            artifact: "validator-candidate-registry.local.current.json",
            artifact_sha256: "0".repeat(64),
          },
        ],
        code_present: false,
        code_sha256: null,
        calls_succeeded: false,
        classification: "stale_no_code",
        error: null,
      },
    ],
    decision: "HOLD_NO_LIVE_EXACT_REGISTRY",
    ready: false,
    selected_address: null,
    blockers: [`${STALE_ADDRESS}:stale_no_code`],
    authority_boundary: {
      read_only_rpc: true,
      artifact_pointer_overwritten: false,
      contract_deployed: false,
      transaction_signed: false,
      transaction_broadcast: false,
      wallet_or_signer_access: false,
      validator_state_mutated: false,
      fund_movement: false,
    },
  };
}

function packetFor(report = resolverReport(), preparedAt = PREPARED_AT) {
  const resolverBytes = Buffer.from(`${JSON.stringify(report, null, 2)}\n`);
  return buildPreparation({
    resolverReport: report,
    resolverBytes,
    contractBytes: fs.readFileSync(path.join(ROOT, CONTRACT_PATH)),
    sourceCommit: SOURCE_COMMIT,
    sourceBranch: "main",
    preparedAt,
    maxReportAgeMs: 15 * 60 * 1000,
  });
}

function expectCode(fn, code) {
  assert.throws(fn, (error) => error?.code === code, code);
}

assert.equal(MARKER, "VOID_VALIDATOR_CANDIDATE_REGISTRY_DEPLOYMENT_PREPARATION_V1");
assert.equal(PROTOCOL, "void-validator-candidate-registry-deployment-preparation/1");
assert.equal(CHAIN_ID, 2050);
assert.equal(MIN_VALIDATOR_STAKE_WEI, "10000000000000000000000");
assert.equal(MAX_ACTIVE_VALIDATORS, "256");
assert.equal(ACTIVATION_CHURN_LIMIT, "4");
assert.equal(CONTRACT_PATH, "contracts/mainnet0/VoidValidatorCandidateRegistry.sol");

const report = resolverReport();
const validation = validateResolverReport({
  report,
  preparedAt: PREPARED_AT,
  maxReportAgeMs: 15 * 60 * 1000,
});
assert.equal(validation.resolver_age_ms, 60_000);
assert.deepEqual(validation.stale_addresses, [STALE_ADDRESS]);
assert.equal(validation.scanned_artifact_files, 16);

const packet = packetFor();
assert.deepEqual(packet, packetFor(), "packet must be deterministic");
assert.match(packet.preparation_id, /^voidvcrdp1_[0-9a-f]{64}$/);
const { preparation_id: preparationId, ...idBody } = packet;
assert.equal(preparationId, `voidvcrdp1_${sha256(canonicalJson(idBody))}`);
assert.equal(packet.marker, MARKER);
assert.equal(packet.protocol, PROTOCOL);
assert.equal(packet.version, 1);
assert.equal(packet.prepared_at_utc, PREPARED_AT);
assert.equal(packet.source.repository, "6ZoSo9/void-node");
assert.equal(packet.source.source_commit, SOURCE_COMMIT);
assert.equal(packet.source.source_branch, "main");
assert.equal(packet.source.resolver_decision, "HOLD_NO_LIVE_EXACT_REGISTRY");
assert.deepEqual(packet.source.stale_candidate_addresses, [STALE_ADDRESS]);
assert.equal(packet.chain.chain_id, 2050);
assert.equal(packet.chain.rpc_origin, "http://127.0.0.1:8545");
assert.deepEqual(packet.policy, {
  min_validator_stake_wei: MIN_VALIDATOR_STAKE_WEI,
  min_validator_stake_void: "10000",
  max_active_validators: MAX_ACTIVE_VALIDATORS,
  activation_churn_limit: ACTIVATION_CHURN_LIMIT,
  public_registration_starts_as_candidate: true,
  public_registration_activates_validator: false,
});
assert.deepEqual(packet.compiler_profile, {
  solc_version: "0.8.20",
  optimizer_enabled: true,
  optimizer_runs: 200,
  creation_bytecode_compiled: false,
  creation_bytecode_reviewed: false,
});

const expectedArguments =
  "0x00000000000000000000000000000000000000000000021e19e0c9bab2400000" +
  "0000000000000000000000000000000000000000000000000000000000000100" +
  "0000000000000000000000000000000000000000000000000000000000000004";
assert.equal(encodeConstructorArguments(), expectedArguments);
assert.equal(packet.constructor.abi_encoded_arguments, expectedArguments);
assert.equal(
  packet.constructor.abi_encoded_arguments_sha256,
  sha256(Buffer.from(expectedArguments.slice(2), "hex")),
);
assert.equal(packet.ordered_gates.length, 9);
assert.equal(Object.keys(packet.authority).length, 14);
for (const [key, value] of Object.entries(packet.authority)) {
  assert.match(key, /_authorized$/);
  assert.equal(value, false, key);
}
for (const value of Object.values(packet.unresolved)) {
  assert.ok(value === null || value === false);
}
assert.equal(packet.decision.status, DECISION);
assert.equal(packet.decision.source_review_packet_complete, true);
assert.equal(packet.decision.known_registry_artifacts_proven_stale, true);
assert.equal(packet.decision.creation_bytecode_reviewed, false);
assert.equal(packet.decision.deployment_authorized, false);
assert.equal(packet.decision.transaction_broadcast_authorized, false);
assert.equal(packet.decision.execution_authorized, false);

const existing = resolverReport();
existing.decision = "READY_EXISTING_LIVE_EXACT_REGISTRY";
existing.ready = true;
existing.selected_address = STALE_ADDRESS;
expectCode(() => packetFor(existing), "resolver_not_deployment_candidate");

const uncertain = resolverReport();
uncertain.results[0].classification = "rpc_error";
uncertain.results[0].error = "NETWORK_ERROR";
expectCode(
  () => packetFor(uncertain),
  "resolver_contains_uncertain_or_live_registry",
);

const liveUnreadable = resolverReport();
liveUnreadable.results[0].code_present = true;
liveUnreadable.results[0].classification = "live_unreadable";
liveUnreadable.results[0].error = "CALL_EXCEPTION";
expectCode(
  () => packetFor(liveUnreadable),
  "resolver_contains_uncertain_or_live_registry",
);

const wrongChain = resolverReport();
wrongChain.chain_id = 1;
expectCode(() => packetFor(wrongChain), "resolver_wrong_chain");

const noArtifacts = resolverReport();
noArtifacts.artifact_scan.scanned_files = 0;
noArtifacts.artifact_scan.artifacts = [];
expectCode(() => packetFor(noArtifacts), "resolver_artifact_evidence_incomplete");

expectCode(
  () => packetFor(resolverReport(), "2026-08-05T09:16:00.001Z"),
  "resolver_report_stale",
);

const unsafeBoundary = resolverReport();
unsafeBoundary.authority_boundary.transaction_broadcast = true;
expectCode(
  () => packetFor(unsafeBoundary),
  "resolver_authority_boundary_invalid",
);

const artifactMismatch = resolverReport();
artifactMismatch.artifact_scan.artifacts[0].addresses = [SECOND_ADDRESS];
expectCode(
  () => packetFor(artifactMismatch),
  "resolver_result_source_mismatch",
);

const sourceHashMismatch = resolverReport();
sourceHashMismatch.results[0].sources[0].artifact_sha256 = "f".repeat(64);
expectCode(
  () => packetFor(sourceHashMismatch),
  "resolver_result_source_mismatch",
);

const sourceNameMismatch = resolverReport();
sourceNameMismatch.results[0].sources[0].artifact =
  "validator-candidate-registry.local.01.json";
expectCode(
  () => packetFor(sourceNameMismatch),
  "resolver_result_source_mismatch",
);

const missingSource = resolverReport();
missingSource.results[0].sources = [];
expectCode(
  () => packetFor(missingSource),
  "resolver_contains_uncertain_or_live_registry",
);

const extraArtifactAddress = resolverReport();
extraArtifactAddress.artifact_scan.artifacts[1].addresses = [SECOND_ADDRESS];
expectCode(
  () => packetFor(extraArtifactAddress),
  "resolver_artifact_result_mismatch",
);

const duplicateArtifactName = resolverReport();
duplicateArtifactName.artifact_scan.artifacts[1].name =
  duplicateArtifactName.artifact_scan.artifacts[0].name;
expectCode(
  () => packetFor(duplicateArtifactName),
  "resolver_artifact_evidence_incomplete",
);

const rejectedArtifact = resolverReport();
rejectedArtifact.artifact_scan.rejected_files = [
  { name: "validator-candidate-registry.bad.json", reason: "invalid_json" },
];
expectCode(
  () => packetFor(rejectedArtifact),
  "resolver_artifact_evidence_incomplete",
);

const publicHttp = resolverReport();
publicHttp.rpc_origin = "http://example.com";
expectCode(() => packetFor(publicHttp), "resolver_rpc_origin_invalid");

const rawMismatch = resolverReport();
const mismatchedBytes = Buffer.from(`${JSON.stringify({
  ...rawMismatch,
  blockers: ["different"],
}, null, 2)}\n`);
expectCode(
  () => buildPreparation({
    resolverReport: rawMismatch,
    resolverBytes: mismatchedBytes,
    contractBytes: fs.readFileSync(path.join(ROOT, CONTRACT_PATH)),
    sourceCommit: SOURCE_COMMIT,
    sourceBranch: "main",
    preparedAt: PREPARED_AT,
  }),
  "resolver_report_bytes_mismatch",
);

const tool = read(TOOL_PATH);
for (const forbidden of [
  "signTransaction(",
  "sendTransaction(",
  "broadcastTransaction(",
  "eth_sendRawTransaction",
  "forge create",
  "cast send",
  "anvil_setBalance",
  "/mnt/key",
  "workflow_dispatch",
  "--prepared-at",
]) {
  assert.equal(tool.includes(forbidden), false, `forbidden operation: ${forbidden}`);
}
assert.equal(tool.includes("fetch("), false);
assert.equal(tool.includes("JsonRpcProvider"), false);
for (const required of [
  'spawnSync("git"',
  "atomicWriteJson",
  "const allowed = new Set",
  "privateHttpHost",
  "resolver_report_bytes_mismatch",
  "resolver_artifact_result_mismatch",
  "resolver_result_source_mismatch",
]) {
  assert.ok(tool.includes(required), `tool missing ${required}`);
}

const schema = readJson(SCHEMA_PATH);
assert.equal(schema.$schema, "https://json-schema.org/draft/2020-12/schema");
assert.equal(schema.additionalProperties, false);
assert.equal(schema.properties.marker.const, MARKER);
assert.equal(schema.properties.protocol.const, PROTOCOL);
assert.equal(schema.properties.chain.properties.chain_id.const, 2050);
assert.equal(
  schema.properties.policy.properties.min_validator_stake_wei.const,
  MIN_VALIDATOR_STAKE_WEI,
);
assert.equal(schema.properties.decision.properties.status.const, DECISION);
assert.equal(schema.properties.ordered_gates.minItems, 9);
assert.equal(schema.properties.ordered_gates.maxItems, 9);
assert.equal(schema.properties.authority.required.length, 14);
for (const key of schema.properties.authority.required) {
  assert.equal(schema.properties.authority.properties[key].const, false, key);
}

const contract = read(CONTRACT_PATH);
for (const required of [
  "contract VoidValidatorCandidateRegistry",
  "owner = msg.sender",
  "external payable",
  "state: ValidatorState.Candidate",
  "function markActiveBatch",
]) {
  assert.ok(contract.includes(required), `contract missing ${required}`);
}

const doc = read(DOC_PATH);
for (const required of [
  MARKER,
  DECISION,
  "HOLD_NO_LIVE_EXACT_REGISTRY",
  "stale_no_code",
  "10,000 VOID",
  "does not compile",
  "does not authorize",
  "legacy deploy proof",
  "current system clock",
  "does not accept a caller-supplied preparation timestamp",
  "matching artifact SHA-256",
]) {
  assert.ok(doc.includes(required), `documentation missing ${required}`);
}

const workflow = read(WORKFLOW_PATH);
for (const required of [
  "actions/checkout@v6",
  "actions/setup-node@v6",
  'node-version: "22"',
  "npm ci --ignore-scripts --no-audit --no-fund",
  `python3 -m json.tool ${SCHEMA_PATH}`,
  `node --check ${TOOL_PATH}`,
  "node --check scripts/prove_void_validator_candidate_registry_deployment_preparation_v1.mjs",
  "node scripts/prove_void_validator_candidate_registry_deployment_preparation_v1.mjs",
  "npm run typecheck",
  "permissions:\n  contents: read",
]) {
  assert.ok(workflow.includes(required), `workflow missing ${required}`);
}
assert.equal(workflow.includes("workflow_dispatch"), false);
assert.equal(workflow.includes("contents: write"), false);

console.log(JSON.stringify({
  marker: MARKER,
  preparation_id: packet.preparation_id,
  source_commit: SOURCE_COMMIT,
  contract_source_sha256: packet.source.contract_source_sha256,
  resolver_report_sha256: packet.source.resolver_report_sha256,
  stale_candidate_addresses: packet.source.stale_candidate_addresses,
  constructor_arguments_sha256: packet.constructor.abi_encoded_arguments_sha256,
  resolver_source_provenance_bound: true,
  creation_bytecode_reviewed: false,
  transaction_construction_authorized: false,
  signing_authorized: false,
  transaction_broadcast_authorized: false,
  contract_deployment_authorized: false,
  validator_activation_authorized: false,
  fund_movement_authorized: false,
  decision: DECISION,
  status: "GREEN",
}, null, 2));
console.log(`${MARKER}_PROOF_GREEN`);

#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_RUNTIME_EVIDENCE_CANDIDATE_V1,
  buildVoidEconomicEpoch2ProductionValidatorRuntimeEvidenceCandidateV1,
} from "../tools/void-economic-epoch2-production-validator-runtime-evidence-candidate-v1.mjs";
import {
  verifyVoidEconomicEpoch2ProductionValidatorDomainEnforcementV1,
} from "../tools/void-economic-epoch2-production-validator-domain-enforcement-v1.mjs";

const binding = JSON.parse(
  fs.readFileSync(
    "ops/mainnet0/economic-epoch2-qbft-validator-binding-candidate-v1.json",
    "utf8",
  ),
);
const rawDomain = JSON.parse(
  fs.readFileSync(
    "ops/mainnet0/economic-epoch2-raw-transaction-domain-v1.json",
    "utf8",
  ),
);
if(rawDomain?.gates?.all_production_validators_epoch_domain_enforced===true){
  rawDomain.status="BESU_RUNTIME_VALIDATOR_GREEN_PRODUCTION_ENFORCEMENT_HOLD";
  rawDomain.besu_validation_boundary.all_production_validators_enforce_rule=false;
  rawDomain.gates.all_production_validators_epoch_domain_enforced=false;
  rawDomain.gates.cross_epoch_replay_protection_proven=false;
}

const artifact = JSON.parse(
  fs.readFileSync(
    "ops/mainnet0/economic-epoch2-besu-raw-transaction-validator-plugin-artifact-v1.json",
    "utf8",
  ),
);
const runtimeResult = JSON.parse(
  fs.readFileSync(
    "ops/mainnet0/economic-epoch2-besu-raw-transaction-validator-runtime-evidence-v1.json",
    "utf8",
  ),
);

assert.equal(
  VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_RUNTIME_EVIDENCE_CANDIDATE_V1,
  "VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_RUNTIME_EVIDENCE_CANDIDATE_V1",
);
assert.equal(binding.qbft.production_binding_entries.length, 3);
assert.equal(binding.qbft.required_live_node_count, 3);
assert.equal(binding.qbft.attested_identity_slots_remaining, 0);

const roles = ["precision", "nimo", "xiphos"];
const observed = [
  "2030-01-01T00:00:00Z",
  "2030-01-01T00:01:00Z",
  "2030-01-01T00:02:00Z",
];
const runtimeSha = "a".repeat(64);
const factsSha = "b".repeat(64);
const logSha = "c".repeat(64);
const pluginSha =
  "6637c57b64666e7761a8e254e7968a60f4a80bef05e070be8e8b934d887d5518";

function factsFor(role, hostName) {
  const entry = binding.qbft.production_binding_entries.find(
    (row) => row.machine_role === role,
  );
  assert(entry);
  return {
    marker:
      "VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_LOCAL_RUNTIME_FACTS_V1",
    version: 1,
    machine_role: role,
    hostname: hostName,
    void_node_id: entry.void_node_id,
    besu_validator_address: entry.besu_validator_address,
    besu_public_key: entry.besu_public_key,
    node_private_key_path: path.join(
      os.homedir(),
      ".local",
      "share",
      "void",
      "epoch2-qbft-validator-identity-v1",
      role,
      "nodekey",
    ),
    node_private_key_mode: "600",
    node_private_key_matches_canonical_identity: true,
    node_private_key_content_exported: false,
    node_private_key_stdout: false,
    void_health_loopback_verified: true,
    besu_image:
      "hyperledger/besu@sha256:6f3f21ce533383fcc8db3bce02252b59d5a9e776b72b5a1c8ecd2db011600042",
    plugin_name: "VoidEpoch2RawTransactionDomainPlugin",
    plugin_jar_sha256: pluginSha,
    plugin_loaded: true,
    transaction_validation_rule_registered: true,
    local_unmarked_raw_transaction_rejected: true,
    raw_public_rpc_disabled: true,
    rpc_host_binding: "127.0.0.1",
    external_p2p_exposure: false,
    startup_fail_closed_on_plugin_mismatch: true,
    production_rpc_contact: false,
    authoritative_chain2050_write: false,
    validator_mutation: false,
    funds_movement: false,
    runtime_result_sha256: runtimeSha,
    besu_log_sha256: logSha,
  };
}

const rows = roles.map((role, index) => {
  const identity = JSON.parse(
    fs.readFileSync(
      `ops/mainnet0/economic-epoch2-qbft-node-identity-${role}-v1.json`,
      "utf8",
    ),
  );
  return buildVoidEconomicEpoch2ProductionValidatorRuntimeEvidenceCandidateV1({
    machineRole: role,
    runtimeResult,
    runtimeResultSha256: runtimeSha,
    facts: factsFor(role, identity.hostname),
    factsSha256: factsSha,
    pluginJarSha256: pluginSha,
    besuLogSha256: logSha,
    observedAtUtc: observed[index],
    validUntilUtc: "2030-01-01T00:10:00Z",
    hostName: identity.hostname,
  });
});

assert.equal(rows.length, 3);
for (let i = 0; i < rows.length; i += 1) {
  const row = rows[i];
  const entry = binding.qbft.production_binding_entries[i];
  assert.equal(row.machine_role, entry.machine_role);
  assert.equal(row.void_node_id, entry.void_node_id);
  assert.equal(
    row.besu_validator_address,
    entry.besu_validator_address.toLowerCase(),
  );
  assert.equal(row.plugin_loaded, true);
  assert.equal(row.transaction_validation_rule_registered, true);
  assert.equal(row.local_unmarked_raw_transaction_rejected, true);
  assert.equal(row.raw_public_rpc_disabled, true);
  assert.equal(row.startup_fail_closed_on_plugin_mismatch, true);
  assert.equal(row.market_activation_authorized, false);
  assert.equal(row.migration_authorized, false);
  assert.equal(row.public_activation_authorized, false);
  assert.equal(row.funds_movement_authorized, false);
  assert.match(row.evidence_id, /^voide2ve1_[0-9a-f]{64}$/);
}

const verified =
  verifyVoidEconomicEpoch2ProductionValidatorDomainEnforcementV1({
    binding_candidate: binding,
    raw_domain_policy: rawDomain,
    plugin_artifact_manifest: artifact,
    expected_evidence_ids: rows.map((row) => row.evidence_id),
    evaluation_time_utc: "2030-01-01T00:05:00Z",
    validator_evidence_rows: rows,
  });

assert.equal(verified.ok, true);
assert.equal(
  verified.status,
  "ENFORCEMENT_EVIDENCE_CANDIDATE_VALID_UPSTREAM_RUNTIME_UNVERIFIED",
);
assert.equal(verified.required_live_node_count, 3);
assert.equal(verified.validator_evidence_candidate_count, 3);
assert.equal(
  verified.upstream_runtime_evidence_semantically_verified,
  false,
);
assert.equal(
  verified.all_production_validators_epoch_domain_enforced,
  false,
);
assert.equal(verified.cross_epoch_replay_protection_proven, false);
assert.equal(verified.migration_authorized, false);
assert.equal(verified.public_activation_authorized, false);

{
  const role = "nimo";
  const identity = JSON.parse(
    fs.readFileSync(
      "ops/mainnet0/economic-epoch2-qbft-node-identity-nimo-v1.json",
      "utf8",
    ),
  );
  assert.throws(
    () =>
      buildVoidEconomicEpoch2ProductionValidatorRuntimeEvidenceCandidateV1({
        machineRole: role,
        runtimeResult,
        runtimeResultSha256: runtimeSha,
        facts: factsFor(role, identity.hostname),
        factsSha256: factsSha,
        pluginJarSha256: pluginSha,
        besuLogSha256: logSha,
        observedAtUtc: "2030-01-01T00:00:00Z",
        validUntilUtc: "2030-01-01T00:10:00Z",
        hostName: "wrong-host",
      }),
    /canonical_public_identity_binding_mismatch/,
  );
}
{
  const role = "precision";
  const identity = JSON.parse(
    fs.readFileSync(
      "ops/mainnet0/economic-epoch2-qbft-node-identity-precision-v1.json",
      "utf8",
    ),
  );
  const badFacts = factsFor(role, identity.hostname);
  badFacts.external_p2p_exposure = true;
  assert.throws(
    () =>
      buildVoidEconomicEpoch2ProductionValidatorRuntimeEvidenceCandidateV1({
        machineRole: role,
        runtimeResult,
        runtimeResultSha256: runtimeSha,
        facts: badFacts,
        factsSha256: factsSha,
        pluginJarSha256: pluginSha,
        besuLogSha256: logSha,
        observedAtUtc: "2030-01-01T00:00:00Z",
        validUntilUtc: "2030-01-01T00:10:00Z",
        hostName: identity.hostname,
      }),
    /local_runtime_facts_binding_mismatch/,
  );
}
{
  const role = "xiphos";
  const identity = JSON.parse(
    fs.readFileSync(
      "ops/mainnet0/economic-epoch2-qbft-node-identity-xiphos-v1.json",
      "utf8",
    ),
  );
  assert.throws(
    () =>
      buildVoidEconomicEpoch2ProductionValidatorRuntimeEvidenceCandidateV1({
        machineRole: role,
        runtimeResult,
        runtimeResultSha256: runtimeSha,
        facts: factsFor(role, identity.hostname),
        factsSha256: factsSha,
        pluginJarSha256: pluginSha,
        besuLogSha256: logSha,
        observedAtUtc: "2030-01-01T00:00:00Z",
        validUntilUtc: "2030-01-01T02:00:00Z",
        hostName: identity.hostname,
      }),
    /evidence_time_window_invalid/,
  );
}

const runner = fs.readFileSync(
  "scripts/run_void_economic_epoch2_production_validator_runtime_evidence_v1.sh",
  "utf8",
);
for (const required of [
  'key_work="$(mktemp -d "${TMPDIR:-/tmp}/void-e2-validator-key-${role}.XXXXXX")"',
  'chmod 0700 "$key_work"',
  'install -m 0444 "$key_path" "$staged_key"',
  'cmp -s "$key_path" "$staged_key"',
  'container="void-e2-validator-evidence-${role}-${BASHPID}"',
  "grep -Eo '0x[0-9a-fA-F]{40}'",
  "tr '[:upper:]' '[:lower:]'",
  '-v "$staged_key:/key/nodekey:ro"',
  "--node-private-key-file=/key/nodekey",
  'echo "node_private_key_container_stage=true"',
  'echo "node_private_key_container_stage_parent_mode=700"',
  'echo "node_private_key_container_stage_file_mode=444"',
  'echo "besu_staged_key_address_verified=true"',
  'docker rm -f "$container" >/dev/null 2>&1 || true',
  '-v "$work:/work"',
  "-c 'rm -rf /work/data /work/fail-data'",
  'echo "warning: disposable validator evidence cleanup incomplete" >&2',
  'local status=$?',
  'return "$status"',
  '-p "127.0.0.1:',
  ':8545"',
  "--discovery-enabled=false",
  'echo "node_private_key_content_exported=false"',
  'echo "production_rpc_contact=false"',
  "startup_fail_closed_on_plugin_mismatch:true",
  "external_p2p_exposure:false",
]) {
  assert.ok(runner.includes(required), required);
}
for (const forbidden of [
  'cat "$key_path"',
  'chmod 0444 "$key_path"',
  'chmod 0644 "$key_path"',
  'cp "$key_path"',
  "scp ",
  "rsync ",
  "systemctl restart",
  "sudo ",
]) {
  assert.equal(runner.includes(forbidden), false, forbidden);
}

console.log(
  "VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_RUNTIME_EVIDENCE_CANDIDATE_V1_PROOF_GREEN",
);
console.log("canonical_validator_count=3");
console.log("candidate_rows_compose=3");
console.log("candidate_rows_contract_valid=true");
console.log("canonical_hostname_binding_required=true");
console.log("local_node_key_binding_required=true");
console.log("node_private_key_content_exported=false");
console.log("raw_public_rpc_disabled=true");
console.log("external_p2p_exposure=false");
console.log("startup_fail_closed_on_plugin_mismatch=true");
console.log("production_rpc_contact=false");
console.log("authoritative_chain2050_write=false");
console.log("all_production_validators_epoch_domain_enforced=false");
console.log("cross_epoch_replay_protection_proven=false");
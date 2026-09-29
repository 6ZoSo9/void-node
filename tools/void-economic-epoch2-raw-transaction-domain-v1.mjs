#!/usr/bin/env node
import crypto from "node:crypto";

export const VOID_ECONOMIC_EPOCH2_RAW_TRANSACTION_DOMAIN_V1 =
  "VOID_ECONOMIC_EPOCH2_RAW_TRANSACTION_DOMAIN_V1";

export const VOID_ECONOMIC_EPOCH2_RAW_TRANSACTION_DOMAIN_POLICY_V1 =
  Object.freeze({
    chain_id: 2050n,
    execution_epoch: 2,
    transaction_type: 2,
    domain_material:
      "VOID:EPOCH2:RAW_TX_DOMAIN:V1|chain_id=2050|execution_epoch=2|source_final_block_hash=0x739679fd9f9b6f96213c440350980a1b590324c9152b7c394c81ce3627c94f52|migration_manifest_material_sha256=7793624324ce6b171f43c1f8089af7edfbbc8c5144eefe911688128600847572",
    marker_address: "0x0000000000000000000000000000000000002050",
    marker_storage_key:
      "0xde7f074f5f127e9918248d0d3643786cb0a4de66256d2c40bb26beafa63c73b7",
  });

function sha256(value) {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function hold(reason) {
  return Object.freeze({
    ok: false,
    status: "HOLD",
    reason,
    raw_transaction_epoch_domain_defined: true,
    raw_transaction_epoch_domain_source_proven: true,
    besu_transaction_validation_rule_implemented: true,
    besu_transaction_validation_rule_source_tested: true,
    besu_transaction_validation_rule_runtime_proven: false,
    cross_epoch_replay_protection_proven: false,
    migration_authorized: false,
    public_activation_authorized: false,
  });
}

function normalizeHex(value) {
  return typeof value === "string" ? value.toLowerCase() : "";
}

export function classifyVoidEconomicEpoch2RawTransactionDomainV1(transaction) {
  if (!transaction || typeof transaction !== "object") {
    return hold("transaction_object_required");
  }

  let chainId;
  try {
    chainId = BigInt(transaction.chainId);
  } catch {
    return hold("chain_id_invalid");
  }
  if (chainId !== VOID_ECONOMIC_EPOCH2_RAW_TRANSACTION_DOMAIN_POLICY_V1.chain_id) {
    return hold("chain_id_mismatch");
  }

  if (
    Number(transaction.type) !==
    VOID_ECONOMIC_EPOCH2_RAW_TRANSACTION_DOMAIN_POLICY_V1.transaction_type
  ) {
    return hold("epoch2_type2_transaction_required");
  }

  if (!Array.isArray(transaction.accessList)) {
    return hold("signed_access_list_required");
  }

  const markerAddress =
    VOID_ECONOMIC_EPOCH2_RAW_TRANSACTION_DOMAIN_POLICY_V1.marker_address;
  const markerKey =
    VOID_ECONOMIC_EPOCH2_RAW_TRANSACTION_DOMAIN_POLICY_V1.marker_storage_key;

  const markerRows = transaction.accessList.filter(
    (entry) => normalizeHex(entry?.address) === markerAddress,
  );
  if (markerRows.length !== 1) {
    return hold("epoch2_marker_entry_count_invalid");
  }

  const storageKeys = markerRows[0]?.storageKeys;
  if (
    !Array.isArray(storageKeys) ||
    storageKeys.length !== 1 ||
    normalizeHex(storageKeys[0]) !== markerKey
  ) {
    return hold("epoch2_marker_storage_key_invalid");
  }

  return Object.freeze({
    ok: true,
    status: "SOURCE_RAW_TRANSACTION_EPOCH_DOMAIN_VALID",
    chain_id: 2050,
    execution_epoch: 2,
    transaction_type: 2,
    marker_address: markerAddress,
    marker_storage_key: markerKey,
    raw_transaction_epoch_domain_defined: true,
    raw_transaction_epoch_domain_source_proven: true,
    besu_transaction_validation_rule_implemented: true,
    besu_transaction_validation_rule_source_tested: true,
    besu_transaction_validation_rule_runtime_proven: false,
    all_production_validators_epoch_domain_enforced: false,
    cross_epoch_replay_protection_proven: false,
    migration_authorized: false,
    public_activation_authorized: false,
  });
}

export function verifyVoidEconomicEpoch2RawTransactionDomainPolicyV1(policy) {
  if (
    !policy ||
    policy.marker !== VOID_ECONOMIC_EPOCH2_RAW_TRANSACTION_DOMAIN_V1 ||
    policy.version !== 1 ||
    policy.status !==
      "SOURCE_RAW_TRANSACTION_DOMAIN_AND_BESU_VALIDATOR_IMPLEMENTED_RUNTIME_HOLD"
  ) {
    throw new Error("raw_transaction_domain_policy_identity_invalid");
  }

  if (policy.domain_material !== VOID_ECONOMIC_EPOCH2_RAW_TRANSACTION_DOMAIN_POLICY_V1.domain_material) {
    throw new Error("raw_transaction_domain_material_mismatch");
  }
  if (sha256(policy.domain_material) !== policy.domain_material_sha256) {
    throw new Error("raw_transaction_domain_material_sha256_mismatch");
  }
  if (
    "0x" + policy.domain_material_sha256 !==
    VOID_ECONOMIC_EPOCH2_RAW_TRANSACTION_DOMAIN_POLICY_V1.marker_storage_key
  ) {
    throw new Error("raw_transaction_domain_marker_key_mismatch");
  }
  if (
    normalizeHex(policy.signed_access_list_marker?.address) !==
      VOID_ECONOMIC_EPOCH2_RAW_TRANSACTION_DOMAIN_POLICY_V1.marker_address ||
    normalizeHex(policy.signed_access_list_marker?.storage_key) !==
      VOID_ECONOMIC_EPOCH2_RAW_TRANSACTION_DOMAIN_POLICY_V1.marker_storage_key
  ) {
    throw new Error("raw_transaction_domain_marker_binding_invalid");
  }

  if (
    policy.source_binding?.source_final_block_number !== "37392" ||
    policy.source_binding?.source_final_block_hash !==
      "0x739679fd9f9b6f96213c440350980a1b590324c9152b7c394c81ce3627c94f52" ||
    policy.source_binding?.migration_manifest_material_sha256 !==
      "7793624324ce6b171f43c1f8089af7edfbbc8c5144eefe911688128600847572" ||
    policy.source_binding?.marker_selected_after_epoch1_write_freeze !== true
  ) {
    throw new Error("raw_transaction_domain_source_binding_invalid");
  }

  if (
    policy.source_proof?.type2_required !== true ||
    policy.source_proof?.chain2050_required !== true ||
    policy.source_proof?.exact_marker_required !== true ||
    policy.source_proof?.legacy_type0_rejected !== true ||
    policy.source_proof?.access_list_transaction_without_marker_rejected !== true ||
    policy.source_proof?.wrong_marker_rejected !== true ||
    policy.source_proof?.marker_changes_signing_digest !== true
  ) {
    throw new Error("raw_transaction_domain_source_proof_contract_invalid");
  }

  if (
    policy.besu_validation_boundary?.selected_client !== "Besu" ||
    policy.besu_validation_boundary?.selected_client_version !== "26.8.1" ||
    policy.besu_validation_boundary?.transaction_validator_service_required !== true ||
    policy.besu_validation_boundary?.transaction_validation_rule_required_on_every_production_validator !== true ||
    policy.besu_validation_boundary?.raw_public_rpc_must_remain_disabled !== true ||
    policy.besu_validation_boundary?.plugin_artifact_content_addressing_required !== true ||
    policy.besu_validation_boundary?.plugin_startup_fail_closed_required !== true ||
    policy.besu_validation_boundary?.plugin_module_path !==
      "besu-plugins/epoch2-raw-transaction-domain-v1" ||
    policy.besu_validation_boundary?.plugin_source_path !==
      "besu-plugins/epoch2-raw-transaction-domain-v1/src/main/java/org/voidnetwork/besu/epoch2/VoidEpoch2RawTransactionDomainPlugin.java" ||
    policy.besu_validation_boundary?.plugin_service_provider_path !==
      "besu-plugins/epoch2-raw-transaction-domain-v1/src/main/resources/META-INF/services/org.hyperledger.besu.plugin.BesuPlugin" ||
    policy.besu_validation_boundary?.plugin_build_file !==
      "besu-plugins/epoch2-raw-transaction-domain-v1/pom.xml" ||
    policy.besu_validation_boundary?.plugin_api_coordinate !==
      "org.hyperledger.besu:besu-plugin-api:26.8.1" ||
    policy.besu_validation_boundary?.plugin_java_release !== 25 ||
    policy.besu_validation_boundary?.plugin_source_evidence !==
      "ops/mainnet0/economic-epoch2-besu-raw-transaction-validator-plugin-v1.json" ||
    policy.besu_validation_boundary?.plugin_source_compilation_required !== true ||
    policy.besu_validation_boundary?.plugin_unit_tests_required !== true ||
    policy.besu_validation_boundary?.plugin_runtime_proven !== false ||
    policy.besu_validation_boundary?.all_production_validators_enforce_rule !== false
  ) {
    throw new Error("raw_transaction_domain_besu_boundary_invalid");
  }

  for (const gate of [
    "raw_transaction_epoch_domain_defined",
    "raw_transaction_epoch_domain_source_proven",
    "besu_transaction_validation_rule_implemented",
    "besu_transaction_validation_rule_source_tested",
  ]) {
    if (policy.gates?.[gate] !== true) {
      throw new Error("raw_transaction_domain_source_gate_missing:" + gate);
    }
  }
  for (const gate of [
    "besu_transaction_validation_rule_runtime_proven",
    "all_production_validators_epoch_domain_enforced",
    "cross_epoch_replay_protection_proven",
    "migration_authorized",
    "public_activation_authorized",
  ]) {
    if (policy.gates?.[gate] !== false) {
      throw new Error("raw_transaction_domain_hold_gate_premature:" + gate);
    }
  }

  if (policy.authority?.source_only !== true) {
    throw new Error("raw_transaction_domain_source_only_required");
  }
  for (const [key, value] of Object.entries(policy.authority || {})) {
    if (key === "source_only") continue;
    if (value !== false) {
      throw new Error("raw_transaction_domain_authority_must_remain_false:" + key);
    }
  }

  return Object.freeze({
    ok: true,
    status: "SOURCE_RAW_TRANSACTION_DOMAIN_POLICY_GREEN",
    raw_transaction_epoch_domain_defined: true,
    raw_transaction_epoch_domain_source_proven: true,
    besu_transaction_validation_rule_implemented: true,
    besu_transaction_validation_rule_source_tested: true,
    cross_epoch_replay_protection_proven: false,
    migration_authorized: false,
    public_activation_authorized: false,
  });
}

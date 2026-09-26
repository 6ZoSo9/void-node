#!/usr/bin/env node
// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const VOID_ECONOMIC_EPOCH2_BESU_GENESIS_BUILDER_V1 =
  "VOID_ECONOMIC_EPOCH2_BESU_GENESIS_BUILDER_V1";
export const VOID_ECONOMIC_EPOCH2_BESU_GENESIS_BUILDER_CONFIRMATION_V1 =
  "buildEpoch2BesuGenesisCandidate";

const EXPECTED_STATE_MANIFEST_FILE_SHA256 =
  "affe08799c73320c6fc4efe4a91772cc1c64f6a3ff6e75c2698ea87d27e306d9";
const EXPECTED_STATE_MANIFEST_MATERIAL_SHA256 =
  "286034e3adb1654c13899b959075fcfa2504a6942c83ec52febb156bd0ea2a4f";
const EXPECTED_BESU_REPO_DIGEST =
  "hyperledger/besu@sha256:6f3f21ce533383fcc8db3bce02252b59d5a9e776b72b5a1c8ecd2db011600042";
const EXPECTED_BESU_IMAGE_ID =
  "sha256:f3713c713ca4f9e89c09e1478d2a85116ba9ce8343129d709420ba2af009598b";
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const QBFT_MIX_HASH =
  "0x63746963616c2062797a616e74696e65206661756c7420746f6c6572616e6365";

export const VOID_ECONOMIC_EPOCH2_BESU_GENESIS_BUILDER_AUTHORITY_V1 =
  Object.freeze({
    local_input_read: true,
    local_output_write: true,
    source_only_transformation: true,
    rpc_call: false,
    process_start: false,
    docker_action: false,
    wallet_access: false,
    private_key_access: false,
    credential_content_access: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_submission: false,
    transaction_broadcast: false,
    chain2050_write: false,
    token_movement: false,
    funds_movement: false,
    contract_deployment_transaction: false,
    public_activation: false,
  });

export class VoidEconomicEpoch2BesuGenesisBuilderHoldV1 extends Error {
  constructor(reason, detail = null) {
    super(reason);
    this.name = "VoidEconomicEpoch2BesuGenesisBuilderHoldV1";
    this.reason = reason;
    this.detail = detail;
  }
}

function hold(reason, detail = null) {
  throw new VoidEconomicEpoch2BesuGenesisBuilderHoldV1(reason, detail);
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function canonicalSha256(value) {
  return sha256(Buffer.from(canonical(value), "utf8"));
}

function lowerAddress(value, reason = "address_invalid") {
  const text = String(value || "").toLowerCase();
  if (!/^0x[0-9a-f]{40}$/.test(text)) hold(reason, { value: text });
  return text;
}

function exactWord(value, reason = "word_invalid") {
  const text = String(value || "").toLowerCase();
  const hex = text.startsWith("0x") ? text.slice(2) : text;
  if (!/^[0-9a-f]{1,64}$/.test(hex)) hold(reason, { value: text });
  return `0x${hex.padStart(64, "0")}`;
}

function exactCode(value, reason = "runtime_code_invalid") {
  const text = String(value || "").toLowerCase();
  if (!/^0x(?:[0-9a-f]{2})+$/.test(text)) hold(reason);
  return text;
}

function readJson(file) {
  const raw = fs.readFileSync(file);
  let value;
  try {
    value = JSON.parse(raw.toString("utf8"));
  } catch {
    hold("json_parse_failed", { file });
  }
  return { raw, value };
}

function validateCandidate(candidate) {
  if (
    candidate?.marker !==
      "VOID_ECONOMIC_EPOCH2_PRODUCTION_CLIENT_CANDIDATE_V1" ||
    candidate?.status !== "CANDIDATE_RUNTIME_PROBE_GREEN_GENESIS_PENDING" ||
    candidate?.client?.name !== "Besu" ||
    candidate?.client?.version !== "26.8.1" ||
    candidate?.client?.docker_image !== "hyperledger/besu:26.8.1" ||
    candidate?.client?.docker_image_digest_sha256 !==
      EXPECTED_BESU_REPO_DIGEST.split("sha256:")[1] ||
    candidate?.client?.docker_image_id_sha256 !==
      EXPECTED_BESU_IMAGE_ID.slice("sha256:".length)
  ) {
    hold("besu_candidate_identity_mismatch");
  }
  if (
    candidate?.consensus?.engine !== "QBFT" ||
    candidate?.consensus?.production_validator_set_bound !== false ||
    candidate?.consensus?.placeholder_private_keys_exist !== false ||
    candidate?.consensus?.placeholder_validator_authority !== false ||
    candidate?.consensus?.placeholder_validator_set_must_not_ship_to_production !==
      true
  ) {
    hold("besu_candidate_consensus_boundary_mismatch");
  }
  for (const key of [
    "docker_digest_pinned",
    "besu_version_verified",
    "qbft_extra_data_verified",
    "free_gas_cli_surface_verified",
  ]) {
    if (candidate.gates?.[key] !== true) hold("besu_candidate_gate_missing", { key });
  }
  for (const key of [
    "client_specific_genesis_built",
    "client_specific_state_equivalence_proven",
    "production_validator_set_bound",
    "offline_successor_equivalence_proven",
    "migration_authorized",
    "public_activation_authorized",
  ]) {
    if (candidate.gates?.[key] !== false) {
      hold("besu_candidate_gate_premature", { key });
    }
  }
}

function validateStateManifest(state) {
  if (
    state?.marker !== "VOID_ECONOMIC_EPOCH2_CLIENT_NEUTRAL_STATE_MANIFEST_V1" ||
    state?.status !== "CLIENT_NEUTRAL_STATE_MANIFEST_GREEN" ||
    state?.manifest_material_sha256 !==
      EXPECTED_STATE_MANIFEST_MATERIAL_SHA256 ||
    state?.chain_id !== 2050 ||
    state?.execution_epoch !== 2 ||
    !Array.isArray(state?.accounts) ||
    state.accounts.length !== 4
  ) {
    hold("client_neutral_state_manifest_identity_mismatch");
  }
  if (
    state?.token_state?.total_supply_atoms !==
      "333333333000000000000000000" ||
    state?.token_state?.holder_sum_atoms !==
      "333333333000000000000000000" ||
    state?.staking_state?.storage_entry_count !== 1264 ||
    state?.gates?.isolated_successor_state_equivalence_proven === false
  ) {
    // The manifest predates the isolated rehearsal, so its own gate is expected
    // to remain false. The content itself is what is transformed here.
  }
}

function storageToBesu(entries) {
  const out = {};
  let inputCount = 0;
  let nonzeroCount = 0;
  for (const entry of entries || []) {
    inputCount += 1;
    const slot = exactWord(entry?.slot, "storage_slot_invalid");
    const value = exactWord(entry?.value, "storage_value_invalid");
    if (BigInt(value) === 0n) continue;
    nonzeroCount += 1;
    const key = slot.slice(2);
    const encoded = value.slice(2);
    if (Object.prototype.hasOwnProperty.call(out, key)) {
      hold("duplicate_nonzero_storage_slot", { slot });
    }
    out[key] = encoded;
  }
  return Object.freeze({
    storage: Object.freeze(out),
    input_count: inputCount,
    nonzero_count: nonzeroCount,
  });
}

export function buildVoidEconomicEpoch2BesuGenesisV1({
  stateManifest,
  clientCandidate,
}) {
  validateCandidate(clientCandidate);
  validateStateManifest(stateManifest);

  const alloc = {};
  let totalStorageEntries = 0;
  let totalNonzeroStorageEntries = 0;
  for (const account of stateManifest.accounts) {
    const address = lowerAddress(account.address);
    if (Object.prototype.hasOwnProperty.call(alloc, address)) {
      hold("duplicate_alloc_address", { address });
    }
    const runtimeCode = exactCode(account.runtime_code_hex);
    const converted = storageToBesu(account.storage_entries);
    totalStorageEntries += converted.input_count;
    totalNonzeroStorageEntries += converted.nonzero_count;
    alloc[address] = {
      balance: "0x0",
      code: runtimeCode,
      ...(converted.nonzero_count > 0
        ? { storage: converted.storage }
        : {}),
    };
  }

  if (Object.keys(alloc).length !== 4) hold("alloc_account_count_mismatch");
  if (totalStorageEntries !== 1268) {
    hold("alloc_input_storage_count_mismatch", {
      observed: totalStorageEntries,
    });
  }
  if (totalNonzeroStorageEntries !== 1014) {
    hold("alloc_nonzero_storage_count_mismatch", {
      observed: totalNonzeroStorageEntries,
    });
  }

  const profile = clientCandidate.genesis_profile;
  const consensus = clientCandidate.consensus;

  const genesis = {
    config: {
      chainId: 2050,
      berlinBlock: 0,
      londonBlock: 0,
      zeroBaseFee: true,
      contractSizeLimit: profile.contract_size_limit,
      qbft: {
        blockperiodseconds: consensus.block_period_seconds,
        epochlength: consensus.epoch_length,
        requesttimeoutseconds: consensus.request_timeout_seconds,
      },
    },
    nonce: "0x0",
    timestamp: "0x0",
    extraData: consensus.offline_placeholder_qbft_extra_data,
    gasLimit: profile.gas_limit,
    baseFeePerGas: "0x0",
    difficulty: "0x1",
    mixHash: QBFT_MIX_HASH,
    coinbase: ZERO_ADDRESS,
    alloc,
    number: "0x0",
    gasUsed: "0x0",
    parentHash:
      "0x0000000000000000000000000000000000000000000000000000000000000000",
  };

  const evidenceMaterial = {
    marker: VOID_ECONOMIC_EPOCH2_BESU_GENESIS_BUILDER_V1,
    version: 1,
    status: "BESU_GENESIS_CANDIDATE_BUILT",
    client: {
      name: "Besu",
      version: "26.8.1",
      docker_repo_digest: EXPECTED_BESU_REPO_DIGEST,
      docker_image_id: EXPECTED_BESU_IMAGE_ID,
    },
    consensus: {
      engine: "QBFT",
      placeholder_validator_set:
        consensus.placeholder_validator_set_for_offline_genesis_proof_only,
      placeholder_extra_data:
        consensus.offline_placeholder_qbft_extra_data,
      production_validator_set_bound: false,
      placeholder_validator_authority: false,
    },
    free_gas: {
      zero_base_fee: true,
      base_fee_per_gas: "0x0",
      min_gas_price_runtime_required: "0",
      tx_pool_enable_balance_check_runtime_required: false,
      participant_native_gas_balance_required: false,
    },
    state: {
      source_manifest_material_sha256:
        stateManifest.manifest_material_sha256,
      alloc_account_count: Object.keys(alloc).length,
      input_storage_entry_count: totalStorageEntries,
      nonzero_genesis_storage_entry_count:
        totalNonzeroStorageEntries,
      native_prefunded_account_count: 0,
    },
    gates: {
      client_specific_genesis_candidate_built: true,
      besu_genesis_parse_verified: false,
      client_specific_state_equivalence_proven: false,
      production_validator_set_bound: false,
      offline_successor_equivalence_proven: false,
      migration_authorized: false,
      public_activation_authorized: false,
    },
    authority: VOID_ECONOMIC_EPOCH2_BESU_GENESIS_BUILDER_AUTHORITY_V1,
  };

  return Object.freeze({
    genesis: Object.freeze(genesis),
    evidence: Object.freeze({
      ...evidenceMaterial,
      genesis_material_sha256: canonicalSha256(genesis),
      evidence_material_sha256: canonicalSha256(evidenceMaterial),
    }),
  });
}

function parseArgs(argv) {
  const args = { apply: false, confirmation: "" };
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    if (key === "--state-manifest") {
      if (!argv[i + 1]) hold("state_manifest_path_missing");
      args.state_manifest = argv[++i];
    } else if (key === "--out-genesis") {
      if (!argv[i + 1]) hold("output_genesis_path_missing");
      args.out_genesis = argv[++i];
    } else if (key === "--out-evidence") {
      if (!argv[i + 1]) hold("output_evidence_path_missing");
      args.out_evidence = argv[++i];
    } else if (key === "--apply") {
      args.apply = true;
    } else if (key === "--confirmation") {
      if (!argv[i + 1]) hold("confirmation_value_missing");
      args.confirmation = argv[++i];
    } else if (key === "--help") {
      args.help = true;
    } else {
      hold(`unknown_argument:${key}`);
    }
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(
      "Usage: node tools/void-economic-epoch2-besu-genesis-builder-v1.mjs --state-manifest FILE --out-genesis FILE --out-evidence FILE --apply --confirmation buildEpoch2BesuGenesisCandidate\n",
    );
    return;
  }

  const candidate = readJson(
    "ops/mainnet0/economic-epoch2-production-client-candidate-v1.json",
  ).value;

  if (!args.apply) {
    process.stdout.write(
      JSON.stringify(
        {
          marker: VOID_ECONOMIC_EPOCH2_BESU_GENESIS_BUILDER_V1,
          status: "PLAN_READY",
          required_confirmation:
            VOID_ECONOMIC_EPOCH2_BESU_GENESIS_BUILDER_CONFIRMATION_V1,
          state_manifest_required: true,
          output_genesis_required: true,
          output_evidence_required: true,
          production_validator_set_bound: false,
          authority: VOID_ECONOMIC_EPOCH2_BESU_GENESIS_BUILDER_AUTHORITY_V1,
        },
        null,
        2,
      ) + "\n",
    );
    return;
  }

  if (
    args.confirmation !==
    VOID_ECONOMIC_EPOCH2_BESU_GENESIS_BUILDER_CONFIRMATION_V1
  ) {
    hold("explicit_confirmation_required");
  }
  if (!args.state_manifest || !args.out_genesis || !args.out_evidence) {
    hold("required_path_missing");
  }

  const state = readJson(path.resolve(args.state_manifest));
  if (sha256(state.raw) !== EXPECTED_STATE_MANIFEST_FILE_SHA256) {
    hold("client_neutral_state_manifest_file_sha256_mismatch");
  }

  const built = buildVoidEconomicEpoch2BesuGenesisV1({
    stateManifest: state.value,
    clientCandidate: candidate,
  });

  const genesisRaw = Buffer.from(
    JSON.stringify(built.genesis, null, 2) + "\n",
  );
  const evidence = {
    ...built.evidence,
    genesis_file_sha256: sha256(genesisRaw),
  };
  const evidenceRaw = Buffer.from(
    JSON.stringify(evidence, null, 2) + "\n",
  );

  fs.writeFileSync(path.resolve(args.out_genesis), genesisRaw, {
    mode: 0o600,
    flag: "wx",
  });
  fs.writeFileSync(path.resolve(args.out_evidence), evidenceRaw, {
    mode: 0o600,
    flag: "wx",
  });

  process.stdout.write(
    JSON.stringify(
      {
        marker: VOID_ECONOMIC_EPOCH2_BESU_GENESIS_BUILDER_V1,
        status: evidence.status,
        genesis_path: path.resolve(args.out_genesis),
        evidence_path: path.resolve(args.out_evidence),
        genesis_file_sha256: evidence.genesis_file_sha256,
        genesis_material_sha256: evidence.genesis_material_sha256,
        alloc_account_count: evidence.state.alloc_account_count,
        input_storage_entry_count:
          evidence.state.input_storage_entry_count,
        nonzero_genesis_storage_entry_count:
          evidence.state.nonzero_genesis_storage_entry_count,
        production_validator_set_bound: false,
        besu_genesis_parse_verified: false,
        client_specific_state_equivalence_proven: false,
        offline_successor_equivalence_proven: false,
        migration_authorized: false,
        public_activation_authorized: false,
      },
      null,
      2,
    ) + "\n",
  );
}

const invoked = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
  : false;

if (invoked) {
  main().catch((error) => {
    const reason =
      error instanceof VoidEconomicEpoch2BesuGenesisBuilderHoldV1
        ? error.reason
        : String(error?.message || error);
    const detail =
      error instanceof VoidEconomicEpoch2BesuGenesisBuilderHoldV1 &&
      error.detail !== null
        ? ` detail=${JSON.stringify(error.detail)}`
        : "";
    process.stderr.write(
      `VOID_ECONOMIC_EPOCH2_BESU_GENESIS_BUILDER_V1_HOLD reason=${reason}${detail}\n`,
    );
    process.exitCode = 2;
  });
}

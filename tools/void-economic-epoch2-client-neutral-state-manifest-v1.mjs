#!/usr/bin/env node
// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { AbiCoder, keccak256, toBeHex } from "ethers";

export const VOID_ECONOMIC_EPOCH2_CLIENT_NEUTRAL_STATE_MANIFEST_V1 =
  "VOID_ECONOMIC_EPOCH2_CLIENT_NEUTRAL_STATE_MANIFEST_V1";
export const VOID_ECONOMIC_EPOCH2_CLIENT_NEUTRAL_STATE_MANIFEST_CONFIRMATION_V1 =
  "buildEpoch2ClientNeutralStateManifest";

const CHAIN_ID = 2050;
const EXECUTION_EPOCH = 2;
const TOKEN = "0x470075b85352eb86f7d089fb9ba88945f12aad94";
const STAKING = "0x77dfeedd19a4741f299c902ad5bbe0de917a9e59";
const TREASURY = "0x26c501a1edca3614f214face2d9b7be2aa7c864b";
const PRESALE = "0x530bc90ba74f2539a9e484ccb1be9291c3bc35ce";
const OLD_TREASURY = "0x554ecc7be6f0b7cc3d1c578c2bb848e535c02514";
const OLD_PRESALE = "0xa40a43adfd174f88309173cb3daa6e09c10154a7";
const TOTAL_SUPPLY = "333333333000000000000000000";
const TREASURY_BALANCE = "323207333000000000000000000";
const STAKING_BALANCE = "126000000000000000000000";
const PRESALE_BALANCE = "10000000000000000000000000";

const coder = AbiCoder.defaultAbiCoder();

export const VOID_ECONOMIC_EPOCH2_CLIENT_NEUTRAL_STATE_MANIFEST_AUTHORITY_V1 =
  Object.freeze({
    local_input_read: true,
    local_output_write: true,
    rpc_call: false,
    authoritative_chain2050_write: false,
    state_export_from_live_rpc: false,
    genesis_client_selection: false,
    client_specific_genesis_build: false,
    runtime_process_start: false,
    wallet_access: false,
    private_key_access: false,
    credential_content_access: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_broadcast: false,
    token_movement: false,
    funds_movement: false,
    contract_deployment: false,
    public_activation: false,
  });

export class VoidEconomicEpoch2ClientNeutralStateManifestHoldV1 extends Error {
  constructor(reason, detail = null) {
    super(reason);
    this.name = "VoidEconomicEpoch2ClientNeutralStateManifestHoldV1";
    this.reason = reason;
    this.detail = detail;
  }
}

function hold(reason, detail = null) {
  throw new VoidEconomicEpoch2ClientNeutralStateManifestHoldV1(reason, detail);
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

function word256(value) {
  const n = BigInt(value);
  if (n < 0n || n >= (1n << 256n)) hold("word256_out_of_range");
  return toBeHex(n, 32).toLowerCase();
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function sha256HexCode(value, reason = "runtime_hex_invalid") {
  const text = String(value || "").toLowerCase();
  if (!/^0x(?:[0-9a-f]{2})+$/.test(text)) hold(reason);
  const bytes = Buffer.from(text.slice(2), "hex");
  return Object.freeze({
    runtime_bytes: bytes.length,
    runtime_sha256: sha256(bytes),
    runtime_code_hex: text,
  });
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

export function voidEconomicEpoch2TokenBalanceStorageSlotV1(address) {
  return keccak256(
    coder.encode(["address", "uint256"], [lowerAddress(address), 1n]),
  ).toLowerCase();
}

function storageEntriesToMap(entries, reason) {
  if (!Array.isArray(entries)) hold(reason);
  const map = new Map();
  for (const entry of entries) {
    if (!entry || typeof entry !== "object") hold(reason);
    const slot = exactWord(entry.slot, reason);
    const value = exactWord(entry.value, reason);
    const prior = map.get(slot);
    if (prior !== undefined && prior !== value) {
      hold("storage_entry_conflict", { slot, prior, value });
    }
    map.set(slot, value);
  }
  return map;
}

function mapToSortedEntries(map) {
  return [...map.entries()]
    .map(([slot, value]) => Object.freeze({ slot, value }))
    .sort((a, b) => a.slot.localeCompare(b.slot));
}

function verifyRuntimeArtifact(full, compact) {
  if (
    full?.marker !== "VOID_ECONOMIC_EPOCH2_RUNTIME_BYTECODE_MANIFEST_V1" ||
    full?.status !== "COMPILED_RUNTIME_MANIFEST_GREEN"
  ) {
    hold("runtime_artifact_identity_invalid");
  }
  const keys = ["void_token", "treasury_custody", "presale_fulfillment"];
  const verified = {};
  for (const key of keys) {
    const raw = full.runtimes?.[key];
    const expected = compact.runtimes?.[key];
    if (!raw || !expected) hold("runtime_artifact_entry_missing", { key });
    const code = sha256HexCode(raw.runtime_code_hex);
    for (const field of [
      "address",
      "contract",
      "source_path",
      "source_git_blob_sha1",
      "runtime_bytes",
      "runtime_sha256",
    ]) {
      const observed =
        field === "runtime_bytes"
          ? code.runtime_bytes
          : field === "runtime_sha256"
            ? code.runtime_sha256
            : raw[field];
      if (observed !== expected[field]) {
        hold("runtime_artifact_entry_mismatch", {
          key,
          field,
          observed,
          expected: expected[field],
        });
      }
    }
    verified[key] = Object.freeze({
      ...expected,
      runtime_code_hex: code.runtime_code_hex,
    });
  }
  return Object.freeze(verified);
}

function verifyStakingReceipt(receiptRaw, receipt, evidence) {
  if (sha256(receiptRaw) !== evidence.receipt_file_sha256) {
    hold("staking_receipt_file_sha256_mismatch");
  }
  if (
    receipt?.marker !== "VOID_ECONOMIC_EPOCH2_STAKING_STATE_EXPORT_V1" ||
    receipt?.status !== "STAKING_STATE_EXPORT_GREEN" ||
    receipt?.receipt_sha256 !== evidence.receipt_material_sha256
  ) {
    hold("staking_receipt_identity_mismatch");
  }
  const s = receipt.staking;
  const observedState = {
    address: lowerAddress(s?.address),
    runtime_sha256: s?.runtime_sha256,
    runtime_bytes: Number((s?.runtime_code_hex?.length ?? 0) - 2) / 2,
    validator_count: s?.validator_count,
    active_validator_count: s?.active_validator_count,
    stake_sum_atoms: String(s?.stake_sum_atoms),
    unbond_sum_atoms: String(s?.unbond_sum_atoms),
  };
  const expectedState = {
    address: STAKING,
    runtime_sha256: evidence.staking.runtime_sha256,
    runtime_bytes: evidence.staking.runtime_bytes,
    validator_count: 126,
    active_validator_count: 126,
    stake_sum_atoms: evidence.staking.stake_sum_atoms,
    unbond_sum_atoms: "0",
  };
  if (JSON.stringify(observedState) !== JSON.stringify(expectedState)) {
    hold("staking_receipt_state_mismatch", {
      observed: observedState,
      expected: expectedState,
    });
  }
  const storageRaw = Buffer.from(JSON.stringify(s.storage_entries), "utf8");
  const nonzeroRaw = Buffer.from(
    JSON.stringify(s.nonzero_storage_entries),
    "utf8",
  );
  const validatorRaw = Buffer.from(JSON.stringify(s.validators), "utf8");
  if (
    s.storage_entries.length !== evidence.staking.storage_entry_count ||
    s.nonzero_storage_entries.length !==
      evidence.staking.nonzero_storage_entry_count ||
    sha256(storageRaw) !== evidence.staking.storage_manifest_sha256 ||
    sha256(nonzeroRaw) !== evidence.staking.nonzero_storage_manifest_sha256 ||
    sha256(validatorRaw) !== evidence.staking.validator_manifest_sha256
  ) {
    hold("staking_receipt_manifest_hash_mismatch");
  }
  const runtime = sha256HexCode(s.runtime_code_hex, "staking_runtime_hex_invalid");
  if (
    runtime.runtime_bytes !== evidence.staking.runtime_bytes ||
    runtime.runtime_sha256 !== evidence.staking.runtime_sha256
  ) {
    hold("staking_runtime_content_mismatch");
  }
  return Object.freeze({
    ...s,
    runtime_code_hex: runtime.runtime_code_hex,
  });
}

export function buildVoidEconomicEpoch2ClientNeutralStateManifestV1({
  stakingReceipt,
  stakingEvidence,
  runtimeArtifact,
  runtimeCompact,
  destinationManifest,
}) {
  const runtimes = verifyRuntimeArtifact(runtimeArtifact, runtimeCompact);

  const stakingRaw = Buffer.from(JSON.stringify(stakingReceipt), "utf8");
  // The real CLI path verifies the exact file bytes before parsing. Synthetic
  // tests may omit that file-level binding by supplying a matching evidence
  // receipt hash over their serialized fixture.
  const staking = verifyStakingReceipt(
    stakingRaw,
    stakingReceipt,
    stakingEvidence,
  );

  if (
    destinationManifest?.void_token?.successor_runtime_semantic_equivalence_verified !==
      true ||
    destinationManifest?.token_holder_transition?.planned_supply_delta_atoms !==
      "0" ||
    destinationManifest?.token_holder_transition?.live_token_transfer_required !==
      false
  ) {
    hold("destination_manifest_not_ready");
  }

  const tokenStorage = new Map();
  tokenStorage.set(word256(0), word256(TOTAL_SUPPLY));
  for (const [address, balance] of [
    [TREASURY, TREASURY_BALANCE],
    [STAKING, STAKING_BALANCE],
    [PRESALE, PRESALE_BALANCE],
  ]) {
    tokenStorage.set(
      voidEconomicEpoch2TokenBalanceStorageSlotV1(address),
      word256(balance),
    );
  }

  const stakingStorage = storageEntriesToMap(
    staking.storage_entries,
    "staking_storage_entries_invalid",
  );

  const accounts = [
    Object.freeze({
      address: TOKEN,
      label: "VoidEpoch2TokenV1",
      disposition: "CANONICAL_SAME_ADDRESS_REBUILT_RUNTIME",
      runtime_code_hex: runtimes.void_token.runtime_code_hex,
      runtime_sha256: runtimes.void_token.runtime_sha256,
      storage_entries: Object.freeze(mapToSortedEntries(tokenStorage)),
      expected_void_balance_atoms: null,
    }),
    Object.freeze({
      address: STAKING,
      label: "ValidatorStakingV2",
      disposition: "PRESERVE_EXACT_ADDRESS_RUNTIME_STORAGE",
      runtime_code_hex: staking.runtime_code_hex,
      runtime_sha256: staking.runtime_sha256,
      storage_entries: Object.freeze(mapToSortedEntries(stakingStorage)),
      expected_void_balance_atoms: STAKING_BALANCE,
    }),
    Object.freeze({
      address: TREASURY,
      label: "VoidEpoch2TreasuryCustodyV1",
      disposition: "NEW_FIXED_GENESIS_PREDEPLOY",
      runtime_code_hex: runtimes.treasury_custody.runtime_code_hex,
      runtime_sha256: runtimes.treasury_custody.runtime_sha256,
      storage_entries: Object.freeze([]),
      expected_void_balance_atoms: TREASURY_BALANCE,
    }),
    Object.freeze({
      address: PRESALE,
      label: "VoidEpoch2PresaleFulfillmentV1",
      disposition: "NEW_FIXED_GENESIS_PREDEPLOY",
      runtime_code_hex: runtimes.presale_fulfillment.runtime_code_hex,
      runtime_sha256: runtimes.presale_fulfillment.runtime_sha256,
      storage_entries: Object.freeze([]),
      expected_void_balance_atoms: PRESALE_BALANCE,
    }),
  ].sort((a, b) => a.address.localeCompare(b.address));

  const successorHolders = [
    { address: TREASURY, balance_atoms: TREASURY_BALANCE },
    { address: STAKING, balance_atoms: STAKING_BALANCE },
    { address: PRESALE, balance_atoms: PRESALE_BALANCE },
  ].sort((a, b) => a.address.localeCompare(b.address));

  const holderSum = successorHolders.reduce(
    (sum, row) => sum + BigInt(row.balance_atoms),
    0n,
  );
  if (holderSum.toString() !== TOTAL_SUPPLY) {
    hold("successor_holder_sum_mismatch");
  }

  const tokenAccount = accounts.find((row) => row.address === TOKEN);
  const tokenStorageMap = storageEntriesToMap(
    tokenAccount.storage_entries,
    "token_storage_invalid",
  );
  if (BigInt(tokenStorageMap.get(word256(0)) || "0x0").toString() !== TOTAL_SUPPLY) {
    hold("token_total_supply_storage_mismatch");
  }
  for (const row of successorHolders) {
    const slot = voidEconomicEpoch2TokenBalanceStorageSlotV1(row.address);
    if (
      BigInt(tokenStorageMap.get(slot) || "0x0").toString() !==
      row.balance_atoms
    ) {
      hold("token_balance_storage_mismatch", { address: row.address });
    }
  }
  for (const retired of [OLD_TREASURY, OLD_PRESALE]) {
    const slot = voidEconomicEpoch2TokenBalanceStorageSlotV1(retired);
    if (BigInt(tokenStorageMap.get(slot) || "0x0") !== 0n) {
      hold("retired_holder_balance_nonzero", { address: retired });
    }
  }

  const material = {
    marker: VOID_ECONOMIC_EPOCH2_CLIENT_NEUTRAL_STATE_MANIFEST_V1,
    version: 1,
    status: "CLIENT_NEUTRAL_STATE_MANIFEST_GREEN",
    chain_id: CHAIN_ID,
    execution_epoch: EXECUTION_EPOCH,
    source_epoch1: {
      block_number: "37392",
      block_hash:
        "0x739679fd9f9b6f96213c440350980a1b590324c9152b7c394c81ce3627c94f52",
      checkpoint_id_sha256:
        "c251d3d92a0f3729f008fb7911243da0e4e2939af73f98fab2234a050c95a906",
      state_sha256:
        "94b25d36990d32616a7328f5419f5075fee757c15a955617c79ef30497a14505",
    },
    token_state: {
      total_supply_atoms: TOTAL_SUPPLY,
      source_nonzero_holder_count: 3,
      successor_nonzero_holder_count: 3,
      successor_holders: successorHolders,
      holder_sum_atoms: holderSum.toString(),
      migration_supply_delta_atoms: "0",
      allowances_nonzero_count: 0,
      retired_source_balances: [
        { address: OLD_TREASURY, expected_atoms: "0" },
        { address: OLD_PRESALE, expected_atoms: "0" },
      ],
    },
    staking_state: {
      exact_address_runtime_storage_preserved: true,
      validator_count: staking.validator_count,
      active_validator_count: staking.active_validator_count,
      stake_sum_atoms: staking.stake_sum_atoms,
      unbond_sum_atoms: staking.unbond_sum_atoms,
      storage_entry_count: staking.storage_entries.length,
      storage_manifest_sha256: stakingEvidence.staking.storage_manifest_sha256,
      validator_manifest_sha256: stakingEvidence.staking.validator_manifest_sha256,
    },
    presale_state: {
      total_fulfilled_atoms: "0",
      remaining_inventory_atoms: PRESALE_BALANCE,
      max_inventory_atoms: PRESALE_BALANCE,
      open_fulfillment_liability_atoms: "0",
    },
    treasury_state: {
      reserve_atoms: TREASURY_BALANCE,
      third_party_claim_state: "none_proven_at_final_snapshot",
    },
    accounts,
    excluded_from_client_neutral_manifest: {
      native_gas_accounting: true,
      consensus_or_client_genesis_fields: true,
      execution_fee_model: true,
      replay_fence_configuration: true,
      public_gateway_configuration: true,
    },
    gates: {
      token_behavioral_semantic_equivalence: true,
      token_balance_storage_equivalence_planned: true,
      token_supply_storage_equivalence_planned: true,
      staking_exact_state_bound: true,
      offline_successor_equivalence_proven: false,
      client_specific_genesis_built: false,
      migration_authorized: false,
      public_activation_authorized: false,
    },
    authority: VOID_ECONOMIC_EPOCH2_CLIENT_NEUTRAL_STATE_MANIFEST_AUTHORITY_V1,
  };

  return Object.freeze({
    ...material,
    manifest_material_sha256: canonicalSha256(material),
  });
}

function parseArgs(argv) {
  const out = { apply: false, confirmation: "" };
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    if (key === "--apply") out.apply = true;
    else if (key === "--confirmation") {
      if (!argv[i + 1]) hold("confirmation_value_missing");
      out.confirmation = argv[++i];
    } else if (key === "--staking-receipt") {
      if (!argv[i + 1]) hold("staking_receipt_path_missing");
      out.staking_receipt = argv[++i];
    } else if (key === "--runtime-artifact") {
      if (!argv[i + 1]) hold("runtime_artifact_path_missing");
      out.runtime_artifact = argv[++i];
    } else if (key === "--out") {
      if (!argv[i + 1]) hold("output_path_missing");
      out.output = argv[++i];
    } else if (key === "--help") out.help = true;
    else hold(`unknown_argument:${key}`);
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(
      "Usage: node tools/void-economic-epoch2-client-neutral-state-manifest-v1.mjs --staking-receipt FILE --runtime-artifact FILE --out FILE --apply --confirmation buildEpoch2ClientNeutralStateManifest\n",
    );
    return;
  }

  const compactRuntime = readJson(
    "ops/mainnet0/economic-epoch2-runtime-bytecode-manifest-v1.json",
  ).value;
  const stakingEvidence = readJson(
    "ops/mainnet0/economic-epoch2-staking-state-export-evidence-v1.json",
  ).value;
  const destinationManifest = readJson(
    "ops/mainnet0/economic-epoch2-contract-holder-destination-manifest-v1.json",
  ).value;

  if (args.apply !== true) {
    process.stdout.write(
      JSON.stringify(
        {
          marker: VOID_ECONOMIC_EPOCH2_CLIENT_NEUTRAL_STATE_MANIFEST_V1,
          status: "PLAN_READY",
          required_confirmation:
            VOID_ECONOMIC_EPOCH2_CLIENT_NEUTRAL_STATE_MANIFEST_CONFIRMATION_V1,
          staking_receipt_required: true,
          runtime_artifact_required: true,
          client_specific_genesis_build: false,
          authority:
            VOID_ECONOMIC_EPOCH2_CLIENT_NEUTRAL_STATE_MANIFEST_AUTHORITY_V1,
        },
        null,
        2,
      ) + "\n",
    );
    return;
  }

  if (
    args.confirmation !==
    VOID_ECONOMIC_EPOCH2_CLIENT_NEUTRAL_STATE_MANIFEST_CONFIRMATION_V1
  ) {
    hold("explicit_confirmation_required");
  }
  if (!args.staking_receipt || !args.runtime_artifact || !args.output) {
    hold("required_input_path_missing");
  }

  const staking = readJson(path.resolve(args.staking_receipt));
  if (sha256(staking.raw) !== stakingEvidence.receipt_file_sha256) {
    hold("staking_receipt_file_sha256_mismatch");
  }
  const runtime = readJson(path.resolve(args.runtime_artifact));

  const built = buildVoidEconomicEpoch2ClientNeutralStateManifestV1({
    stakingReceipt: staking.value,
    stakingEvidence: {
      ...stakingEvidence,
      receipt_file_sha256: sha256(
        Buffer.from(JSON.stringify(staking.value), "utf8"),
      ),
    },
    runtimeArtifact: runtime.value,
    runtimeCompact: compactRuntime,
    destinationManifest,
  });

  // Re-verify against the original exact staking file bytes after the pure
  // builder returns. The pure builder's synthetic-friendly serialization path
  // does not replace this CLI-level exact-file binding.
  if (sha256(staking.raw) !== stakingEvidence.receipt_file_sha256) {
    hold("staking_receipt_file_sha256_postbuild_mismatch");
  }

  const outPath = path.resolve(args.output);
  fs.writeFileSync(outPath, JSON.stringify(built, null, 2) + "\n", {
    mode: 0o600,
    flag: "wx",
  });
  process.stdout.write(
    JSON.stringify(
      {
        marker: VOID_ECONOMIC_EPOCH2_CLIENT_NEUTRAL_STATE_MANIFEST_V1,
        status: built.status,
        output_path: outPath,
        manifest_material_sha256: built.manifest_material_sha256,
        account_count: built.accounts.length,
        token_holder_sum_atoms: built.token_state.holder_sum_atoms,
        staking_storage_entry_count:
          built.staking_state.storage_entry_count,
        client_specific_genesis_built: false,
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
      error instanceof VoidEconomicEpoch2ClientNeutralStateManifestHoldV1
        ? error.reason
        : String(error?.message || error);
    const detail =
      error instanceof VoidEconomicEpoch2ClientNeutralStateManifestHoldV1 &&
      error.detail !== null
        ? ` detail=${JSON.stringify(error.detail)}`
        : "";
    process.stderr.write(
      `VOID_ECONOMIC_EPOCH2_CLIENT_NEUTRAL_STATE_MANIFEST_V1_HOLD reason=${reason}${detail}\n`,
    );
    process.exitCode = 2;
  });
}

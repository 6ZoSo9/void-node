#!/usr/bin/env node
import {
  AbiCoder,
  getAddress,
  getCreateAddress,
  keccak256,
} from "ethers";

import {
  verifyBuyVoidPresaleFulfillmentCompiledIdentityV1,
} from "./buy-void-presale-fulfillment-compiled-identity-acceptance-v1.mjs";
import {
  canonicalJson,
  sha256,
} from "./buy-void-presale-fulfillment-compiler-profile-v1.mjs";

export const VOID_BUY_VOID_PRESALE_FULFILLMENT_DEPLOYMENT_ATTESTATION_V1 =
  "VOID_BUY_VOID_PRESALE_FULFILLMENT_DEPLOYMENT_ATTESTATION_V1";

export const VOID_BUY_VOID_PRESALE_FULFILLMENT_DEPLOYMENT_ATTESTATION_AUTHORITY_V1 = {
  pure_observation_validation_only: true,
  caller_policy_binding_required: true,
  accepted_compiler_identity_required: true,
  exact_creation_transaction_required: true,
  exact_create_address_required: true,
  exact_runtime_reconstruction_required: true,
  exact_view_binding_required: true,
  genesis_predecessor_only_v1: true,
  nonzero_predecessor_requires_separate_identity_acceptance: true,
  rpc_call: false,
  credential_access: false,
  wallet_access: false,
  signing: false,
  transaction_broadcast: false,
  deployment: false,
  chain2050_mutation: false,
  inventory_funding: false,
  runtime_enablement_change: false,
  public_activation: false,
  money_movement: false,
};

const ZERO_ADDRESS =
  "0x0000000000000000000000000000000000000000";
const HASH = /^0x[0-9a-f]{64}$/;
const ADDRESS = /^0x[0-9a-f]{40}$/;
const UINT256_MAX = (1n << 256n) - 1n;
const MAX_INVENTORY_ATOMS =
  10_000_000n * 10n ** 18n;
const ABI = AbiCoder.defaultAbiCoder();

function fail(reason, detail) {
  return {
    ok: false,
    status: "held",
    marker:
      VOID_BUY_VOID_PRESALE_FULFILLMENT_DEPLOYMENT_ATTESTATION_V1,
    version: 1,
    reason,
    ...(detail ? { detail } : {}),
    deployment_attested: false,
    predecessor_lineage_attested: false,
    inventory_funding_verified: false,
    runtime_activation_authorized: false,
    public_activation_authorized: false,
    authority:
      VOID_BUY_VOID_PRESALE_FULFILLMENT_DEPLOYMENT_ATTESTATION_AUTHORITY_V1,
  };
}

function text(value) {
  return typeof value === "string"
    ? value.trim()
    : String(value ?? "").trim();
}

function plain(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function address(value) {
  const raw = text(value);
  if (!/^0x[0-9a-fA-F]{40}$/.test(raw)) {
    return "";
  }
  try {
    const normalized = getAddress(raw).toLowerCase();
    return ADDRESS.test(normalized)
      ? normalized
      : "";
  } catch {
    return "";
  }
}

function hash(value) {
  const raw = text(value).toLowerCase();
  return HASH.test(raw) ? raw : "";
}

function decimal(value, { positive = false } = {}) {
  try {
    const raw = text(value);
    if (!/^(0|[1-9][0-9]{0,77})$/.test(raw)) {
      return null;
    }
    const parsed = BigInt(raw);
    if (
      parsed < 0n ||
      parsed > UINT256_MAX ||
      (positive && parsed === 0n)
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function nonceValue(value) {
  try {
    if (
      typeof value === "number" &&
      Number.isSafeInteger(value) &&
      value >= 0
    ) {
      return BigInt(value);
    }
    const parsed = decimal(value);
    if (
      parsed === null ||
      parsed > BigInt(Number.MAX_SAFE_INTEGER)
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function normalizeHex(value) {
  const raw = text(value).toLowerCase();
  if (
    !/^0x(?:[0-9a-f]{2})*$/.test(raw) ||
    raw.length < 4
  ) {
    return "";
  }
  return raw;
}

function abiWordForAddress(value) {
  const normalized = address(value);
  if (!normalized) {
    throw new Error("address_word_invalid");
  }
  return normalized.slice(2).padStart(64, "0");
}

function exactReferences(identity, name) {
  const values =
    identity?.artifacts?.immutable_layout?.[name]
      ?.references;
  if (
    !Array.isArray(values) ||
    values.length < 1
  ) {
    throw new Error(
      "immutable_reference_missing:" + name,
    );
  }
  return values.map((entry) => {
    if (
      !plain(entry) ||
      !Number.isSafeInteger(entry.start) ||
      !Number.isSafeInteger(entry.length) ||
      entry.start < 0 ||
      entry.length !== 32
    ) {
      throw new Error(
        "immutable_reference_invalid:" + name,
      );
    }
    return {
      start: entry.start,
      length: entry.length,
    };
  });
}

export function reconstructBuyVoidPresaleFulfillmentRuntimeV1({
  compiled_identity,
  void_token_address,
  fulfiller_address,
  predecessor_address,
}) {
  const accepted =
    verifyBuyVoidPresaleFulfillmentCompiledIdentityV1(
      compiled_identity,
    );
  if (accepted.ok === false) {
    throw new Error(
      "compiled_identity_not_accepted:" +
        accepted.reason,
    );
  }

  const template = normalizeHex(
    compiled_identity?.artifacts
      ?.runtime_template_hex,
  );
  if (!template) {
    throw new Error(
      "runtime_template_hex_invalid",
    );
  }
  const bytes = Buffer.from(
    template.slice(2),
    "hex",
  );

  for (const [name, value] of [
    ["token", void_token_address],
    ["fulfiller", fulfiller_address],
    ["predecessor", predecessor_address],
  ]) {
    const word = Buffer.from(
      abiWordForAddress(value),
      "hex",
    );
    for (const ref of exactReferences(
      compiled_identity,
      name,
    )) {
      if (
        ref.start + ref.length >
        bytes.length
      ) {
        throw new Error(
          "immutable_reference_out_of_bounds:" +
            name,
        );
      }
      word.copy(bytes, ref.start);
    }
  }

  return {
    runtime_code: "0x" + bytes.toString("hex"),
    runtime_bytes: bytes.length,
    runtime_sha256: sha256(bytes),
    runtime_keccak256:
      keccak256("0x" + bytes.toString("hex")),
  };
}

export function buildBuyVoidPresaleFulfillmentDeploymentDataV1({
  compiled_identity,
  void_token_address,
  fulfiller_address,
  predecessor_address,
}) {
  const accepted =
    verifyBuyVoidPresaleFulfillmentCompiledIdentityV1(
      compiled_identity,
    );
  if (accepted.ok === false) {
    throw new Error(
      "compiled_identity_not_accepted:" +
        accepted.reason,
    );
  }

  const creation = normalizeHex(
    compiled_identity?.artifacts
      ?.creation_bytecode_hex,
  );
  if (!creation) {
    throw new Error(
      "creation_bytecode_hex_invalid",
    );
  }

  const token = address(void_token_address);
  const fulfiller = address(fulfiller_address);
  const predecessor = address(predecessor_address);
  if (!token || !fulfiller || !predecessor) {
    throw new Error(
      "constructor_address_invalid",
    );
  }

  const args = ABI.encode(
    ["address", "address", "address"],
    [token, fulfiller, predecessor],
  ).toLowerCase();

  return {
    constructor_arguments: args,
    deployment_data:
      creation + args.slice(2),
    deployment_data_keccak256:
      keccak256(
        creation + args.slice(2),
      ),
  };
}

export function verifyBuyVoidPresaleFulfillmentDeploymentObservationV1(
  input,
) {
  if (
    !plain(input) ||
    !plain(input.policy) ||
    !plain(input.observation)
  ) {
    return fail(
      "deployment_attestation_input_invalid",
    );
  }

  const accepted =
    verifyBuyVoidPresaleFulfillmentCompiledIdentityV1(
      input.compiled_identity,
    );
  if (accepted.ok === false) {
    return fail(
      "deployment_attestation_compiled_identity_not_accepted",
      {
        reason: accepted.reason,
      },
    );
  }

  const policy = input.policy;
  const expectedToken = address(
    policy.void_token_address,
  );
  const expectedFulfiller = address(
    policy.fulfiller_address,
  );
  const expectedPredecessor = address(
    policy.predecessor_address,
  );
  const expectedContract = address(
    policy.fulfillment_contract_address,
  );
  if (
    text(policy.chain_id) !== "2050" ||
    !expectedToken ||
    !expectedFulfiller ||
    !expectedPredecessor ||
    !expectedContract ||
    expectedToken === ZERO_ADDRESS ||
    expectedFulfiller === ZERO_ADDRESS ||
    expectedContract === ZERO_ADDRESS ||
    expectedToken === expectedFulfiller ||
    expectedToken === expectedContract ||
    expectedFulfiller === expectedContract
  ) {
    return fail(
      "deployment_attestation_policy_invalid",
    );
  }

  if (
    expectedPredecessor !== ZERO_ADDRESS
  ) {
    return fail(
      "deployment_attestation_nonzero_predecessor_identity_not_accepted_v1",
      {
        predecessor_address:
          expectedPredecessor,
      },
    );
  }

  const observation = input.observation;
  const contractAddress = address(
    observation.contract_address,
  );
  const token = address(
    observation.views?.void_token_address,
  );
  const fulfiller = address(
    observation.views?.fulfiller_address,
  );
  const predecessor = address(
    observation.views?.predecessor_address,
  );
  const observationBlockHash = hash(
    observation.observation_block_hash,
  );
  const observationBlock =
    decimal(
      observation.observation_block_number,
      { positive: true },
    );

  if (
    text(observation.chain_id) !== "2050" ||
    !contractAddress ||
    contractAddress !== expectedContract ||
    !token ||
    token !== expectedToken ||
    !fulfiller ||
    fulfiller !== expectedFulfiller ||
    !predecessor ||
    predecessor !== expectedPredecessor ||
    !observationBlockHash ||
    observationBlock === null
  ) {
    return fail(
      "deployment_attestation_observation_binding_mismatch",
    );
  }

  const maxInventory = decimal(
    observation.views?.max_inventory_atoms,
    { positive: true },
  );
  const totalFulfilled = decimal(
    observation.views?.total_fulfilled_atoms,
  );
  const remaining = decimal(
    observation.views?.remaining_inventory_atoms,
  );
  if (
    maxInventory !== MAX_INVENTORY_ATOMS ||
    totalFulfilled === null ||
    remaining === null ||
    totalFulfilled > MAX_INVENTORY_ATOMS ||
    remaining > MAX_INVENTORY_ATOMS ||
    totalFulfilled + remaining !==
      MAX_INVENTORY_ATOMS
  ) {
    return fail(
      "deployment_attestation_inventory_view_mismatch",
    );
  }

  const tx = observation.deployment_transaction;
  const receipt =
    observation.deployment_receipt;
  if (!plain(tx) || !plain(receipt)) {
    return fail(
      "deployment_attestation_transaction_evidence_missing",
    );
  }

  const txHash = hash(tx.hash);
  const receiptTxHash = hash(
    receipt.transaction_hash,
  );
  const txFrom = address(tx.from);
  const txNonce = nonceValue(tx.nonce);
  const txTo =
    tx.to === null ||
    tx.to === undefined ||
    text(tx.to) === ""
      ? null
      : address(tx.to);
  const txInput = normalizeHex(tx.input);
  const txValue = decimal(tx.value_wei);
  const receiptContract = address(
    receipt.contract_address,
  );
  const receiptBlockHash = hash(
    receipt.block_hash,
  );
  const receiptBlock = decimal(
    receipt.block_number,
    { positive: true },
  );

  if (
    !txHash ||
    txHash !== receiptTxHash ||
    !txFrom ||
    txNonce === null ||
    txTo !== null ||
    !txInput ||
    txValue !== 0n ||
    text(tx.chain_id) !== "2050" ||
    text(receipt.status) !== "1" ||
    receiptContract !== expectedContract ||
    !receiptBlockHash ||
    receiptBlock === null ||
    receiptBlock > observationBlock
  ) {
    return fail(
      "deployment_attestation_creation_transaction_mismatch",
    );
  }

  let derivedContract;
  try {
    derivedContract = getCreateAddress({
      from: txFrom,
      nonce: txNonce,
    }).toLowerCase();
  } catch {
    return fail(
      "deployment_attestation_create_address_derivation_failed",
    );
  }
  if (derivedContract !== expectedContract) {
    return fail(
      "deployment_attestation_create_address_mismatch",
      {
        derived_contract_address:
          derivedContract,
      },
    );
  }

  let deploymentData;
  let reconstructed;
  try {
    deploymentData =
      buildBuyVoidPresaleFulfillmentDeploymentDataV1({
        compiled_identity:
          input.compiled_identity,
        void_token_address:
          expectedToken,
        fulfiller_address:
          expectedFulfiller,
        predecessor_address:
          expectedPredecessor,
      });
    reconstructed =
      reconstructBuyVoidPresaleFulfillmentRuntimeV1({
        compiled_identity:
          input.compiled_identity,
        void_token_address:
          expectedToken,
        fulfiller_address:
          expectedFulfiller,
        predecessor_address:
          expectedPredecessor,
      });
  } catch (error) {
    return fail(
      "deployment_attestation_identity_reconstruction_failed",
      {
        error:
          text(error?.message || error).slice(
            0,
            240,
          ),
      },
    );
  }

  if (
    txInput !==
      deploymentData.deployment_data
        .toLowerCase()
  ) {
    return fail(
      "deployment_attestation_creation_input_mismatch",
    );
  }

  const observedCode = normalizeHex(
    observation.runtime_code,
  );
  if (
    !observedCode ||
    observedCode !==
      reconstructed.runtime_code
        .toLowerCase() ||
    (observedCode.length - 2) / 2 !==
      reconstructed.runtime_bytes ||
    sha256(
      Buffer.from(
        observedCode.slice(2),
        "hex",
      ),
    ) !== reconstructed.runtime_sha256 ||
    keccak256(observedCode) !==
      reconstructed.runtime_keccak256
  ) {
    return fail(
      "deployment_attestation_runtime_code_mismatch",
    );
  }

  if (
    predecessor !== ZERO_ADDRESS
  ) {
    return fail(
      "deployment_attestation_predecessor_lineage_unproven",
    );
  }

  const normalizedEvidence = {
    chain_id: "2050",
    observation_block_number:
      observationBlock.toString(),
    observation_block_hash:
      observationBlockHash,
    contract_address:
      expectedContract,
    void_token_address:
      expectedToken,
    fulfiller_address:
      expectedFulfiller,
    predecessor_address:
      expectedPredecessor,
    max_inventory_atoms:
      maxInventory.toString(),
    total_fulfilled_atoms:
      totalFulfilled.toString(),
    remaining_inventory_atoms:
      remaining.toString(),
    deployment_transaction_hash:
      txHash,
    deployment_from_address:
      txFrom,
    deployment_nonce:
      txNonce.toString(),
    deployment_block_number:
      receiptBlock.toString(),
    deployment_block_hash:
      receiptBlockHash,
    deployment_data_keccak256:
      deploymentData
        .deployment_data_keccak256,
    deployed_runtime_sha256:
      reconstructed.runtime_sha256,
    deployed_runtime_keccak256:
      reconstructed.runtime_keccak256,
    compiled_identity_id:
      accepted.identity_id,
  };

  return {
    ok: true,
    status:
      "deployment_attested_genesis_lineage_held_on_inventory_funding",
    marker:
      VOID_BUY_VOID_PRESALE_FULFILLMENT_DEPLOYMENT_ATTESTATION_V1,
    version: 1,
    deployment_attestation_id:
      "voidbvpfda1_" +
      sha256(
        canonicalJson(
          normalizedEvidence,
        ),
      ),
    ...normalizedEvidence,
    creation_transaction_exact_match: true,
    create_address_exact_match: true,
    runtime_code_exact_match: true,
    immutable_token_exact_match: true,
    immutable_fulfiller_exact_match: true,
    immutable_predecessor_exact_match: true,
    contract_views_exact_match: true,
    predecessor_lineage_attested: true,
    genesis_predecessor: true,
    deployment_attested: true,
    inventory_funding_verified: false,
    runtime_activation_authorized: false,
    public_activation_authorized: false,
    next_gate:
      "presale_inventory_funding_attestation_and_separate_activation_authorization",
    authority:
      VOID_BUY_VOID_PRESALE_FULFILLMENT_DEPLOYMENT_ATTESTATION_AUTHORITY_V1,
  };
}

#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";

export const VOID_WC_VOID_MARKET_VAULT_DEPLOYMENT_PREPARATION_V1 =
  "VOID_WC_VOID_MARKET_VAULT_DEPLOYMENT_PREPARATION_V1";

export const ACCEPTED_IDENTITY_ID =
  "voidwcvci1_f4096e7c4520897d656a64a8be5b344a3541e0e960226787654415f867f2d045";
export const ACCEPTED_SOURCE_COMMIT =
  "9309c9fff7e2e53de92977585897c678933d64b9";
export const ACCEPTED_CREATION_SHA256 =
  "84bbf44ee873c9e8b271271d8d3dc10bf6bb58d38b0d7da26558275510c0d540";
export const ACCEPTED_RUNTIME_TEMPLATE_SHA256 =
  "99a7179850af5a6e13c1a1b24cf873b011a98fcc8d54479722c20fc254188f7e";
export const ACCEPTED_IMMUTABLE_LAYOUT_SHA256 =
  "61de8af4e7f5a960227cb76383b7e48d52ddceb305d043f6905812deeb02d33b";

export const CHAIN_ID = 2050;
export const CANONICAL_VOID_TOKEN =
  "0x470075b85352eb86f7d089fb9ba88945f12aad94";
export const CANONICAL_COUPLED_LAUNCH_ID =
  "0xfb6584220f298f239a4c6a77ff1faa274300a61597eeae85272cdda9e17f1c83";

export const AUTHORITY = Object.freeze({
  source_only_preparation: true,
  rpc_call: false,
  credential_access: false,
  wallet_or_signer_access: false,
  nonce_observation: false,
  transaction_construction: false,
  transaction_signing: false,
  transaction_broadcast: false,
  deployment: false,
  chain2050_write: false,
  inventory_funding: false,
  liquidity_movement: false,
  market_activation: false,
  public_presale_activation: false,
  wc_mutation: false,
  funds_movement: false,
});

const ADDRESS = /^0x[0-9a-fA-F]{40}$/u;
const BYTES32 = /^0x[0-9a-fA-F]{64}$/u;
const HEX = /^0x[0-9a-fA-F]+$/u;

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function fail(code) {
  const error = new Error(code);
  error.code = code;
  throw error;
}

function normalizeAddress(value, code) {
  if (typeof value !== "string" || !ADDRESS.test(value)) fail(code);
  if (/^0x0{40}$/iu.test(value)) fail(code);
  return value.toLowerCase();
}

function normalizeBytes32(value, code) {
  if (typeof value !== "string" || !BYTES32.test(value)) fail(code);
  if (/^0x0{64}$/iu.test(value)) fail(code);
  return value.toLowerCase();
}

function encodeAddressWord(address) {
  return address.slice(2).padStart(64, "0");
}

function encodeBytes32Word(value) {
  return value.slice(2);
}

function validateAcceptedIdentity(manifest, creationHex) {
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
    fail("accepted_identity_manifest_invalid");
  }
  if (
    manifest.marker !==
      "VOID_WC_VOID_MARKET_VAULT_COMPILED_IDENTITY_ACCEPTANCE_V1" ||
    manifest.identity_id !== ACCEPTED_IDENTITY_ID ||
    manifest.source_commit !== ACCEPTED_SOURCE_COMMIT ||
    manifest.contract_path !== "contracts/mainnet/WCVoidMarketVaultV2.sol" ||
    manifest.contract_name !== "WCVoidMarketVaultV2" ||
    manifest.accepted?.compiled_identity_committed !== true ||
    manifest.accepted?.deployment_attested !== false ||
    manifest.accepted?.market_vault_address !== null
  ) {
    fail("accepted_identity_manifest_mismatch");
  }
  if (
    manifest.artifacts?.creation_bytecode_sha256 !== ACCEPTED_CREATION_SHA256 ||
    manifest.artifacts?.runtime_template_sha256 !==
      ACCEPTED_RUNTIME_TEMPLATE_SHA256 ||
    manifest.artifacts?.immutable_layout_sha256 !==
      ACCEPTED_IMMUTABLE_LAYOUT_SHA256
  ) {
    fail("accepted_identity_artifact_mismatch");
  }

  const creation = String(creationHex ?? "").trim().toLowerCase();
  if (!HEX.test(creation) || creation.length % 2 !== 0) {
    fail("accepted_creation_bytecode_invalid");
  }
  const creationBytes = Buffer.from(creation.slice(2), "hex");
  if (
    creationBytes.length !== manifest.artifacts.creation_bytecode_bytes ||
    sha256(creationBytes) !== ACCEPTED_CREATION_SHA256
  ) {
    fail("accepted_creation_bytecode_mismatch");
  }

  return creation;
}

function hold(missing) {
  return Object.freeze({
    marker: VOID_WC_VOID_MARKET_VAULT_DEPLOYMENT_PREPARATION_V1,
    status: "HOLD",
    chain_id: CHAIN_ID,
    accepted_identity_id: ACCEPTED_IDENTITY_ID,
    missing_bindings: Object.freeze([...missing]),
    deployment_data_constructed: false,
    deployment_authority: false,
    authority: AUTHORITY,
  });
}

export function prepareWcVoidMarketVaultDeploymentV1({
  manifest,
  creationBytecodeHex,
  bindings,
}) {
  const creation = validateAcceptedIdentity(manifest, creationBytecodeHex);

  const missing = [];
  for (const key of [
    "launch_controller",
    "settlement_executor",
    "closeout_controller",
    "coupled_launch_id",
  ]) {
    if (bindings?.[key] === null || bindings?.[key] === undefined) {
      missing.push(key);
    }
  }
  if (missing.length > 0) return hold(missing);

  const voidToken = normalizeAddress(
    bindings?.void_token ?? CANONICAL_VOID_TOKEN,
    "void_token_invalid",
  );
  if (voidToken !== CANONICAL_VOID_TOKEN) {
    fail("void_token_not_canonical");
  }

  const launchController = normalizeAddress(
    bindings.launch_controller,
    "launch_controller_invalid",
  );
  const settlementExecutor = normalizeAddress(
    bindings.settlement_executor,
    "settlement_executor_invalid",
  );
  const closeoutController = normalizeAddress(
    bindings.closeout_controller,
    "closeout_controller_invalid",
  );
  const coupledLaunchId = normalizeBytes32(
    bindings.coupled_launch_id,
    "coupled_launch_id_invalid",
  );
  if (coupledLaunchId !== CANONICAL_COUPLED_LAUNCH_ID) {
    fail("coupled_launch_id_not_canonical");
  }

  if (settlementExecutor === closeoutController) {
    fail("recovery_authorities_must_be_distinct");
  }
  if (
    new Set([
      launchController,
      settlementExecutor,
      closeoutController,
    ]).size !== 3
  ) {
    fail("production_role_bindings_must_be_distinct");
  }
  if (
    [launchController, settlementExecutor, closeoutController]
      .includes(voidToken)
  ) {
    fail("role_address_must_not_equal_void_token");
  }

  const encodedConstructorArguments =
    "0x" +
    encodeAddressWord(voidToken) +
    encodeAddressWord(launchController) +
    encodeAddressWord(settlementExecutor) +
    encodeAddressWord(closeoutController) +
    encodeBytes32Word(coupledLaunchId);

  const deploymentData =
    creation + encodedConstructorArguments.slice(2);
  const deploymentBytes = Buffer.from(deploymentData.slice(2), "hex");

  return Object.freeze({
    marker: VOID_WC_VOID_MARKET_VAULT_DEPLOYMENT_PREPARATION_V1,
    status: "SOURCE_READY",
    chain_id: CHAIN_ID,
    contract_name: "WCVoidMarketVaultV2",
    contract_path: "contracts/mainnet/WCVoidMarketVaultV2.sol",
    accepted_identity_id: ACCEPTED_IDENTITY_ID,
    accepted_source_commit: ACCEPTED_SOURCE_COMMIT,
    constructor_signature:
      "constructor(address,address,address,address,bytes32)",
    constructor_order: Object.freeze([
      "void_token",
      "launch_controller",
      "settlement_executor",
      "closeout_controller",
      "coupled_launch_id",
    ]),
    bindings: Object.freeze({
      void_token: voidToken,
      launch_controller: launchController,
      settlement_executor: settlementExecutor,
      closeout_controller: closeoutController,
      coupled_launch_id: coupledLaunchId,
    }),
    role_bindings_distinct: true,
    recovery_authorities_distinct: true,
    abi_encoded_constructor_arguments: encodedConstructorArguments,
    deployment_data_bytes: deploymentBytes.length,
    deployment_data_sha256: sha256(deploymentBytes),
    deployment_data_constructed: true,
    deployer_address: null,
    deployment_nonce: null,
    predicted_contract_address: null,
    fee_observation: null,
    unsigned_eip1559_transaction: null,
    deployment_authority: false,
    next_gate:
      "resolve_explicit_role_bindings_then_read_only_deployer_nonce_fee_observation",
    authority: AUTHORITY,
  });
}

async function main() {
  const manifest = JSON.parse(
    fs.readFileSync(
      "ops/mainnet0/wc-void-market-vault-v2-compiled-identity-v1.json",
      "utf8",
    ),
  );
  const creation = fs.readFileSync(
    "ops/mainnet0/wc-void-market-vault-v2-creation-bytecode.hex",
    "utf8",
  );
  const candidate = JSON.parse(
    fs.readFileSync(
      "ops/mainnet0/wc-void-market-vault-deployment-preparation-v1.json",
      "utf8",
    ),
  );

  const result = prepareWcVoidMarketVaultDeploymentV1({
    manifest,
    creationBytecodeHex: creation,
    bindings: candidate.bindings,
  });

  process.stdout.write(JSON.stringify(result, null, 2) + "\n");
}

if (import.meta.url === new URL("file:" + process.argv[1]).href) {
  main().catch((error) => {
    console.error(error?.code || error?.message || error);
    process.exit(1);
  });
}

#!/usr/bin/env node
import crypto from "node:crypto";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export const VOID_WC_VOID_MARKET_VAULT_ROLE_DEPLOYMENT_PREFLIGHT_V1 =
  "VOID_WC_VOID_MARKET_VAULT_ROLE_DEPLOYMENT_PREFLIGHT_V1";

export const VOID_WC_VOID_MARKET_VAULT_ROLE_DEPLOYMENT_PREFLIGHT_AUTHORITY_V1 =
  Object.freeze({
    source_preflight_only: true,
    git_head_source_read: true,
    credential_read: false,
    private_key_access: false,
    wallet_or_signer_access: false,
    rpc_call: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_broadcast: false,
    chain2050_write: false,
    deployment: false,
    inventory_funding: false,
    market_activation: false,
    public_presale_activation: false,
    funds_movement: false,
  });

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PREFLIGHT_REL =
  "ops/mainnet0/wc-void-market-vault-role-deployment-preflight-v1.json";
const ACCEPTANCE_REL =
  "ops/mainnet0/wc-void-market-vault-compiled-identity-acceptance-v1.json";
const COUPLED_REL =
  "ops/mainnet0/coupled-economic-successor-gate-candidate-v1.json";
const SOVEREIGN_REL =
  "ops/mainnet0/chain2050-role-authority-sovereign-genesis-append-authorization-v1.json";
const WALLET_REL =
  "src/economic/buy_void_erc20_production_credential_binding_evidence_v1.ts";
const CONTRACT_REL = "contracts/mainnet/WCVoidMarketVaultV2.sol";
const ATTESTATION_REL =
  "tools/void-wc-void-market-vault-runtime-attestation-v1.mjs";

const REVIEWED_MAIN = "c4614c49d79a6111c2590518ea4dda7863b14042";

export const VOID_WC_VOID_MARKET_VAULT_ROLE_DEPLOYMENT_PREFLIGHT_SOURCE_BLOBS_V1 =
  Object.freeze({
    [ACCEPTANCE_REL]: "c85b6bc59caac6bc765cb8e969cb980386161d12",
    [COUPLED_REL]: "d78bc88dd26c47921a54c081a79ceefc0d5abcee",
    [SOVEREIGN_REL]: "ab51f2095aee1537a417a13014fa5b973c4c0645",
    [WALLET_REL]: "0999f773bdc4befb3e82676304f0d69f5cab42ef",
    [CONTRACT_REL]: "bd11190e2c22f58ac60918ecdf603f53427cadd0",
    [ATTESTATION_REL]: "64a7993a38f764d91a2071240b834fcd97770962",
  });

const EXPECTED = Object.freeze({
  chain_id: 2050,
  coupled_launch_id:
    "sha256:fe02b5c813adea98f55e8587759df9316f7a8d5f1123114dc851cbad863fdc26",
  coupled_launch_id_bytes32:
    "0xfe02b5c813adea98f55e8587759df9316f7a8d5f1123114dc851cbad863fdc26",
  void_token: "0x470075b85352eb86f7d089fb9ba88945f12aad94",
  compiled_identity_id:
    "voidwcvci1_51841520b1db294e44023c127bbe7caa28d8f87a97c788109b6609222941125a",
  identity_json_sha256:
    "fb9a92e24afa9d7611364ca30b6eff4fe2df2cc2aa8002b77307bead4b864a4b",
  contract_source_sha256:
    "2ac773c7580f5a5d477d12da62e1a597d64c174395af8b20b721873a63138925",
  creation_bytecode_sha256:
    "9fae041d06d317b326fd1a9cee6efc34fa0e214b74a9447e44131969d886a5af",
  creation_bytecode_keccak256:
    "0xc6ac291ad2557039055c8baf79d2ba085d4ecaffe8e474d5d932602a2fae4b1c",
  runtime_template_sha256:
    "421f6e2ecbea1ccf02e20a52119323014a0f65906ff08d060d602ebebb327409",
  runtime_template_keccak256:
    "0xf5850c03e88aa44017c1894784c23d1359ddcdd13acbebee64ae9e5b17cb713c",
  immutable_layout_sha256:
    "61de8af4e7f5a960227cb76383b7e48d52ddceb305d043f6905812deeb02d33b",
  settlement_executor: "0xc884f631c3881b8b672bfcbf019c856146cd7f73",
  settlement_credential_id: "buy-void-native-fulfillment-wallet-v1",
  closeout_controller: "0xe1f147b6b2671f140c4107fa4a1dd5f7cbd06d0b",
  sovereign_authorization_id:
    "voidcrasgaa1_fb46e3048b5921da3856de4548823b61f32e64f423bf5e7fd4758b9e04e27355",
  historical_launch_controller: "0x2f1e0005e865b772b268bd8c797bf3eaa901d97e",
  historical_coupled_launch_id:
    "0xfb6584220f298f239a4c6a77ff1faa274300a61597eeae85272cdda9e17f1c83",
  historical_compiled_identity_id:
    "voidwcvci1_f4096e7c4520897d656a64a8be5b344a3541e0e960226787654415f867f2d045",
});

const HEX40 = /^[0-9a-f]{40}$/u;
const ADDRESS = /^0x[0-9a-f]{40}$/u;

function fail(reason) {
  throw new Error(reason);
}

function canonicalAddress(value, reason) {
  if (typeof value !== "string") fail(reason);
  const lower = value.toLowerCase();
  if (!ADDRESS.test(lower)) fail(reason);
  return lower;
}

function exactOwnDataObject(value, keys, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(label + "_not_object");
  }
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) {
    fail(label + "_prototype_invalid");
  }
  const own = Reflect.ownKeys(value);
  if (
    own.length !== keys.length ||
    own.some((key) => typeof key !== "string" || !keys.includes(key))
  ) {
    fail(label + "_keys_mismatch");
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const out = {};
  for (const key of keys) {
    const descriptor = descriptors[key];
    if (
      !descriptor ||
      descriptor.enumerable !== true ||
      !Object.hasOwn(descriptor, "value")
    ) {
      fail(label + "_data_property_required:" + key);
    }
    out[key] = descriptor.value;
  }
  return out;
}

function git(args, reason) {
  const result = spawnSync(
    "git",
    ["-C", ROOT, ...args],
    {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, GIT_OPTIONAL_LOCKS: "0" },
    },
  );
  if (result.status !== 0) fail(reason);
  return String(result.stdout || "");
}

function gitRevParse(spec, reason) {
  const value = git(["rev-parse", spec], reason).trim();
  if (!HEX40.test(value)) fail(reason);
  return value;
}

function headText(relativePath) {
  return git(
    ["show", "HEAD:" + relativePath],
    "preflight_head_source_unavailable:" + relativePath,
  );
}

function headJson(relativePath) {
  try {
    return JSON.parse(headText(relativePath));
  } catch {
    fail("preflight_head_json_invalid:" + relativePath);
  }
}

function requireReviewedMainAncestor() {
  const result = spawnSync(
    "git",
    ["-C", ROOT, "merge-base", "--is-ancestor", REVIEWED_MAIN, "HEAD"],
    {
      stdio: ["ignore", "ignore", "ignore"],
      env: { ...process.env, GIT_OPTIONAL_LOCKS: "0" },
    },
  );
  if (result.status !== 0) fail("preflight_reviewed_main_not_ancestor");
}

function sha256Text(value) {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function quotedField(source, field, reason) {
  const escaped = field.replace(/[-/\\^$*+?.()|[\]{}]/gu, "\\$&");
  const match = source.match(
    new RegExp(escaped + "\\s*:\\s*\"([^\"]+)\"", "u"),
  );
  if (!match) fail(reason);
  return match[1];
}

function validateRepositorySources() {
  requireReviewedMainAncestor();

  for (const [relativePath, expectedBlob] of
    Object.entries(
      VOID_WC_VOID_MARKET_VAULT_ROLE_DEPLOYMENT_PREFLIGHT_SOURCE_BLOBS_V1,
    )) {
    const actual = gitRevParse(
      "HEAD:" + relativePath,
      "preflight_head_blob_unavailable:" + relativePath,
    );
    if (actual !== expectedBlob) {
      fail("preflight_head_blob_mismatch:" + relativePath);
    }
  }

  const acceptance = headJson(ACCEPTANCE_REL);
  if (
    acceptance?.marker !==
      "VOID_WC_VOID_MARKET_VAULT_COMPILED_IDENTITY_ACCEPTANCE_PACKET_V1" ||
    acceptance?.status !==
      "COMPILED_IDENTITY_ACCEPTED_HELD_ON_CHAIN2050_DEPLOYMENT_ATTESTATION" ||
    acceptance?.accepted_identity?.identity_id !== EXPECTED.compiled_identity_id ||
    acceptance?.accepted_identity?.identity_json_sha256 !==
      EXPECTED.identity_json_sha256 ||
    acceptance?.source?.contract_name !== "WCVoidMarketVaultV2" ||
    acceptance?.source?.contract_path !== CONTRACT_REL ||
    acceptance?.source?.contract_source_sha256 !==
      EXPECTED.contract_source_sha256 ||
    acceptance?.artifacts?.creation_bytecode_sha256 !==
      EXPECTED.creation_bytecode_sha256 ||
    acceptance?.artifacts?.creation_bytecode_keccak256 !==
      EXPECTED.creation_bytecode_keccak256 ||
    acceptance?.artifacts?.runtime_template_sha256 !==
      EXPECTED.runtime_template_sha256 ||
    acceptance?.artifacts?.runtime_template_keccak256 !==
      EXPECTED.runtime_template_keccak256 ||
    acceptance?.artifacts?.immutable_layout_sha256 !==
      EXPECTED.immutable_layout_sha256
  ) {
    fail("preflight_compiled_identity_drift");
  }

  if (sha256Text(headText(CONTRACT_REL)) !== EXPECTED.contract_source_sha256) {
    fail("preflight_contract_source_sha256_mismatch");
  }

  const coupled = headJson(COUPLED_REL);
  if (
    coupled?.marker !== "VOID_COUPLED_ECONOMIC_SUCCESSOR_GATE_V1" ||
    coupled?.shared_post_discovery_reconciliation?.coupled_launch_id !==
      EXPECTED.coupled_launch_id
  ) {
    fail("preflight_coupled_launch_identity_drift");
  }

  const sovereign = headJson(SOVEREIGN_REL);
  if (
    sovereign?.marker !==
      "VOID_CHAIN2050_ROLE_AUTHORITY_SOVEREIGN_GENESIS_APPEND_AUTHORIZATION_V1" ||
    sovereign?.status !==
      "authorized_exact_single_sovereign_genesis_registry_append" ||
    canonicalAddress(
      sovereign?.owner_address,
      "preflight_sovereign_owner_invalid",
    ) !== EXPECTED.closeout_controller ||
    sovereign?.authorization_id !== EXPECTED.sovereign_authorization_id ||
    sovereign?.candidate?.identity_id !== "sovereign.zoso"
  ) {
    fail("preflight_sovereign_identity_drift");
  }

  const walletSource = headText(WALLET_REL);
  const walletExpected = canonicalAddress(
    quotedField(
      walletSource,
      "expected_wallet_address",
      "preflight_wallet_expected_address_missing",
    ),
    "preflight_wallet_expected_address_invalid",
  );
  const walletDerived = canonicalAddress(
    quotedField(
      walletSource,
      "derived_wallet_address",
      "preflight_wallet_derived_address_missing",
    ),
    "preflight_wallet_derived_address_invalid",
  );
  const credentialId = quotedField(
    walletSource,
    "credential_id",
    "preflight_wallet_credential_id_missing",
  );
  if (
    walletExpected !== EXPECTED.settlement_executor ||
    walletDerived !== EXPECTED.settlement_executor ||
    walletExpected !== walletDerived ||
    credentialId !== EXPECTED.settlement_credential_id ||
    !walletSource.includes("exact_wallet_binding: true") ||
    !walletSource.includes("transaction_broadcast_performed: false") ||
    !walletSource.includes("inventory_funding_performed: false")
  ) {
    fail("preflight_settlement_executor_identity_drift");
  }

  const launchHex =
    "0x" + EXPECTED.coupled_launch_id.slice("sha256:".length);
  if (launchHex !== EXPECTED.coupled_launch_id_bytes32) {
    fail("preflight_coupled_launch_bytes32_derivation_mismatch");
  }

  return Object.freeze({
    settlement_executor: walletExpected,
    closeout_controller: canonicalAddress(
      sovereign.owner_address,
      "preflight_sovereign_owner_invalid",
    ),
  });
}

export function verifyVoidWcVoidMarketVaultRoleDeploymentPreflightV1(
  candidate,
  { verifyRepository = true } = {},
) {
  const value = exactOwnDataObject(
    candidate,
    [
      "marker",
      "version",
      "status",
      "reviewed_inherited_main_commit",
      "reviewed_source_blobs",
      "launch",
      "vault",
      "roles",
      "deployment_preparation",
      "next_gate",
      "authority",
    ],
    "preflight_candidate",
  );

  if (
    value.marker !== VOID_WC_VOID_MARKET_VAULT_ROLE_DEPLOYMENT_PREFLIGHT_V1 ||
    value.version !== 1 ||
    value.status !== "HOLD_LAUNCH_CONTROLLER_REQUALIFICATION_REQUIRED" ||
    value.reviewed_inherited_main_commit !== REVIEWED_MAIN
  ) {
    fail("preflight_candidate_identity_invalid");
  }

  const reviewed = exactOwnDataObject(
    value.reviewed_source_blobs,
    Object.keys(
      VOID_WC_VOID_MARKET_VAULT_ROLE_DEPLOYMENT_PREFLIGHT_SOURCE_BLOBS_V1,
    ),
    "preflight_reviewed_source_blobs",
  );
  for (const [sourcePath, expectedBlob] of
    Object.entries(
      VOID_WC_VOID_MARKET_VAULT_ROLE_DEPLOYMENT_PREFLIGHT_SOURCE_BLOBS_V1,
    )) {
    if (reviewed[sourcePath] !== expectedBlob) {
      fail("preflight_reviewed_source_blob_mismatch:" + sourcePath);
    }
  }

  const launch = exactOwnDataObject(
    value.launch,
    ["chain_id", "coupled_launch_id", "coupled_launch_id_bytes32"],
    "preflight_launch",
  );
  if (
    launch.chain_id !== EXPECTED.chain_id ||
    launch.coupled_launch_id !== EXPECTED.coupled_launch_id ||
    launch.coupled_launch_id_bytes32 !== EXPECTED.coupled_launch_id_bytes32
  ) {
    fail("preflight_launch_invalid");
  }

  const vault = exactOwnDataObject(
    value.vault,
    [
      "contract_name",
      "canonical_void_token",
      "accepted_compiled_identity_id",
      "accepted_identity_json_sha256",
      "contract_source_sha256",
      "creation_bytecode_sha256",
      "creation_bytecode_keccak256",
      "runtime_template_sha256",
      "runtime_template_keccak256",
      "immutable_layout_sha256",
      "market_vault_address",
      "deployment_transaction_hash",
      "deployment_ready",
    ],
    "preflight_vault",
  );
  if (
    vault.contract_name !== "WCVoidMarketVaultV2" ||
    canonicalAddress(
      vault.canonical_void_token,
      "preflight_candidate_void_token_invalid",
    ) !== EXPECTED.void_token ||
    vault.accepted_compiled_identity_id !== EXPECTED.compiled_identity_id ||
    vault.accepted_identity_json_sha256 !== EXPECTED.identity_json_sha256 ||
    vault.contract_source_sha256 !== EXPECTED.contract_source_sha256 ||
    vault.creation_bytecode_sha256 !== EXPECTED.creation_bytecode_sha256 ||
    vault.creation_bytecode_keccak256 !== EXPECTED.creation_bytecode_keccak256 ||
    vault.runtime_template_sha256 !== EXPECTED.runtime_template_sha256 ||
    vault.runtime_template_keccak256 !== EXPECTED.runtime_template_keccak256 ||
    vault.immutable_layout_sha256 !== EXPECTED.immutable_layout_sha256 ||
    vault.market_vault_address !== null ||
    vault.deployment_transaction_hash !== null ||
    vault.deployment_ready !== false
  ) {
    fail("preflight_vault_identity_invalid");
  }

  const roles = exactOwnDataObject(
    value.roles,
    [
      "launch_controller",
      "settlement_executor",
      "closeout_controller",
      "all_addresses_nonzero",
      "all_addresses_distinct",
      "all_roles_requalified",
      "all_role_bindings_ready",
    ],
    "preflight_roles",
  );
  const launchController = exactOwnDataObject(
    roles.launch_controller,
    [
      "address",
      "fresh_control_evidence_id",
      "fresh_control_evidence_path",
      "current_identity_requalified",
      "role_binding_ready",
      "historical_reference",
    ],
    "preflight_launch_controller",
  );
  const historical = exactOwnDataObject(
    launchController.historical_reference,
    [
      "address",
      "source_generation",
      "current_authority",
      "current_launch_bound",
      "current_compiled_identity_bound",
      "coupled_launch_id",
      "compiled_identity_id",
    ],
    "preflight_historical_launch_controller",
  );

  if (
    launchController.address !== null ||
    launchController.fresh_control_evidence_id !== null ||
    launchController.fresh_control_evidence_path !== null ||
    launchController.current_identity_requalified !== false ||
    launchController.role_binding_ready !== false ||
    canonicalAddress(
      historical.address,
      "preflight_historical_launch_controller_address_invalid",
    ) !== EXPECTED.historical_launch_controller ||
    historical.source_generation !== "sep25_historical_unmerged_branch" ||
    historical.current_authority !== false ||
    historical.current_launch_bound !== false ||
    historical.current_compiled_identity_bound !== false ||
    historical.coupled_launch_id !== EXPECTED.historical_coupled_launch_id ||
    historical.compiled_identity_id !==
      EXPECTED.historical_compiled_identity_id
  ) {
    fail("preflight_launch_controller_boundary_invalid");
  }

  const settlement = exactOwnDataObject(
    roles.settlement_executor,
    [
      "address",
      "source_path",
      "credential_id",
      "public_identity_requalified",
      "role_binding_authorized_for_current_launch",
    ],
    "preflight_settlement_executor",
  );
  const settlementAddress = canonicalAddress(
    settlement.address,
    "preflight_settlement_executor_address_invalid",
  );
  if (
    settlementAddress !== EXPECTED.settlement_executor ||
    settlement.source_path !== WALLET_REL ||
    settlement.credential_id !== EXPECTED.settlement_credential_id ||
    settlement.public_identity_requalified !== true ||
    settlement.role_binding_authorized_for_current_launch !== false
  ) {
    fail("preflight_settlement_executor_boundary_invalid");
  }

  const closeout = exactOwnDataObject(
    roles.closeout_controller,
    [
      "address",
      "source_path",
      "source_authorization_id",
      "public_identity_requalified",
      "role_binding_authorized_for_current_launch",
    ],
    "preflight_closeout_controller",
  );
  const closeoutAddress = canonicalAddress(
    closeout.address,
    "preflight_closeout_controller_address_invalid",
  );
  if (
    closeoutAddress !== EXPECTED.closeout_controller ||
    closeout.source_path !== SOVEREIGN_REL ||
    closeout.source_authorization_id !== EXPECTED.sovereign_authorization_id ||
    closeout.public_identity_requalified !== true ||
    closeout.role_binding_authorized_for_current_launch !== false
  ) {
    fail("preflight_closeout_controller_boundary_invalid");
  }

  if (
    settlementAddress === closeoutAddress ||
    settlementAddress === EXPECTED.void_token ||
    closeoutAddress === EXPECTED.void_token ||
    roles.all_addresses_nonzero !== false ||
    roles.all_addresses_distinct !== false ||
    roles.all_roles_requalified !== false ||
    roles.all_role_bindings_ready !== false
  ) {
    fail("preflight_role_separation_or_readiness_invalid");
  }

  const deployment = exactOwnDataObject(
    value.deployment_preparation,
    [
      "constructor_schema",
      "constructor_arguments_ready",
      "exact_creation_payload_ready",
      "deployer_selected",
      "nonce_observed",
      "fee_observed",
      "unsigned_transaction_ready",
      "deployment_authorized",
      "inventory_funding_authorized",
    ],
    "preflight_deployment_preparation",
  );
  if (
    JSON.stringify(deployment.constructor_schema) !==
      JSON.stringify([
        "address voidToken",
        "address launchController",
        "address settlementExecutor",
        "address closeoutController",
        "bytes32 coupledLaunchId",
      ]) ||
    deployment.constructor_arguments_ready !== false ||
    deployment.exact_creation_payload_ready !== false ||
    deployment.deployer_selected !== false ||
    deployment.nonce_observed !== false ||
    deployment.fee_observed !== false ||
    deployment.unsigned_transaction_ready !== false ||
    deployment.deployment_authorized !== false ||
    deployment.inventory_funding_authorized !== false
  ) {
    fail("preflight_deployment_authority_invalid");
  }

  if (
    value.next_gate !== "fresh_launch_controller_public_control_requalification"
  ) {
    fail("preflight_next_gate_invalid");
  }

  const authority = exactOwnDataObject(
    value.authority,
    Object.keys(
      VOID_WC_VOID_MARKET_VAULT_ROLE_DEPLOYMENT_PREFLIGHT_AUTHORITY_V1,
    ),
    "preflight_authority",
  );
  for (const [key, expected] of
    Object.entries(
      VOID_WC_VOID_MARKET_VAULT_ROLE_DEPLOYMENT_PREFLIGHT_AUTHORITY_V1,
    )) {
    if (authority[key] !== expected) {
      fail("preflight_authority_mismatch:" + key);
    }
  }

  if (verifyRepository) {
    const sources = validateRepositorySources();
    if (
      sources.settlement_executor !== settlementAddress ||
      sources.closeout_controller !== closeoutAddress
    ) {
      fail("preflight_role_source_rederivation_mismatch");
    }
  }

  return Object.freeze({
    marker: VOID_WC_VOID_MARKET_VAULT_ROLE_DEPLOYMENT_PREFLIGHT_V1,
    version: 1,
    status: "HOLD_LAUNCH_CONTROLLER_REQUALIFICATION_REQUIRED",
    current_launch_bound: true,
    current_compiled_identity_bound: true,
    settlement_executor_public_identity_requalified: true,
    closeout_controller_public_identity_requalified: true,
    known_role_separation_verified: true,
    launch_controller_current_identity_requalified: false,
    all_roles_requalified: false,
    constructor_arguments_ready: false,
    exact_creation_payload_ready: false,
    deployment_authorized: false,
    inventory_funding_authorized: false,
    market_activation_authorized: false,
    public_presale_activation_authorized: false,
    funds_movement_authorized: false,
    next_gate: "fresh_launch_controller_public_control_requalification",
  });
}

export function loadAndVerifyVoidWcVoidMarketVaultRoleDeploymentPreflightV1() {
  return verifyVoidWcVoidMarketVaultRoleDeploymentPreflightV1(
    headJson(PREFLIGHT_REL),
  );
}

const direct =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (direct) {
  try {
    const result =
      loadAndVerifyVoidWcVoidMarketVaultRoleDeploymentPreflightV1();
    console.log(VOID_WC_VOID_MARKET_VAULT_ROLE_DEPLOYMENT_PREFLIGHT_V1);
    for (const [key, value] of Object.entries(result)) {
      if (key === "marker" || key === "version") continue;
      console.log(key + "=" + String(value));
    }
    console.log(
      "VOID_WC_VOID_MARKET_VAULT_ROLE_DEPLOYMENT_PREFLIGHT_V1_GREEN",
    );
  } catch (error) {
    console.error(
      "VOID_WC_VOID_MARKET_VAULT_ROLE_DEPLOYMENT_PREFLIGHT_V1_HOLD",
    );
    console.error(
      "reason=" + (error instanceof Error ? error.message : String(error)),
    );
    process.exitCode = 2;
  }
}

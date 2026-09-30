#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export const VOID_WC_VOID_MARKET_VAULT_CURRENT_DEPLOYMENT_REQUALIFICATION_V1 =
  "VOID_WC_VOID_MARKET_VAULT_CURRENT_DEPLOYMENT_REQUALIFICATION_V1";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");

const CANDIDATE_REL =
  "ops/mainnet0/wc-void-market-vault-current-deployment-requalification-v1.json";
const IDENTITY_REL =
  "ops/mainnet0/wc-void-market-vault-compiled-identity-acceptance-v1.json";
const PRESALE_REL =
  "src/economic/buy_void_source_finality_authority_v2.ts";
const COUPLED_REL =
  "ops/mainnet0/coupled-economic-successor-gate-candidate-v1.json";
const WALLET_REL =
  "src/economic/buy_void_erc20_production_credential_binding_evidence_v1.ts";
const SOVEREIGN_REL =
  "ops/mainnet0/chain2050-role-authority-sovereign-genesis-append-authorization-v1.json";

const REVIEWED_MAIN = "b57d287977f43c41fbd24fc2c699b2d7cfff684d";
const CURRENT_IDENTITY =
  "voidwcvci1_51841520b1db294e44023c127bbe7caa28d8f87a97c788109b6609222941125a";
const CURRENT_CREATION =
  "9fae041d06d317b326fd1a9cee6efc34fa0e214b74a9447e44131969d886a5af";
const CURRENT_RUNTIME =
  "421f6e2ecbea1ccf02e20a52119323014a0f65906ff08d060d602ebebb327409";
const IMMUTABLE_LAYOUT =
  "61de8af4e7f5a960227cb76383b7e48d52ddceb305d043f6905812deeb02d33b";
const CURRENT_SOURCE_COMMIT =
  "dba4a50b444dc5b1369d96fd63f5aa79f185e3e4";
const CONTRACT_SOURCE_SHA256 =
  "2ac773c7580f5a5d477d12da62e1a597d64c174395af8b20b721873a63138925";
const CURRENT_LAUNCH_ID =
  "0xfe02b5c813adea98f55e8587759df9316f7a8d5f1123114dc851cbad863fdc26";
const VOID_TOKEN = "0x470075b85352eb86f7d089fb9ba88945f12aad94";

const EXPECTED_BLOBS = Object.freeze({
  [IDENTITY_REL]: "c85b6bc59caac6bc765cb8e969cb980386161d12",
  [PRESALE_REL]: "64953050d74bc0bc6d1e6948ae992d6143edca99",
  [COUPLED_REL]: "8e0c6cb2f55e9f15278c3a6f62075219b80e8667",
  [WALLET_REL]: "0999f773bdc4befb3e82676304f0d69f5cab42ef",
  [SOVEREIGN_REL]: "ab51f2095aee1537a417a13014fa5b973c4c0645",
});

function fail(code) {
  throw new Error(code);
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, canonicalize(nested)]),
    );
  }
  return value;
}

export function canonicalJson(value) {
  return JSON.stringify(canonicalize(value));
}

export function deriveCurrentCoupledLaunchIdV1(commitment) {
  return "0x" +
    crypto.createHash("sha256").update(canonicalJson(commitment)).digest("hex");
}

function git(args, code) {
  const result = execFileSync("git", ["-C", ROOT, ...args], {
    encoding: "utf8",
    env: { ...process.env, GIT_OPTIONAL_LOCKS: "0" },
  }).trim();
  if (!result) fail(code);
  return result;
}

function assertReviewedGeneration() {
  try {
    execFileSync(
      "git",
      ["-C", ROOT, "merge-base", "--is-ancestor", REVIEWED_MAIN, "HEAD"],
      {
        stdio: "ignore",
        env: { ...process.env, GIT_OPTIONAL_LOCKS: "0" },
      },
    );
  } catch {
    fail("reviewed_main_not_ancestor");
  }
  for (const [relativePath, expected] of Object.entries(EXPECTED_BLOBS)) {
    const actual = git(
      ["hash-object", path.join(ROOT, relativePath)],
      "source_blob_hash_failed",
    );
    if (actual !== expected) fail("source_blob_mismatch:" + relativePath);
  }
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), "utf8"));
}

function currentCommitmentFromSources() {
  const identity = readJson(IDENTITY_REL);
  if (
    identity?.marker !==
      "VOID_WC_VOID_MARKET_VAULT_COMPILED_IDENTITY_ACCEPTANCE_PACKET_V1" ||
    identity?.status !==
      "COMPILED_IDENTITY_ACCEPTED_HELD_ON_CHAIN2050_DEPLOYMENT_ATTESTATION" ||
    identity?.accepted_identity?.identity_id !== CURRENT_IDENTITY ||
    identity?.source?.source_commit !== CURRENT_SOURCE_COMMIT ||
    identity?.source?.contract_source_sha256 !== CONTRACT_SOURCE_SHA256 ||
    identity?.artifacts?.creation_bytecode_sha256 !== CURRENT_CREATION ||
    identity?.artifacts?.runtime_template_sha256 !== CURRENT_RUNTIME ||
    identity?.artifacts?.immutable_layout_sha256 !== IMMUTABLE_LAYOUT ||
    identity?.decision?.compiled_identity_accepted !== true ||
    identity?.decision?.deployment_attested !== false
  ) {
    fail("current_compiled_identity_mismatch");
  }

  const presaleSource = fs.readFileSync(path.join(ROOT, PRESALE_REL), "utf8");
  for (const required of [
    'marker: "VOID_BUY_VOID_CANONICAL_PRESALE_ECONOMICS_DUAL_RAIL_V1"',
    'canonical_presale_max_void: "10000000"',
    'rate_void_units_numerator: "2"',
    'rate_void_units_denominator: "1"',
  ]) {
    if (!presaleSource.includes(required)) {
      fail("current_presale_policy_mismatch");
    }
  }

  const coupled = readJson(COUPLED_REL);
  const opening = coupled?.wc_void_opening;
  if (
    coupled?.marker !== "VOID_COUPLED_ECONOMIC_SUCCESSOR_GATE_CANDIDATE_V1" ||
    coupled?.chain_id !== 2050 ||
    coupled?.presale_wc_void_coupled_launch_required !== true ||
    opening?.protocol_void_inventory_atoms !==
      "10000000000000000000000000" ||
    opening?.opening_sale_tranche_void_atoms !==
      "5000000000000000000000000" ||
    opening?.post_opening_void_reserve_atoms !==
      "5000000000000000000000000" ||
    opening?.protocol_wc_seed_units !== "0" ||
    opening?.fixed_conversion !== false ||
    opening?.fixed_opening_price !== false ||
    opening?.opening_price_source !==
      "settled_wc_over_opening_sale_tranche" ||
    opening?.opening_allocation_policy !==
      "pro_rata_largest_remainder_v1"
  ) {
    fail("current_coupled_opening_policy_mismatch");
  }

  return Object.freeze({
    schema: "void.presale-wc-void-current-deployment-commitment.v1",
    version: 1,
    chain_id: 2050,
    presale: Object.freeze({
      policy_marker: "VOID_BUY_VOID_CANONICAL_PRESALE_ECONOMICS_DUAL_RAIL_V1",
      canonical_presale_max_void: "10000000",
      rate_void_units_numerator: "2",
      rate_void_units_denominator: "1",
    }),
    wc_void: Object.freeze({
      pair: "WC_VOID",
      protocol_void_inventory_atoms: opening.protocol_void_inventory_atoms,
      opening_sale_tranche_void_atoms: opening.opening_sale_tranche_void_atoms,
      post_opening_void_reserve_atoms: opening.post_opening_void_reserve_atoms,
      protocol_wc_seed_units: opening.protocol_wc_seed_units,
      fixed_conversion: opening.fixed_conversion,
      fixed_opening_price: opening.fixed_opening_price,
      opening_price_source: opening.opening_price_source,
      opening_allocation_policy: opening.opening_allocation_policy,
    }),
    market_vault: Object.freeze({
      contract_name: "WCVoidMarketVaultV2",
      compiled_identity_id: CURRENT_IDENTITY,
      creation_bytecode_sha256: CURRENT_CREATION,
      runtime_template_sha256: CURRENT_RUNTIME,
      immutable_layout_sha256: IMMUTABLE_LAYOUT,
    }),
    launch_order: Object.freeze({
      presale_wc_void_simultaneous_launch: true,
      presale_launch_requires_wc_void_activation_ready: true,
      wc_void_launch_requires_presale_activation_ready: true,
    }),
  });
}

function currentRoleCandidatesFromSources() {
  const walletSource = fs.readFileSync(path.join(ROOT, WALLET_REL), "utf8");
  if (
    !walletSource.includes(
      'expected_wallet_address: "0xc884f631c3881b8b672bfcbf019c856146cd7f73"',
    ) ||
    !walletSource.includes(
      'derived_wallet_address: "0xc884f631c3881b8b672bfcbf019c856146cd7f73"',
    ) ||
    !walletSource.includes("exact_wallet_binding: true")
  ) {
    fail("current_settlement_executor_binding_mismatch");
  }

  const sovereign = readJson(SOVEREIGN_REL);
  if (
    sovereign?.marker !==
      "VOID_CHAIN2050_ROLE_AUTHORITY_SOVEREIGN_GENESIS_APPEND_AUTHORIZATION_V1" ||
    String(sovereign?.owner_address || "").toLowerCase() !==
      "0xe1f147b6b2671f140c4107fa4a1dd5f7cbd06d0b"
  ) {
    fail("current_closeout_controller_binding_mismatch");
  }

  return Object.freeze({
    settlement_executor: Object.freeze({
      address: "0xc884f631c3881b8b672bfcbf019c856146cd7f73",
      current_identity_binding_verified: true,
      wc_void_authority_expansion_authorized: false,
      role_authorized: false,
    }),
    closeout_controller: Object.freeze({
      address: "0xe1f147b6b2671f140c4107fa4a1dd5f7cbd06d0b",
      current_identity_binding_verified: true,
      wc_void_authority_expansion_authorized: false,
      role_authorized: false,
    }),
  });
}

export function verifyCurrentDeploymentRequalificationCandidateV1(candidate) {
  assertReviewedGeneration();

  const commitment = currentCommitmentFromSources();
  const derivedLaunchId = deriveCurrentCoupledLaunchIdV1(commitment);
  if (derivedLaunchId !== CURRENT_LAUNCH_ID) {
    fail("current_coupled_launch_id_derivation_mismatch");
  }

  const roles = currentRoleCandidatesFromSources();
  if (
    canonicalJson(candidate?.coupled_launch_commitment) !==
      canonicalJson(commitment) ||
    candidate?.coupled_launch_id !== derivedLaunchId ||
    canonicalJson(candidate?.current_role_candidates) !==
      canonicalJson(roles)
  ) {
    fail("candidate_current_source_binding_mismatch");
  }

  if (
    candidate?.marker !==
      VOID_WC_VOID_MARKET_VAULT_CURRENT_DEPLOYMENT_REQUALIFICATION_V1 ||
    candidate?.version !== 1 ||
    candidate?.status !==
      "HOLD_CURRENT_IDENTITY_KEY_CONTINUITY_AND_ROLE_AUTHORIZATION_REQUIRED" ||
    candidate?.reviewed_source_main_commit !== REVIEWED_MAIN ||
    canonicalJson(candidate?.reviewed_source_blobs) !==
      canonicalJson(EXPECTED_BLOBS)
  ) {
    fail("candidate_identity_mismatch");
  }

  const current = candidate.current_market_vault_identity;
  if (
    current?.accepted_identity_id !== CURRENT_IDENTITY ||
    current?.accepted_source_commit !== CURRENT_SOURCE_COMMIT ||
    current?.contract_source_sha256 !== CONTRACT_SOURCE_SHA256 ||
    current?.creation_bytecode_sha256 !== CURRENT_CREATION ||
    current?.runtime_template_sha256 !== CURRENT_RUNTIME ||
    current?.immutable_layout_sha256 !== IMMUTABLE_LAYOUT ||
    current?.compiled_identity_accepted !== true ||
    current?.deployment_attested !== false
  ) {
    fail("candidate_current_identity_mismatch");
  }

  const retired = candidate.retired_sept25_material;
  if (
    retired?.compiled_identity_id === CURRENT_IDENTITY ||
    retired?.coupled_launch_id === CURRENT_LAUNCH_ID ||
    retired?.creation_bytecode_sha256 === CURRENT_CREATION ||
    retired?.runtime_template_sha256 === CURRENT_RUNTIME ||
    retired?.launch_identity_reusable !== false ||
    retired?.deployment_payload_reusable !== false ||
    retired?.predicted_address_reusable !== false ||
    retired?.gas_observation_reusable !== false ||
    retired?.funding_or_signing_authority_reusable !== false
  ) {
    fail("retired_sept25_material_not_closed");
  }

  const launch = candidate?.continuity_candidates?.launch_controller;
  const deployer = candidate?.continuity_candidates?.deployer;
  if (
    launch?.address !== "0x2f1e0005e865b772b268bd8c797bf3eaa901d97e" ||
    launch?.historical_public_identity_sha256 !==
      "7ca273a6b188e64e7099d57e7705345559fe7156c12406cde5097ce47350f431" ||
    launch?.current_key_continuity_verified !== false ||
    launch?.role_authorized !== false ||
    deployer?.address !== "0x907ea7d0d57f5631219674bdf666a7e929613074" ||
    deployer?.historical_public_identity_sha256 !==
      "7e0522e971060ae1bbe1011b01c2d64bb84234c0f7069701a4459f351ee113ac" ||
    deployer?.current_key_continuity_verified !== false ||
    deployer?.deployment_authorized !== false
  ) {
    fail("historical_key_continuity_boundary_invalid");
  }

  const addresses = [
    launch.address,
    deployer.address,
    roles.settlement_executor.address,
    roles.closeout_controller.address,
  ];
  if (
    new Set(addresses).size !== addresses.length ||
    addresses.includes(VOID_TOKEN) ||
    candidate?.separation?.all_role_and_deployer_addresses_distinct !== true ||
    candidate?.separation?.no_role_or_deployer_equals_void_token !== true
  ) {
    fail("candidate_role_separation_invalid");
  }

  const expectedNext = [
    "launch_controller_key_continuity_revalidation_required",
    "deployer_key_continuity_revalidation_required",
    "fresh_exact_role_binding_authorization_required",
    "current_creation_bytecode_deployment_preparation_required",
    "fresh_read_only_deployer_observation_required",
  ];
  if (canonicalJson(candidate?.next_gates) !== canonicalJson(expectedNext)) {
    fail("candidate_next_gates_mismatch");
  }

  const authority = candidate?.authority || {};
  for (const [key, value] of Object.entries(authority)) {
    if (key === "source_requalification_only") {
      if (value !== true) fail("candidate_authority_boundary_invalid");
    } else if (value !== false) {
      fail("candidate_authority_boundary_invalid");
    }
  }

  return Object.freeze({
    ok: true,
    status: candidate.status,
    coupled_launch_id: derivedLaunchId,
    current_compiled_identity_id: CURRENT_IDENTITY,
    current_creation_bytecode_sha256: CURRENT_CREATION,
    current_runtime_template_sha256: CURRENT_RUNTIME,
    historical_launch_controller_continuity_verified: false,
    historical_deployer_continuity_verified: false,
    fresh_role_authorization_required: true,
    deployment_preparation_authorized: false,
    rpc_call: false,
    credential_access: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_broadcast: false,
    deployment: false,
    funds_movement: false,
  });
}

export function loadAndVerifyCurrentDeploymentRequalificationCandidateV1() {
  return verifyCurrentDeploymentRequalificationCandidateV1(readJson(CANDIDATE_REL));
}

const direct =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (direct) {
  try {
    const result = loadAndVerifyCurrentDeploymentRequalificationCandidateV1();
    console.log(VOID_WC_VOID_MARKET_VAULT_CURRENT_DEPLOYMENT_REQUALIFICATION_V1);
    console.log("status=" + result.status);
    console.log("coupled_launch_id=" + result.coupled_launch_id);
    console.log("current_compiled_identity_id=" + result.current_compiled_identity_id);
    console.log("sept25_deployment_material_reusable=false");
    console.log("launch_controller_key_continuity_verified=false");
    console.log("deployer_key_continuity_verified=false");
    console.log("fresh_role_authorization_required=true");
    console.log("deployment_preparation_authorized=false");
    console.log("rpc_call=false");
    console.log("credential_access=false");
    console.log("transaction_construction=false");
    console.log("transaction_signing=false");
    console.log("transaction_broadcast=false");
    console.log("deployment=false");
    console.log("funds_movement=false");
    console.log(
      "VOID_WC_VOID_MARKET_VAULT_CURRENT_DEPLOYMENT_REQUALIFICATION_V1_GREEN",
    );
  } catch (error) {
    console.error(
      "VOID_WC_VOID_MARKET_VAULT_CURRENT_DEPLOYMENT_REQUALIFICATION_V1_HOLD",
    );
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 2;
  }
}

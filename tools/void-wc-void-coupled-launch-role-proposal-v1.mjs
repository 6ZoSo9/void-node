#!/usr/bin/env node
import crypto from "node:crypto";

export const VOID_WC_VOID_COUPLED_LAUNCH_ROLE_PROPOSAL_V1 =
  "VOID_WC_VOID_COUPLED_LAUNCH_ROLE_PROPOSAL_V1";

export const EXPECTED_COUPLED_LAUNCH_ID =
  "0xfb6584220f298f239a4c6a77ff1faa274300a61597eeae85272cdda9e17f1c83";

export const CANONICAL_VOID_TOKEN =
  "0x470075b85352eb86f7d089fb9ba88945f12aad94";

const ADDRESS = /^0x[0-9a-fA-F]{40}$/u;
const BYTES32 = /^0x[0-9a-fA-F]{64}$/u;

export function canonicalJson(value) {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalJson).join(",") + "]";
  }
  return (
    "{" +
    Object.keys(value)
      .sort()
      .map((key) => JSON.stringify(key) + ":" + canonicalJson(value[key]))
      .join(",") +
    "}"
  );
}

export function deriveCoupledLaunchId(commitment) {
  const digest = crypto
    .createHash("sha256")
    .update(canonicalJson(commitment))
    .digest("hex");
  return "0x" + digest;
}

function fail(code) {
  const error = new Error(code);
  error.code = code;
  throw error;
}

function normalizedAddress(value, code) {
  if (typeof value !== "string" || !ADDRESS.test(value)) fail(code);
  const normalized = value.toLowerCase();
  if (normalized === "0x" + "0".repeat(40)) fail(code);
  return normalized;
}

export function verifyCoupledLaunchRoleProposalV1(proposal) {
  if (!proposal || typeof proposal !== "object" || Array.isArray(proposal)) {
    fail("proposal_shape_invalid");
  }
  if (
    proposal.marker !== VOID_WC_VOID_COUPLED_LAUNCH_ROLE_PROPOSAL_V1 ||
    proposal.version !== 1 ||
    proposal.status !== "proposal_not_authority" ||
    proposal.chain_id !== 2050
  ) {
    fail("proposal_identity_invalid");
  }

  const commitment = proposal.coupled_launch_commitment;
  if (
    commitment?.schema !==
      "void.presale-wc-void-coupled-launch-commitment.v1" ||
    commitment?.version !== 1 ||
    commitment?.chain_id !== 2050 ||
    commitment?.presale?.pool_id !== "buy-void-presale-v1" ||
    commitment?.presale?.inventory_policy_version !== "presale-v1" ||
    commitment?.presale?.canonical_presale_max_void !== "10000000" ||
    commitment?.presale?.rate_void_units_numerator !== "2" ||
    commitment?.presale?.rate_void_units_denominator !== "1" ||
    commitment?.wc_void?.pair !== "WC_VOID" ||
    commitment?.wc_void?.protocol_void_inventory_atoms !==
      "10000000000000000000000000" ||
    commitment?.wc_void?.protocol_wc_seed_units !== "0" ||
    commitment?.wc_void?.opening_price_source !==
      "settled_wc_reserve_ratio" ||
    commitment?.market_vault?.contract_name !== "WCVoidMarketVaultV2" ||
    commitment?.market_vault?.compiled_identity_id !==
      "voidwcvci1_f4096e7c4520897d656a64a8be5b344a3541e0e960226787654415f867f2d045" ||
    commitment?.market_vault?.creation_bytecode_sha256 !==
      "84bbf44ee873c9e8b271271d8d3dc10bf6bb58d38b0d7da26558275510c0d540" ||
    commitment?.market_vault?.runtime_template_sha256 !==
      "99a7179850af5a6e13c1a1b24cf873b011a98fcc8d54479722c20fc254188f7e" ||
    commitment?.market_vault?.immutable_layout_sha256 !==
      "61de8af4e7f5a960227cb76383b7e48d52ddceb305d043f6905812deeb02d33b" ||
    commitment?.launch_order?.presale_wc_void_simultaneous_launch !== true ||
    commitment?.launch_order?.presale_launch_requires_wc_void_activation_ready !== true ||
    commitment?.launch_order?.wc_void_launch_requires_presale_activation_ready !== true
  ) {
    fail("coupled_launch_commitment_mismatch");
  }

  const derived = deriveCoupledLaunchId(commitment);
  if (!BYTES32.test(proposal.coupled_launch_id) || proposal.coupled_launch_id !== derived) {
    fail("coupled_launch_id_mismatch");
  }
  if (derived !== EXPECTED_COUPLED_LAUNCH_ID) {
    fail("unexpected_coupled_launch_id");
  }

  const launch = normalizedAddress(
    proposal.role_candidates?.launch_controller?.address,
    "launch_controller_candidate_invalid",
  );
  const settlement = normalizedAddress(
    proposal.role_candidates?.settlement_executor?.address,
    "settlement_executor_candidate_invalid",
  );
  const closeout = normalizedAddress(
    proposal.role_candidates?.closeout_controller?.address,
    "closeout_controller_candidate_invalid",
  );

  if (new Set([launch, settlement, closeout]).size !== 3) {
    fail("role_candidates_not_distinct");
  }
  if ([launch, settlement, closeout].includes(CANONICAL_VOID_TOKEN)) {
    fail("role_candidate_equals_void_token");
  }

  if (
    proposal.role_candidates.launch_controller.source_label !==
      "wc_void_launch_controller_dedicated_offline_key" ||
    proposal.role_candidates.launch_controller.evidence_path !==
      "ops/mainnet0/wc-void-launch-controller-offline-generation-evidence-v1.json" ||
    proposal.role_candidates.launch_controller.evidence_class !==
      "fresh_offline_dedicated_key_generation" ||
    proposal.role_candidates.launch_controller.key_availability_verified !== true ||
    proposal.role_candidates.launch_controller.signing_challenge_verified !== false ||
    proposal.role_candidates.launch_controller.role_authority_approved !== false ||
    proposal.role_candidates.settlement_executor.source_label !==
      "BuyVoidFulfillmentWallet" ||
    proposal.role_candidates.settlement_executor
      .authority_expansion_from_presale_to_wc_void_market_approved !== false ||
    proposal.role_candidates.settlement_executor.role_authority_approved !== false ||
    proposal.role_candidates.closeout_controller.source_label !==
      "sovereign_owner_address" ||
    proposal.role_candidates.closeout_controller
      .authority_expansion_to_wc_void_closeout_approved !== false ||
    proposal.role_candidates.closeout_controller.role_authority_approved !== false
  ) {
    fail("candidate_approval_boundary_invalid");
  }

  if (
    proposal.approval?.sovereign_review_required !== true ||
    proposal.approval?.sovereign_approved !== false ||
    proposal.approval?.role_binding_authorized !== false ||
    proposal.approval?.approval_scope !== null
  ) {
    fail("proposal_must_remain_unapproved");
  }

  for (const [key, value] of Object.entries(proposal.authority ?? {})) {
    if (key === "proposal_only") {
      if (value !== true) fail("proposal_authority_boundary_invalid");
    } else if (value !== false) {
      fail("proposal_authority_boundary_invalid");
    }
  }

  return Object.freeze({
    ok: true,
    status: "PROPOSAL_VERIFIED_NOT_AUTHORIZED",
    coupled_launch_id: derived,
    launch_controller_candidate: launch,
    settlement_executor_candidate: settlement,
    closeout_controller_candidate: closeout,
    role_binding_authorized: false,
    market_activation_authorized: false,
    public_presale_activation_authorized: false,
    funds_movement_authorized: false,
  });
}

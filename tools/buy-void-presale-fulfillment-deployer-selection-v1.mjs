#!/usr/bin/env node
import { getAddress } from "ethers";

export const VOID_BUY_VOID_PRESALE_FULFILLMENT_DEPLOYER_SELECTION_V1 =
  "VOID_BUY_VOID_PRESALE_FULFILLMENT_DEPLOYER_SELECTION_V1";

export const VOID_BUY_VOID_PRESALE_FULFILLMENT_DEPLOYER_SELECTION_AUTHORITY_V1 = {
  explicit_candidate_only: true,
  human_selection_required: true,
  role_collision_detection_only: true,
  live_code_check_required_later: true,
  live_balance_check_required_later: true,
  pending_nonce_observation_required_later: true,
  rpc_call: false,
  credential_access: false,
  wallet_access: false,
  signing: false,
  transaction_construction: false,
  transaction_broadcast: false,
  deployment: false,
  chain2050_mutation: false,
  inventory_funding: false,
  production_configuration_mutation: false,
  runtime_enablement_change: false,
  public_activation: false,
  money_movement: false,
};

const ZERO =
  "0x0000000000000000000000000000000000000000";

export const VOID_BUY_VOID_PRESALE_FULFILLMENT_DEPLOYER_KNOWN_ROLES_V1 = {
  canonical_contracts: {
    void_token:
      "0x470075b85352eb86f7d089fb9ba88945f12aad94",
    void_treasury:
      "0x554ecc7be6f0b7cc3d1c578c2bb848e535c02514",
    ops_treasury:
      "0xf0d64c62a87034e1838db8ec1e2e33666814e7d9",
    admin_gate:
      "0xdadb70747fb39e79c867811f5a5592c1611bcb52",
    config_gate:
      "0xcf4239ec209bbdb25f5c22903a5aa2050752dd24",
    validator_set:
      "0x4b3f78e86b0427f750938e7b022d98aa4275f2f7",
    emissions_controller:
      "0x72b2dead8ce4728a1f3b800f96502a7ace091b81",
    reward_engine:
      "0xe2670614ab3cab77999847f3fd2ff6fc34fe2292",
    upgrade_staking:
      "0x77dfeedd19a4741f299c902ad5bbe0de917a9e59",
  },
  dedicated_runtime_roles: {
    fulfillment_wallet:
      "0xc884f631c3881b8b672bfcbf019c856146cd7f73",
  },
  privileged_eoa_roles: {
    validator_admin:
      "0x8dc0d4abc9ecd40b5e8f6b4c2fe1370822e52bc4",
    admin_gate_master_key:
      "0x5730ca2ac38f0e39bf46c121fbdf581638fa72bc",
  },
  other_named_eoa_roles: {
    validator0_reward:
      "0xd2571d5d471d6574f7d57d0a3aca5b34d0c8da6f",
  },
};

function normalize(value) {
  if (
    typeof value !== "string" ||
    !/^0x[0-9a-fA-F]{40}$/.test(
      value.trim(),
    )
  ) {
    return "";
  }
  try {
    return getAddress(
      value.trim(),
    ).toLowerCase();
  } catch {
    return "";
  }
}

function findRole(candidate) {
  for (const [group, roles] of Object.entries(
    VOID_BUY_VOID_PRESALE_FULFILLMENT_DEPLOYER_KNOWN_ROLES_V1,
  )) {
    for (const [role, address] of Object.entries(
      roles,
    )) {
      if (candidate === address) {
        return {
          group,
          role,
          address,
        };
      }
    }
  }
  return null;
}

function held(reason, candidate, detail = undefined) {
  return {
    ok: false,
    status: "held",
    marker:
      VOID_BUY_VOID_PRESALE_FULFILLMENT_DEPLOYER_SELECTION_V1,
    version: 1,
    reason,
    candidate_address:
      candidate || null,
    candidate_selected: false,
    live_code_checked: false,
    live_balance_checked: false,
    pending_nonce_observed: false,
    future_contract_address_derived: false,
    deployment_authorized: false,
    ...(detail
      ? { detail }
      : {}),
    authority:
      VOID_BUY_VOID_PRESALE_FULFILLMENT_DEPLOYER_SELECTION_AUTHORITY_V1,
  };
}

export function reviewBuyVoidPresaleFulfillmentDeployerCandidateV1(
  candidateInput,
) {
  const candidate =
    normalize(candidateInput);

  if (!candidate) {
    return held(
      "deployer_candidate_address_invalid",
      "",
    );
  }

  if (candidate === ZERO) {
    return held(
      "deployer_candidate_zero_address_forbidden",
      candidate,
    );
  }

  const role =
    findRole(candidate);

  if (
    role?.group ===
    "canonical_contracts"
  ) {
    return held(
      "deployer_candidate_canonical_contract_role_forbidden",
      candidate,
      role,
    );
  }

  if (
    role?.group ===
    "dedicated_runtime_roles"
  ) {
    return held(
      "deployer_candidate_fulfillment_wallet_role_reuse_forbidden",
      candidate,
      role,
    );
  }

  if (
    role?.group ===
    "privileged_eoa_roles"
  ) {
    return held(
      "deployer_candidate_privileged_eoa_role_reuse_requires_separate_explicit_exception",
      candidate,
      role,
    );
  }

  if (
    role?.group ===
    "other_named_eoa_roles"
  ) {
    return held(
      "deployer_candidate_existing_named_eoa_role_reuse_requires_separate_explicit_exception",
      candidate,
      role,
    );
  }

  return {
    ok: true,
    status:
      "candidate_shape_eligible_human_selection_required",
    marker:
      VOID_BUY_VOID_PRESALE_FULFILLMENT_DEPLOYER_SELECTION_V1,
    version: 1,
    candidate_address:
      candidate,
    known_role_collision: false,
    candidate_selected: false,
    human_selection_required: true,
    live_code_checked: false,
    live_balance_checked: false,
    pending_nonce_observed: false,
    future_contract_address_derived: false,
    deployment_authorized: false,
    next_gate:
      "human_select_candidate_then_run_read_only_deployment_resolution_observer",
    authority:
      VOID_BUY_VOID_PRESALE_FULFILLMENT_DEPLOYER_SELECTION_AUTHORITY_V1,
  };
}

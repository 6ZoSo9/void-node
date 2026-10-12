#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  VOID_BUY_VOID_PRESALE_FULFILLMENT_DEPLOYER_KNOWN_ROLES_V1,
  VOID_BUY_VOID_PRESALE_FULFILLMENT_DEPLOYER_SELECTION_AUTHORITY_V1,
  VOID_BUY_VOID_PRESALE_FULFILLMENT_DEPLOYER_SELECTION_V1,
  reviewBuyVoidPresaleFulfillmentDeployerCandidateV1,
} from "../tools/buy-void-presale-fulfillment-deployer-selection-v1.mjs";

const ROOT = process.cwd();

const deployment = JSON.parse(
  fs.readFileSync(
    path.join(
      ROOT,
      "ops/mainnet/void-mainnet.deployed.json",
    ),
    "utf8",
  ),
);

const allocation = JSON.parse(
  fs.readFileSync(
    path.join(
      ROOT,
      "ops/mainnet/mainnet0-premine-allocation.current.json",
    ),
    "utf8",
  ),
);

const roles =
  VOID_BUY_VOID_PRESALE_FULFILLMENT_DEPLOYER_KNOWN_ROLES_V1;

assert.equal(
  deployment.chainId,
  2050,
);
assert.equal(
  String(
    deployment.contracts.VoidToken,
  ).toLowerCase(),
  roles.canonical_contracts.void_token,
);
assert.equal(
  String(
    deployment.contracts.VoidTreasury,
  ).toLowerCase(),
  roles.canonical_contracts.void_treasury,
);
assert.equal(
  String(
    deployment.contracts.OpsTreasury,
  ).toLowerCase(),
  roles.canonical_contracts.ops_treasury,
);
assert.equal(
  String(
    deployment.contracts.AdminGate,
  ).toLowerCase(),
  roles.canonical_contracts.admin_gate,
);
assert.equal(
  String(
    deployment.contracts.ConfigGate,
  ).toLowerCase(),
  roles.canonical_contracts.config_gate,
);
assert.equal(
  String(
    deployment.contracts.ValidatorSet,
  ).toLowerCase(),
  roles.canonical_contracts.validator_set,
);
assert.equal(
  String(
    deployment.contracts.EmissionsController,
  ).toLowerCase(),
  roles.canonical_contracts.emissions_controller,
);
assert.equal(
  String(
    deployment.contracts.RewardEngine,
  ).toLowerCase(),
  roles.canonical_contracts.reward_engine,
);

assert.equal(
  String(
    deployment.handoff.final.validatorAdmin,
  ).toLowerCase(),
  roles.privileged_eoa_roles.validator_admin,
);
assert.equal(
  String(
    deployment.handoff.final.adminGateMasterKey,
  ).toLowerCase(),
  roles.privileged_eoa_roles.admin_gate_master_key,
);
assert.equal(
  String(
    deployment.handoff.validator0.reward,
  ).toLowerCase(),
  roles.other_named_eoa_roles.validator0_reward,
);

const fulfillmentHolder =
  allocation.observed_zero_balances.find(
    (entry) =>
      entry.label ===
      "BuyVoidFulfillmentWallet",
  );
assert.ok(fulfillmentHolder);
assert.equal(
  String(
    fulfillmentHolder.address,
  ).toLowerCase(),
  roles.dedicated_runtime_roles.fulfillment_wallet,
);

const upgradeStaking =
  allocation.current_nonzero_holders.find(
    (entry) =>
      entry.label ===
      "UpgradeStaking",
  );
assert.ok(upgradeStaking);
assert.equal(
  String(
    upgradeStaking.address,
  ).toLowerCase(),
  roles.canonical_contracts.upgrade_staking,
);

assert.equal(
  VOID_BUY_VOID_PRESALE_FULFILLMENT_DEPLOYER_SELECTION_V1,
  "VOID_BUY_VOID_PRESALE_FULFILLMENT_DEPLOYER_SELECTION_V1",
);

function held(address, reason) {
  const value =
    reviewBuyVoidPresaleFulfillmentDeployerCandidateV1(
      address,
    );
  assert.equal(value.ok, false);
  if (value.ok) {
    throw new Error(
      "expected held deployer candidate",
    );
  }
  assert.equal(
    value.reason,
    reason,
  );
  assert.equal(
    value.candidate_selected,
    false,
  );
  assert.equal(
    value.live_code_checked,
    false,
  );
  assert.equal(
    value.live_balance_checked,
    false,
  );
  assert.equal(
    value.pending_nonce_observed,
    false,
  );
  assert.equal(
    value.future_contract_address_derived,
    false,
  );
  assert.equal(
    value.deployment_authorized,
    false,
  );
  return value;
}

held(
  "not-an-address",
  "deployer_candidate_address_invalid",
);

held(
  "0x0000000000000000000000000000000000000000",
  "deployer_candidate_zero_address_forbidden",
);

for (const address of Object.values(
  roles.canonical_contracts,
)) {
  const value = held(
    address,
    "deployer_candidate_canonical_contract_role_forbidden",
  );
  assert.equal(
    value.detail.group,
    "canonical_contracts",
  );
}

{
  const value = held(
    roles.dedicated_runtime_roles
      .fulfillment_wallet,
    "deployer_candidate_fulfillment_wallet_role_reuse_forbidden",
  );
  assert.equal(
    value.detail.role,
    "fulfillment_wallet",
  );
}

for (const address of Object.values(
  roles.privileged_eoa_roles,
)) {
  const value = held(
    address,
    "deployer_candidate_privileged_eoa_role_reuse_requires_separate_explicit_exception",
  );
  assert.equal(
    value.detail.group,
    "privileged_eoa_roles",
  );
}

{
  const value = held(
    roles.other_named_eoa_roles
      .validator0_reward,
    "deployer_candidate_existing_named_eoa_role_reuse_requires_separate_explicit_exception",
  );
  assert.equal(
    value.detail.role,
    "validator0_reward",
  );
}

const eligible =
  reviewBuyVoidPresaleFulfillmentDeployerCandidateV1(
    "0x1234567890abcdef1234567890abcdef12345678",
  );

assert.equal(eligible.ok, true);
if (eligible.ok === false) {
  throw new Error(eligible.reason);
}
assert.equal(
  eligible.status,
  "candidate_shape_eligible_human_selection_required",
);
assert.equal(
  eligible.candidate_address,
  "0x1234567890abcdef1234567890abcdef12345678",
);
assert.equal(
  eligible.known_role_collision,
  false,
);
assert.equal(
  eligible.candidate_selected,
  false,
);
assert.equal(
  eligible.human_selection_required,
  true,
);
assert.equal(
  eligible.live_code_checked,
  false,
);
assert.equal(
  eligible.live_balance_checked,
  false,
);
assert.equal(
  eligible.pending_nonce_observed,
  false,
);
assert.equal(
  eligible.future_contract_address_derived,
  false,
);
assert.equal(
  eligible.deployment_authorized,
  false,
);
assert.equal(
  eligible.next_gate,
  "human_select_candidate_then_run_read_only_deployment_resolution_observer",
);

for (const [key, expected] of Object.entries({
  explicit_candidate_only: true,
  human_selection_required: true,
  role_collision_detection_only: true,
  live_code_check_required_later: true,
  live_balance_check_required_later: true,
  pending_nonce_observation_required_later:
    true,
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
})) {
  assert.equal(
    VOID_BUY_VOID_PRESALE_FULFILLMENT_DEPLOYER_SELECTION_AUTHORITY_V1[
      key
    ],
    expected,
    key,
  );
}

const source = fs.readFileSync(
  path.join(
    ROOT,
    "tools/buy-void-presale-fulfillment-deployer-selection-v1.mjs",
  ),
  "utf8",
);

for (const forbidden of [
  "JsonRpcProvider",
  "eth_",
  "fetch(",
  "node:http",
  "node:https",
  "private_key",
  "mnemonic",
  "Wallet(",
  "sendTransaction",
  "broadcastTransaction",
  "systemctl",
]) {
  assert.equal(
    source.includes(forbidden),
    false,
    "selection contract contains forbidden operation " +
      forbidden,
  );
}

console.log(
  "VOID_BUY_VOID_PRESALE_FULFILLMENT_DEPLOYER_SELECTION_V1_PROOF_GREEN",
);
console.log("known_mainnet0_contract_roles_bound=true");
console.log("fulfillment_wallet_role_reuse_forbidden=true");
console.log("privileged_eoa_role_reuse_requires_exception=true");
console.log("existing_named_eoa_role_reuse_requires_exception=true");
console.log("unknown_candidate_auto_selected=false");
console.log("human_selection_required=true");
console.log("live_rpc=false");
console.log("credential_access=false");
console.log("wallet_access=false");
console.log("signing=false");
console.log("transaction_construction=false");
console.log("transaction_broadcast=false");
console.log("deployment=false");
console.log("chain2050_mutation=false");

import assert from "node:assert/strict";
import { AbiCoder } from "ethers";

import {
  VOID_BUY_VOID_PRESALE_FULFILLMENT_DEPLOYMENT_PREPARATION_AUTHORITY_V1,
  VOID_BUY_VOID_PRESALE_FULFILLMENT_DEPLOYMENT_PREPARATION_DECISION_V1,
  VOID_BUY_VOID_PRESALE_FULFILLMENT_DEPLOYMENT_PREPARATION_RECORD_V1,
  VOID_BUY_VOID_PRESALE_FULFILLMENT_DEPLOYMENT_PREPARATION_V1,
} from "../src/economic/buy_void_presale_fulfillment_deployment_preparation_v1.js";
import {
  VOID_BUY_VOID_ERC20_PRODUCTION_CONFIGURATION_CANDIDATE_V1,
} from "../src/economic/buy_void_erc20_production_configuration_candidate_binding_v1.js";
import {
  VOID_BUY_VOID_ERC20_PRODUCTION_CREDENTIAL_BINDING_EVIDENCE_ID_V1,
  VOID_BUY_VOID_ERC20_PRODUCTION_CREDENTIAL_BINDING_EVIDENCE_RECORD_V1,
} from "../src/economic/buy_void_erc20_production_credential_binding_evidence_v1.js";

const record =
  VOID_BUY_VOID_PRESALE_FULFILLMENT_DEPLOYMENT_PREPARATION_RECORD_V1;
const inherited =
  VOID_BUY_VOID_ERC20_PRODUCTION_CONFIGURATION_CANDIDATE_V1;

assert.equal(
  record.marker,
  VOID_BUY_VOID_PRESALE_FULFILLMENT_DEPLOYMENT_PREPARATION_V1,
);
assert.equal(record.version, 1);
assert.equal(
  record.decision,
  VOID_BUY_VOID_PRESALE_FULFILLMENT_DEPLOYMENT_PREPARATION_DECISION_V1,
);
assert.equal(
  record.status,
  "source_preparation_ready_held_on_deployer_nonce_gas_and_authorization",
);

assert.equal(
  record.source.reviewed_main_commit,
  "e262ab8c900c9b4ee08b50d8e4c1ae633006b1dd",
);
assert.equal(
  record.source.compiled_identity_id,
  "voidbvpfci1_62d981d2478fe8e8c58740bd65a104f9950e722cf43405d45f4789076be37566",
);
assert.equal(
  record.source.compiled_identity_json_sha256,
  "695f5c4bd8b3561b0d43ba6f246b636b906bcbe11a81038fdf76ad8d52b8c330",
);
assert.equal(
  record.source.creation_bytecode_sha256,
  "ef0b7cfbe195b2196860715a8ce1d9bec6d65d8ca234cd7502c2cffd6ee0fab2",
);
assert.equal(
  record.source.creation_bytecode_keccak256,
  "0x14f68a6c6a69d87105129ae1901f8aa3d103518828a7795f08bf5b00d4b188c3",
);
assert.equal(
  record.source.runtime_template_sha256,
  "bf349d39ade578ab06ba44881b3ddc43e88c752eefc75291f9196e883c435885",
);
assert.equal(
  record.source.runtime_template_keccak256,
  "0xfe85fd25582fd367a4be4ea8a7b25d7d17cebc7763800ceeae88e6071bd6686e",
);

assert.equal(record.chain.chain_id, "2050");
assert.equal(
  record.chain.rpc_url,
  inherited.VOID_BUY_VOID_ERC20_EXECUTION_RPC_URL,
);
assert.equal(
  record.chain.rpc_url,
  "http://127.0.0.1:8545/",
);
assert.equal(
  record.chain.live_rpc_observed,
  false,
);

const token =
  inherited.VOID_BUY_VOID_DELIVERY_TOKEN_ADDRESS.toLowerCase();
const wallet =
  inherited.VOID_BUY_VOID_DELIVERY_WALLET_ADDRESS.toLowerCase();
const zero =
  "0x0000000000000000000000000000000000000000";

assert.equal(
  record.constructor.void_token_address,
  token,
);
assert.equal(
  record.constructor.fulfiller_address,
  wallet,
);
assert.equal(
  record.constructor.predecessor_address,
  zero,
);
assert.equal(
  record.constructor.predecessor_mode,
  "genesis_zero",
);
assert.equal(
  record.constructor.signature,
  "constructor(address,address,address)",
);
assert.deepEqual(
  record.constructor.argument_order,
  ["void_token", "fulfiller", "predecessor"],
);

const expectedConstructor =
  AbiCoder.defaultAbiCoder()
    .encode(
      ["address", "address", "address"],
      [token, wallet, zero],
    )
    .toLowerCase();
assert.equal(
  record.constructor.abi_encoded_arguments,
  expectedConstructor,
);

assert.equal(
  record.inherited_runtime_policy.runtime_enabled,
  "0",
);
assert.equal(
  record.inherited_runtime_policy.runtime_apply_enabled,
  "0",
);
assert.equal(
  record.inherited_runtime_policy.runtime_root,
  "/var/lib/void/buy-void/runtime-integration-v1",
);
assert.equal(
  record.inherited_runtime_policy.void_token_address,
  token,
);
assert.equal(
  record.inherited_runtime_policy.fulfillment_wallet_address,
  wallet,
);
assert.equal(
  record.inherited_runtime_policy.rpc_url,
  "http://127.0.0.1:8545/",
);
assert.equal(
  record.inherited_runtime_policy.gas_limit_multiplier_bps,
  "12000",
);
assert.equal(
  record.inherited_runtime_policy.fee_multiplier_bps,
  "20000",
);
assert.equal(
  record.inherited_runtime_policy.max_fee_per_gas_wei,
  "3000000000",
);
assert.equal(
  record.inherited_runtime_policy.max_priority_fee_per_gas_wei,
  "1000000000",
);
assert.equal(
  record.inherited_runtime_policy.min_confirmations,
  "3",
);
assert.equal(
  record.inherited_runtime_policy.request_timeout_ms,
  "5000",
);
assert.equal(
  record.inherited_runtime_policy.max_response_bytes,
  "65536",
);
assert.equal(
  record.inherited_runtime_policy.credential_binding_evidence_id,
  VOID_BUY_VOID_ERC20_PRODUCTION_CREDENTIAL_BINDING_EVIDENCE_ID_V1,
);
assert.equal(
  record.inherited_runtime_policy.credential_id,
  VOID_BUY_VOID_ERC20_PRODUCTION_CREDENTIAL_BINDING_EVIDENCE_RECORD_V1
    .credential_id,
);

// Critical migration guard: the bare ERC-20 transfer gas ceiling is
// intentionally NOT inherited into payment-keyed fulfill(...).
assert.equal(
  inherited.VOID_BUY_VOID_DELIVERY_MAX_GAS_LIMIT,
  "100000",
);
assert.equal(
  record.inherited_runtime_policy.payment_keyed_max_gas_limit,
  null,
);

assert.equal(
  record.canonical_presale_economics.pool_id,
  "buy-void-presale-v1",
);
assert.equal(
  record.canonical_presale_economics.inventory_policy_version,
  "presale-v1",
);
assert.equal(
  record.canonical_presale_economics.canonical_presale_max_void,
  "10000000",
);
assert.equal(
  record.canonical_presale_economics.pool_capacity_void_units,
  "10000000000000",
);
assert.equal(
  record.canonical_presale_economics.max_reservation_void_units,
  "10000000000000",
);
assert.equal(
  record.canonical_presale_economics.lifetime_cap_token_atoms,
  "10000000000000000000000000",
);

for (const [key, value] of Object.entries(
  record.unresolved,
)) {
  assert.equal(
    value,
    null,
    "unresolved field " + key + " must remain null",
  );
}

assert.deepEqual(
  record.ordered_gates,
  [
    "review_and_accept_this_source_preparation",
    "separately_authorize_read_only_deployer_nonce_and_fee_observation",
    "bind_deployer_address_and_pending_nonce",
    "review_payment_keyed_fulfill_gas_ceiling_before_runtime_candidate_promotion",
    "construct_exact_unsigned_eip1559_deployment_transaction_without_signing",
    "separately_review_future_create_address_and_unsigned_transaction",
    "obtain_explicit_deployment_signing_and_broadcast_authorization",
    "broadcast_once_and_capture_receipt",
    "run_exact_read_only_deployment_attestation",
    "separately_attest_inventory_funding",
    "separately_authorize_runtime_and_public_activation",
  ],
);

assert.equal(
  record.next_gate,
  "read_only_deployer_nonce_fee_and_payment_keyed_gas_ceiling_resolution",
);

for (const [key, expected] of Object.entries({
  source_only_binding: true,
  accepted_compiler_identity_required: true,
  canonical_mainnet0_token_binding_required: true,
  canonical_fulfillment_wallet_binding_required: true,
  genesis_predecessor_proposed: true,
  inherited_loopback_rpc_binding: true,
  inherited_fee_caps_binding: true,
  inherited_confirmation_floor_binding: true,
  payment_keyed_max_gas_limit_unresolved: true,
  deployer_binding_unresolved: true,
  deployment_nonce_unresolved: true,
  resulting_contract_address_unresolved: true,
  unsigned_transaction_unresolved: true,
  credential_access: false,
  wallet_access: false,
  rpc_call: false,
  signing: false,
  transaction_broadcast: false,
  deployment: false,
  chain2050_mutation: false,
  inventory_funding: false,
  runtime_enablement_change: false,
  production_configuration_mutation: false,
  public_activation: false,
  money_movement: false,
})) {
  assert.equal(
    (VOID_BUY_VOID_PRESALE_FULFILLMENT_DEPLOYMENT_PREPARATION_AUTHORITY_V1 as any)[key],
    expected,
    key,
  );
}

console.log(
  "VOID_BUY_VOID_PRESALE_FULFILLMENT_DEPLOYMENT_PREPARATION_V1_PROOF_GREEN",
);
console.log("compiled_identity_accepted=true");
console.log("canonical_void_token_bound=true");
console.log("canonical_fulfillment_wallet_bound=true");
console.log("genesis_predecessor_proposed=true");
console.log("loopback_rpc_inherited=true");
console.log("fee_caps_inherited=true");
console.log("confirmation_floor_inherited=true");
console.log("legacy_erc20_gas_ceiling_not_inherited=true");
console.log("payment_keyed_max_gas_limit_unresolved=true");
console.log("deployer_address_unresolved=true");
console.log("deployment_nonce_unresolved=true");
console.log("resulting_contract_address_unresolved=true");
console.log("unsigned_deployment_transaction_unresolved=true");
console.log("live_rpc=false");
console.log("credential_access=false");
console.log("signing=false");
console.log("transaction_broadcast=false");
console.log("deployment=false");
console.log("inventory_funding=false");
console.log("runtime_activation=false");
console.log("public_activation=false");

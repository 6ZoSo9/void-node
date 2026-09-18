import { AbiCoder } from "ethers";

import {
  VOID_BUY_VOID_ERC20_PRODUCTION_CONFIGURATION_CANDIDATE_BINDING_RECORD_V1,
  VOID_BUY_VOID_ERC20_PRODUCTION_CONFIGURATION_CANDIDATE_V1,
} from "./buy_void_erc20_production_configuration_candidate_binding_v1.js";
import {
  VOID_BUY_VOID_CANONICAL_PRESALE_ECONOMICS_V1,
} from "./buy_void_crash_consistent_saga_server_policy_v1.js";
import {
  VOID_BUY_VOID_ERC20_PRODUCTION_CREDENTIAL_BINDING_EVIDENCE_ID_V1,
  VOID_BUY_VOID_ERC20_PRODUCTION_CREDENTIAL_BINDING_EVIDENCE_RECORD_V1,
} from "./buy_void_erc20_production_credential_binding_evidence_v1.js";

export const VOID_BUY_VOID_PRESALE_FULFILLMENT_DEPLOYMENT_PREPARATION_V1 =
  "VOID_BUY_VOID_PRESALE_FULFILLMENT_DEPLOYMENT_PREPARATION_V1";

export const VOID_BUY_VOID_PRESALE_FULFILLMENT_DEPLOYMENT_PREPARATION_DECISION_V1 =
  "HOLD_PENDING_DEPLOYER_NONCE_GAS_REVIEW_UNSIGNED_TRANSACTION_AND_SEPARATE_DEPLOYMENT_AUTHORIZATION";

export const VOID_BUY_VOID_PRESALE_FULFILLMENT_DEPLOYMENT_PREPARATION_AUTHORITY_V1 = {
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
} as const;

const ZERO_ADDRESS =
  "0x0000000000000000000000000000000000000000";

const ACCEPTED_COMPILED_IDENTITY_ID =
  "voidbvpfci1_62d981d2478fe8e8c58740bd65a104f9950e722cf43405d45f4789076be37566";
const ACCEPTED_COMPILED_IDENTITY_JSON_SHA256 =
  "695f5c4bd8b3561b0d43ba6f246b636b906bcbe11a81038fdf76ad8d52b8c330";
const ACCEPTED_CREATION_BYTECODE_SHA256 =
  "ef0b7cfbe195b2196860715a8ce1d9bec6d65d8ca234cd7502c2cffd6ee0fab2";
const ACCEPTED_CREATION_BYTECODE_KECCAK256 =
  "0x14f68a6c6a69d87105129ae1901f8aa3d103518828a7795f08bf5b00d4b188c3";
const ACCEPTED_RUNTIME_TEMPLATE_SHA256 =
  "bf349d39ade578ab06ba44881b3ddc43e88c752eefc75291f9196e883c435885";
const ACCEPTED_RUNTIME_TEMPLATE_KECCAK256 =
  "0xfe85fd25582fd367a4be4ea8a7b25d7d17cebc7763800ceeae88e6071bd6686e";

const inherited =
  VOID_BUY_VOID_ERC20_PRODUCTION_CONFIGURATION_CANDIDATE_V1;

const token =
  inherited.VOID_BUY_VOID_DELIVERY_TOKEN_ADDRESS.toLowerCase();
const wallet =
  inherited.VOID_BUY_VOID_DELIVERY_WALLET_ADDRESS.toLowerCase();
const rpcUrl =
  inherited.VOID_BUY_VOID_ERC20_EXECUTION_RPC_URL;

const encodedConstructorArguments =
  AbiCoder.defaultAbiCoder()
    .encode(
      ["address", "address", "address"],
      [token, wallet, ZERO_ADDRESS],
    )
    .toLowerCase();

export const VOID_BUY_VOID_PRESALE_FULFILLMENT_DEPLOYMENT_PREPARATION_RECORD_V1 = {
  marker:
    VOID_BUY_VOID_PRESALE_FULFILLMENT_DEPLOYMENT_PREPARATION_V1,
  version: 1,
  status:
    "source_preparation_ready_held_on_deployer_nonce_gas_and_authorization",
  decision:
    VOID_BUY_VOID_PRESALE_FULFILLMENT_DEPLOYMENT_PREPARATION_DECISION_V1,

  source: {
    repository: "6ZoSo9/void-node",
    reviewed_main_commit:
      "e262ab8c900c9b4ee08b50d8e4c1ae633006b1dd",
    compiled_identity_artifact_path:
      "ops/mainnet0/buy-void-presale-fulfillment-compiled-identity-v1.json",
    compiled_identity_id:
      ACCEPTED_COMPILED_IDENTITY_ID,
    compiled_identity_json_sha256:
      ACCEPTED_COMPILED_IDENTITY_JSON_SHA256,
    contract_path:
      "contracts/mainnet/BuyVoidPresaleFulfillmentV1.sol",
    creation_bytecode_sha256:
      ACCEPTED_CREATION_BYTECODE_SHA256,
    creation_bytecode_keccak256:
      ACCEPTED_CREATION_BYTECODE_KECCAK256,
    runtime_template_sha256:
      ACCEPTED_RUNTIME_TEMPLATE_SHA256,
    runtime_template_keccak256:
      ACCEPTED_RUNTIME_TEMPLATE_KECCAK256,
  },

  inherited_production_candidate: {
    marker:
      VOID_BUY_VOID_ERC20_PRODUCTION_CONFIGURATION_CANDIDATE_BINDING_RECORD_V1
        .marker,
    reviewed_base_commit_sha:
      VOID_BUY_VOID_ERC20_PRODUCTION_CONFIGURATION_CANDIDATE_BINDING_RECORD_V1
        .reviewed_base_commit_sha,
    reviewed_base_tree_sha:
      VOID_BUY_VOID_ERC20_PRODUCTION_CONFIGURATION_CANDIDATE_BINDING_RECORD_V1
        .reviewed_base_tree_sha,
    production_configuration_applied: false,
    runtime_activation_authorized: false,
    inventory_funding_authorized: false,
  },

  chain: {
    chain_id: "2050",
    rpc_url: rpcUrl,
    rpc_url_inherited_from_reviewed_candidate: true,
    live_rpc_observed: false,
  },

  constructor: {
    signature:
      "constructor(address,address,address)",
    argument_order: [
      "void_token",
      "fulfiller",
      "predecessor",
    ],
    void_token_address: token,
    fulfiller_address: wallet,
    predecessor_address: ZERO_ADDRESS,
    predecessor_mode: "genesis_zero",
    abi_encoded_arguments:
      encodedConstructorArguments,
    creation_bytecode_accepted: true,
    deployment_data_constructible_after_identity_load: true,
  },

  canonical_presale_economics: {
    pool_id:
      VOID_BUY_VOID_CANONICAL_PRESALE_ECONOMICS_V1.pool_id,
    inventory_policy_version:
      VOID_BUY_VOID_CANONICAL_PRESALE_ECONOMICS_V1
        .inventory_policy_version,
    canonical_presale_max_void:
      VOID_BUY_VOID_CANONICAL_PRESALE_ECONOMICS_V1
        .canonical_presale_max_void,
    pool_capacity_void_units:
      VOID_BUY_VOID_CANONICAL_PRESALE_ECONOMICS_V1
        .pool_capacity_void_units,
    max_reservation_void_units:
      VOID_BUY_VOID_CANONICAL_PRESALE_ECONOMICS_V1
        .max_reservation_void_units,
    rate_void_units_numerator:
      VOID_BUY_VOID_CANONICAL_PRESALE_ECONOMICS_V1
        .rate_void_units_numerator,
    rate_void_units_denominator:
      VOID_BUY_VOID_CANONICAL_PRESALE_ECONOMICS_V1
        .rate_void_units_denominator,
    lifetime_cap_token_atoms:
      "10000000000000000000000000",
  },

  inherited_runtime_policy: {
    runtime_enabled: "0",
    runtime_apply_enabled: "0",
    runtime_root:
      inherited.VOID_BUY_VOID_RUNTIME_DIR,
    void_token_address: token,
    fulfillment_wallet_address: wallet,
    rpc_url: rpcUrl,
    gas_limit_multiplier_bps:
      inherited.VOID_BUY_VOID_DELIVERY_GAS_LIMIT_MULTIPLIER_BPS,
    fee_multiplier_bps:
      inherited.VOID_BUY_VOID_DELIVERY_FEE_MULTIPLIER_BPS,
    max_fee_per_gas_wei:
      inherited.VOID_BUY_VOID_DELIVERY_MAX_FEE_PER_GAS_WEI,
    max_priority_fee_per_gas_wei:
      inherited.VOID_BUY_VOID_DELIVERY_MAX_PRIORITY_FEE_PER_GAS_WEI,
    min_confirmations:
      inherited.VOID_BUY_VOID_DELIVERY_MIN_CONFIRMATIONS,
    request_timeout_ms:
      inherited.VOID_BUY_VOID_DELIVERY_RPC_TIMEOUT_MS,
    max_response_bytes:
      inherited.VOID_BUY_VOID_DELIVERY_RPC_MAX_RESPONSE_BYTES,
    credential_binding_evidence_id:
      VOID_BUY_VOID_ERC20_PRODUCTION_CREDENTIAL_BINDING_EVIDENCE_ID_V1,
    credential_id:
      VOID_BUY_VOID_ERC20_PRODUCTION_CREDENTIAL_BINDING_EVIDENCE_RECORD_V1
        .credential_id,
    payment_keyed_max_gas_limit: null,
  },

  unresolved: {
    deployer_address: null,
    deployment_nonce: null,
    resulting_contract_address: null,
    payment_keyed_max_gas_limit: null,
    deployment_gas_limit: null,
    max_fee_per_gas_wei_for_deployment: null,
    max_priority_fee_per_gas_wei_for_deployment: null,
    unsigned_deployment_transaction: null,
    deployment_transaction_hash: null,
    deployment_receipt: null,
    live_runtime_code: null,
    inventory_funding_transaction_hash: null,
  },

  ordered_gates: [
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
  ] as const,

  next_gate:
    "read_only_deployer_nonce_fee_and_payment_keyed_gas_ceiling_resolution",

  authority:
    VOID_BUY_VOID_PRESALE_FULFILLMENT_DEPLOYMENT_PREPARATION_AUTHORITY_V1,
} as const;

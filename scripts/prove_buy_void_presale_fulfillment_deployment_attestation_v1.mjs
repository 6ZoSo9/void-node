#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  getCreateAddress,
  Wallet,
} from "ethers";

import {
  VOID_BUY_VOID_PRESALE_FULFILLMENT_DEPLOYMENT_ATTESTATION_AUTHORITY_V1,
  VOID_BUY_VOID_PRESALE_FULFILLMENT_DEPLOYMENT_ATTESTATION_V1,
  buildBuyVoidPresaleFulfillmentDeploymentDataV1,
  reconstructBuyVoidPresaleFulfillmentRuntimeV1,
  verifyBuyVoidPresaleFulfillmentDeploymentObservationV1,
} from "../tools/buy-void-presale-fulfillment-deployment-attestation-v1.mjs";

const ROOT = process.cwd();
const identity = JSON.parse(
  fs.readFileSync(
    path.join(
      ROOT,
      "ops/mainnet0/buy-void-presale-fulfillment-compiled-identity-v1.json",
    ),
    "utf8",
  ),
);

const TOKEN =
  "0x1111111111111111111111111111111111111111";
const FULFILLER =
  "0x2222222222222222222222222222222222222222";
const PREDECESSOR =
  "0x0000000000000000000000000000000000000000";
const DEPLOYER =
  "0x3333333333333333333333333333333333333333";
const NONCE = 7;
const CONTRACT = getCreateAddress({
  from: DEPLOYER,
  nonce: NONCE,
}).toLowerCase();
const TX_HASH =
  "0x" + "4".repeat(64);
const DEPLOYMENT_BLOCK_HASH =
  "0x" + "5".repeat(64);
const OBSERVATION_BLOCK_HASH =
  "0x" + "6".repeat(64);

const deploymentData =
  buildBuyVoidPresaleFulfillmentDeploymentDataV1({
    compiled_identity: identity,
    void_token_address: TOKEN,
    fulfiller_address: FULFILLER,
    predecessor_address: PREDECESSOR,
  });

const runtime =
  reconstructBuyVoidPresaleFulfillmentRuntimeV1({
    compiled_identity: identity,
    void_token_address: TOKEN,
    fulfiller_address: FULFILLER,
    predecessor_address: PREDECESSOR,
  });

assert.equal(runtime.runtime_bytes, 4237);
assert.match(runtime.runtime_sha256, /^[0-9a-f]{64}$/);
assert.match(runtime.runtime_keccak256, /^0x[0-9a-f]{64}$/);
assert.ok(
  runtime.runtime_code.startsWith("0x"),
);
assert.ok(
  deploymentData.deployment_data.startsWith("0x"),
);
assert.match(
  deploymentData.deployment_data_keccak256,
  /^0x[0-9a-f]{64}$/,
);

function policy(override = {}) {
  return {
    chain_id: "2050",
    fulfillment_contract_address: CONTRACT,
    void_token_address: TOKEN,
    fulfiller_address: FULFILLER,
    predecessor_address: PREDECESSOR,
    min_confirmations: "12",
    ...override,
  };
}

function observation(override = {}) {
  return {
    chain_id: "2050",
    observation_block_number: "111",
    observation_block_hash:
      OBSERVATION_BLOCK_HASH,
    contract_address: CONTRACT,
    deployment_transaction: {
      hash: TX_HASH,
      from: DEPLOYER,
      to: null,
      nonce: NONCE,
      input: deploymentData.deployment_data,
      value_wei: "0",
      chain_id: "2050",
    },
    deployment_receipt: {
      transaction_hash: TX_HASH,
      status: "1",
      block_number: "100",
      block_hash: DEPLOYMENT_BLOCK_HASH,
      contract_address: CONTRACT,
    },
    runtime_code: runtime.runtime_code,
    views: {
      void_token_address: TOKEN,
      fulfiller_address: FULFILLER,
      predecessor_address: PREDECESSOR,
      max_inventory_atoms:
        "10000000000000000000000000",
      total_fulfilled_atoms: "0",
      remaining_inventory_atoms:
        "10000000000000000000000000",
    },
    ...override,
  };
}

function verify(
  p = policy(),
  o = observation(),
) {
  return verifyBuyVoidPresaleFulfillmentDeploymentObservationV1({
    compiled_identity: identity,
    policy: p,
    observation: o,
  });
}

const ready = verify();
assert.equal(ready.ok, true);
if (ready.ok === false) throw new Error(ready.reason);
assert.equal(
  ready.marker,
  VOID_BUY_VOID_PRESALE_FULFILLMENT_DEPLOYMENT_ATTESTATION_V1,
);
assert.equal(
  ready.status,
  "deployment_attested_genesis_lineage_held_on_inventory_funding",
);
assert.equal(
  ready.contract_address,
  CONTRACT,
);
assert.equal(
  ready.void_token_address,
  TOKEN,
);
assert.equal(
  ready.fulfiller_address,
  FULFILLER,
);
assert.equal(
  ready.predecessor_address,
  PREDECESSOR,
);
assert.equal(
  ready.max_inventory_atoms,
  "10000000000000000000000000",
);
assert.equal(
  ready.total_fulfilled_atoms,
  "0",
);
assert.equal(
  ready.remaining_inventory_atoms,
  "10000000000000000000000000",
);
assert.equal(
  ready.observed_confirmation_count,
  "12",
);
assert.equal(
  ready.minimum_confirmation_count,
  "12",
);
assert.equal(
  ready.creation_transaction_exact_match,
  true,
);
assert.equal(
  ready.create_address_exact_match,
  true,
);
assert.equal(
  ready.runtime_code_exact_match,
  true,
);
assert.equal(
  ready.immutable_token_exact_match,
  true,
);
assert.equal(
  ready.immutable_fulfiller_exact_match,
  true,
);
assert.equal(
  ready.immutable_predecessor_exact_match,
  true,
);
assert.equal(
  ready.contract_views_exact_match,
  true,
);
assert.equal(
  ready.deployment_finality_policy_satisfied,
  true,
);
assert.equal(
  ready.genesis_predecessor,
  true,
);
assert.equal(
  ready.predecessor_lineage_attested,
  true,
);
assert.equal(
  ready.deployment_attested,
  true,
);
assert.equal(
  ready.inventory_funding_verified,
  false,
);
assert.equal(
  ready.runtime_activation_authorized,
  false,
);
assert.equal(
  ready.public_activation_authorized,
  false,
);
assert.equal(
  ready.next_gate,
  "presale_inventory_funding_attestation_and_separate_activation_authorization",
);
assert.match(
  ready.deployment_attestation_id,
  /^voidbvpfda1_[0-9a-f]{64}$/,
);

function heldReason(p, o) {
  const value = verify(p, o);
  assert.equal(value.ok, false);
  if (value.ok) throw new Error("expected held");
  return value.reason;
}

assert.equal(
  heldReason(
    policy({
      predecessor_address:
        "0x7777777777777777777777777777777777777777",
    }),
    observation(),
  ),
  "deployment_attestation_nonzero_predecessor_identity_not_accepted_v1",
);

assert.equal(
  heldReason(
    policy(),
    observation({
      observation_block_number: "110",
    }),
  ),
  "deployment_attestation_creation_transaction_mismatch",
);

assert.equal(
  heldReason(
    policy(),
    observation({
      runtime_code:
        runtime.runtime_code.slice(0, -2) + "01",
    }),
  ),
  "deployment_attestation_runtime_code_mismatch",
);

assert.equal(
  heldReason(
    policy(),
    observation({
      deployment_transaction: {
        ...observation().deployment_transaction,
        input:
          deploymentData.deployment_data.slice(0, -2) +
          "00",
      },
    }),
  ),
  "deployment_attestation_creation_input_mismatch",
);

assert.equal(
  heldReason(
    policy(),
    observation({
      deployment_transaction: {
        ...observation().deployment_transaction,
        nonce: NONCE + 1,
      },
    }),
  ),
  "deployment_attestation_create_address_mismatch",
);

assert.equal(
  heldReason(
    policy(),
    observation({
      views: {
        ...observation().views,
        void_token_address:
          "0x8888888888888888888888888888888888888888",
      },
    }),
  ),
  "deployment_attestation_observation_binding_mismatch",
);

assert.equal(
  heldReason(
    policy(),
    observation({
      views: {
        ...observation().views,
        max_inventory_atoms: "1",
      },
    }),
  ),
  "deployment_attestation_inventory_view_mismatch",
);

assert.equal(
  heldReason(
    policy(),
    observation({
      views: {
        ...observation().views,
        total_fulfilled_atoms: "1",
        remaining_inventory_atoms:
          "10000000000000000000000000",
      },
    }),
  ),
  "deployment_attestation_inventory_view_mismatch",
);

assert.equal(
  heldReason(
    policy({
      min_confirmations: "13",
    }),
    observation(),
  ),
  "deployment_attestation_creation_transaction_mismatch",
);

{
  const mutatedIdentity =
    structuredClone(identity);
  mutatedIdentity.artifacts.runtime_template_hex =
    mutatedIdentity.artifacts.runtime_template_hex.slice(
      0,
      -2,
    ) + "00";
  const value =
    verifyBuyVoidPresaleFulfillmentDeploymentObservationV1({
      compiled_identity: mutatedIdentity,
      policy: policy(),
      observation: observation(),
    });
  assert.equal(value.ok, false);
  if (value.ok) throw new Error("mutated identity unexpectedly ready");
  assert.equal(
    value.reason,
    "deployment_attestation_compiled_identity_not_accepted",
  );
}

for (const [key, expected] of Object.entries({
  pure_observation_validation_only: true,
  caller_policy_binding_required: true,
  accepted_compiler_identity_required: true,
  exact_creation_transaction_required: true,
  exact_create_address_required: true,
  exact_runtime_reconstruction_required: true,
  exact_view_binding_required: true,
  genesis_predecessor_only_v1: true,
  nonzero_predecessor_requires_separate_identity_acceptance:
    true,
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
})) {
  assert.equal(
    VOID_BUY_VOID_PRESALE_FULFILLMENT_DEPLOYMENT_ATTESTATION_AUTHORITY_V1[
      key
    ],
    expected,
    key,
  );
}

const source = fs.readFileSync(
  path.join(
    ROOT,
    "tools/buy-void-presale-fulfillment-deployment-attestation-v1.mjs",
  ),
  "utf8",
);
for (const forbidden of [
  "JsonRpcProvider",
  "fetch(",
  "broadcastTransaction",
  "sendTransaction",
  "eth_sendRawTransaction",
  "eth_sendTransaction",
  "private_key",
  "mnemonic",
  "forge create",
  "cast send",
]) {
  assert.equal(
    source.includes(forbidden),
    false,
    "pure verifier contains forbidden operation " +
      forbidden,
  );
}

console.log(
  "VOID_BUY_VOID_PRESALE_FULFILLMENT_DEPLOYMENT_ATTESTATION_V1_PROOF_GREEN",
);
console.log("accepted_compiler_identity_required=true");
console.log("creation_transaction_exact_match=true");
console.log("create_address_exact_match=true");
console.log("runtime_code_exact_match=true");
console.log("immutable_token_exact_match=true");
console.log("immutable_fulfiller_exact_match=true");
console.log("immutable_predecessor_exact_match=true");
console.log("contract_views_exact_match=true");
console.log("deployment_confirmation_floor_required=true");
console.log("genesis_predecessor_only_v1=true");
console.log("nonzero_predecessor_requires_separate_identity=true");
console.log("deployment_attested=true");
console.log("inventory_funding_verified=false");
console.log("runtime_activation_authorized=false");
console.log("public_activation_authorized=false");

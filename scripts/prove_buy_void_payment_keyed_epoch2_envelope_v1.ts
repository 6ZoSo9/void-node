import {
  VOID_BUY_VOID_EPOCH2_PRESALE_ADDRESS_V1,
  buyVoidPresaleAccessListExactV1,
  buyVoidPresaleFeeEnvelopeValidV1,
  buyVoidPresaleProductionRpcMatchesV1,
  buyVoidPresaleRequiredAccessListV1,
} from "../src/economic/buy_void_epoch2_fulfillment_access_list_v1.js";
import assert from "node:assert/strict";
import { Transaction, Wallet } from "ethers";

import {
  buildBuyVoidPaymentKeyedFulfillmentCallV1,
} from "../src/economic/buy_void_payment_keyed_fulfillment_call_v1.js";
import {
  VOID_BUY_VOID_EXECUTION_ATTEMPT_JOURNAL_V1,
  type BuyVoidExecutionAttemptStateV1,
} from "../src/economic/buy_void_execution_attempt_journal_v1.js";
import {
  VOID_BUY_VOID_SOURCE_FINALITY_EXECUTION_PREFLIGHT_V1,
} from "../src/economic/buy_void_source_finality_execution_preflight_v1.js";
import {
  VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_SIGNER_CONFIRMATION_V1,
} from "../src/economic/buy_void_payment_keyed_custodian_signer_v1.js";
import {
  VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_BROADCAST_CONFIRMATION_V1,
} from "../src/economic/buy_void_payment_keyed_custodian_broadcast_v1.js";
import {
  VOID_BUY_VOID_PAYMENT_KEYED_EXECUTION_COMPOSITION_AUTHORITY_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_EXECUTION_COMPOSITION_V1,
  runBuyVoidPaymentKeyedExecutionCompositionV1,
} from "../src/economic/buy_void_payment_keyed_execution_composition_v1.js";
import {
  validateBuyVoidPaymentKeyedTransactionPreparationPolicyV1,
  type BuyVoidPaymentKeyedTransactionPreparationRpcCallV1,
  BuyVoidPaymentKeyedTransactionPreparationTransportV1,
} from "../src/economic/buy_void_payment_keyed_transaction_preparation_v1.js";

const IDENTITY = "voidpay1:base:0x" + "a".repeat(64) + ":7";
const ATTEMPT_ID = "1".repeat(64);
const LEGACY_KEY = "2".repeat(64);
const CANONICAL_KEY =
  "a06bb682bc6225c6697d0a37a51fc1323dc657eac74a51506ddb5d7daed82c85";
const DELIVERY = "0x" + "4".repeat(40);
const CONTRACT = VOID_BUY_VOID_EPOCH2_PRESALE_ADDRESS_V1;
const SAGA_ID = "voidbvfsg1_" + "a".repeat(64);
const PLAN_RESERVATION_ID = "b".repeat(64);
const wallet = new Wallet("0x" + "11".repeat(32));
const WALLET = wallet.address.toLowerCase();

function attempt(): BuyVoidExecutionAttemptStateV1 {
  return {
    reservation: {
      schema: "void_buy_void_execution_attempt_reservation_v1",
      marker: VOID_BUY_VOID_EXECUTION_ATTEMPT_JOURNAL_V1,
      attempt_id: ATTEMPT_ID,
      attempt_number: 1,
      reserved_at_ms: 1,
      payment_key_sha256: LEGACY_KEY,
      request_key_sha256: "7".repeat(64),
      canonical_payment_identity: IDENTITY,
      request_id: "buyvoid-payment-keyed-execution-composition-v1",
      instruction_id: "8".repeat(64),
      intent_fingerprint: "9".repeat(64),
      max_attempts_per_payment: 1,
      unsigned_instruction: {
        schema: "void_buy_void_unsigned_fulfillment_instruction_v1",
        marker: "VOID_BUY_VOID_AUTO_FULFILLMENT_V1",
        instruction_id: "8".repeat(64),
        request_id: "buyvoid-payment-keyed-execution-composition-v1",
        canonical_payment_identity: IDENTITY,
        source_chain: "base",
        payment_transaction_hash: "0x" + "a".repeat(64),
        payment_log_index: "7",
        delivery_address: DELIVERY,
        payment_usdc_units: "1000000",
        void_amount_units: "2000000",
        confirmed_block_number: "123",
        confirmation_count: "12",
        signing_authorized: false,
        transaction_broadcast_authorized: false,
        automatic_execution_authorized: false,
      },
      signing_authorized_by_this_module: false,
      transaction_broadcast_authorized_by_this_module: false,
      money_movement_authorized_by_this_module: false,
    },
    prepared: null,
    broadcast: null,
    failure: null,
    postbroadcast_failure: null,
    confirmation: null,
    status: "reserved",
  };
}

const fulfillmentCall = buildBuyVoidPaymentKeyedFulfillmentCallV1({
  attempt: attempt(),
  source_finality: {
    ok: true,
    marker: VOID_BUY_VOID_SOURCE_FINALITY_EXECUTION_PREFLIGHT_V1,
    version: 1,
    status: "ready",
    attempt_id: ATTEMPT_ID,
    source_chain: "base",
    canonical_payment_identity: IDENTITY,
    payment_key_sha256: CANONICAL_KEY,
    process_source_identity_verified: true,
    reviewed_source_files_verified: true,
    authenticated_transport_identity_verified: true,
    total_operation_deadline_verified: true,
    source_generation_verified: true,
    deployed_artifact_generation_verified: true,
    ancestry_verified: true,
    provider_quorum_verified: true,
    production_source_finality_authority_ready: true,
    wallet_access_performed: false,
    signing_performed: false,
    transaction_broadcast_performed: false,
    money_movement_performed: false,
  },
  policy: {
    chain_id: "2050",
    fulfillment_contract_address: CONTRACT,
    max_void_amount_units: "10000000000000",
  },
});
if (fulfillmentCall.ok === false) throw new Error(fulfillmentCall.reason);
const readyFulfillmentCall =
  fulfillmentCall as Extract<typeof fulfillmentCall, { ok: true }>;

const policy = {
  enabled: true,
  chain_id: "2050" as const,
  rpc_url: "http://127.0.0.1:18553/",
  fulfillment_wallet_address: WALLET,
  fulfillment_contract_address: CONTRACT,
  max_void_amount_units: "10000000000000",
  gas_limit_multiplier_bps: "12000",
  max_gas_limit: "300000",
  fee_multiplier_bps: "20000",
  max_fee_per_gas_wei: "5000000000",
  max_priority_fee_per_gas_wei: "1000000000",
  request_timeout_ms: 5000,
  max_response_bytes: 65536,
};

// Same chainId is not enough: a retired 8545 service can answer 0x802.
assert.equal(
  buyVoidPresaleProductionRpcMatchesV1(CONTRACT, policy.rpc_url), true,
);
assert.equal(
  buyVoidPresaleProductionRpcMatchesV1(
    CONTRACT, "http://127.0.0.1:8545/",
  ), false,
);
const retiredRpcPolicy = validateBuyVoidPaymentKeyedTransactionPreparationPolicyV1({
  ...policy,
  rpc_url: "http://127.0.0.1:8545/",
});
assert.equal(retiredRpcPolicy.ok, false);
if (retiredRpcPolicy.ok) {
  throw new Error("retired_e1_rpc_accepted_for_epoch2_delivery");
}
assert.equal(
  retiredRpcPolicy.reason,
  "payment_keyed_transaction_preparation_epoch2_rpc_not_selected",
);
assert.equal(
  buyVoidPresaleProductionRpcMatchesV1(
    "0x" + "5".repeat(40), "http://127.0.0.1:8545/",
  ), true,
  "historical non-E2 identity must remain unchanged",
);

function planningTransport(options: {
  wrongChain?: boolean;
  zeroGasPrice?: boolean;
} = {}) {
  const calls: BuyVoidPaymentKeyedTransactionPreparationRpcCallV1[] = [];
  const transport: BuyVoidPaymentKeyedTransactionPreparationTransportV1 =
    async (call) => {
      calls.push(call);
      switch (call.method) {
        case "eth_chainId":
          return options.wrongChain ? "0x1" : "0x802";
        case "eth_getTransactionCount":
          return "0x7";
        case "eth_gasPrice":
          return options.zeroGasPrice ? "0x0" : "0x3b9aca00";
        case "eth_estimateGas":
          return "0x186a0";
        case "eth_getBalance":
          return options.zeroGasPrice ? "0x0" : "0xde0b6b3a7640000";
      }
    };
  return { transport, calls };
}

function input(
  transport: BuyVoidPaymentKeyedTransactionPreparationTransportV1,
) {
  return {
    saga_id: SAGA_ID,
    plan_reservation_id: PLAN_RESERVATION_ID,
    attempt: attempt(),
    fulfillment_call: readyFulfillmentCall,
    policy,
    dependencies: {
      preparation_transport: transport,
    },
  };
}

{
  const planned = planningTransport();
  const dry = await runBuyVoidPaymentKeyedExecutionCompositionV1(
    input(planned.transport),
  );
  if (dry.ok === false) throw new Error(dry.reason);
  assert.equal(dry.marker, VOID_BUY_VOID_PAYMENT_KEYED_EXECUTION_COMPOSITION_V1);
  assert.equal(dry.status, "dry_run");
  assert.equal(dry.applied, false);
  assert.equal(dry.attempt_id, ATTEMPT_ID);
  assert.equal(dry.saga_id, SAGA_ID);
  assert.equal(dry.plan_reservation_id, PLAN_RESERVATION_ID);
  assert.match(dry.preparation_fingerprint_sha256, /^[0-9a-f]{64}$/);
  assert.match(dry.transaction_plan_fingerprint_sha256, /^[0-9a-f]{64}$/);
  assert.match(dry.unsigned_transaction_fingerprint_sha256, /^[0-9a-f]{64}$/);
  assert.match(dry.request_fingerprint_sha256, /^[0-9a-f]{64}$/);
  assert.match(dry.request_idempotency_key_sha256, /^[0-9a-f]{64}$/);
  assert.equal(dry.submission_idempotency_key, null);
  assert.equal(dry.transaction_hash, null);
  assert.equal(dry.signer_wallet_access_performed, false);
  assert.equal(dry.signing_performed, false);
  assert.equal(dry.submission_guard_claimed, false);
  assert.equal(dry.broadcast_call_performed, false);
  assert.equal(dry.transaction_broadcast_accepted, false);
  assert.equal(dry.receipt_verified, false);
  assert.equal(dry.inventory_mutation_performed, false);
  assert.equal(dry.public_fulfilled_closeout_performed, false);
  assert.equal(Object.hasOwn(dry, "raw_signed_transaction"), false);
  assert.deepEqual(
    planned.calls.map((call) => call.method),
    [
      "eth_chainId",
      "eth_getTransactionCount",
      "eth_gasPrice",
      "eth_estimateGas",
      "eth_getBalance",
    ],
  );
  const gasEstimate = planned.calls.find(
    (call) => call.method === "eth_estimateGas",
  );
  assert.ok(gasEstimate, "E2 presale gas estimate must be invoked");
  const estimateTx = gasEstimate.params[0] as any;
  assert.equal(estimateTx.chainId, "0x802");
  assert.equal(estimateTx.type, "0x2");
  assert.deepEqual(
    estimateTx.accessList,
    buyVoidPresaleRequiredAccessListV1(CONTRACT),
  );
}

{
  const planned = planningTransport();
  let signerTouched = false;
  let guardTouched = false;
  let broadcasterTouched = false;
  const wrong = await runBuyVoidPaymentKeyedExecutionCompositionV1({
    ...input(planned.transport),
    apply: true,
    sign_confirmation: "wrong",
    broadcast_confirmation:
      VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_BROADCAST_CONFIRMATION_V1,
    dependencies: {
      preparation_transport: planned.transport,
      signer: {
        async get_address() {
          signerTouched = true;
          return WALLET;
        },
        async sign_transaction() {
          signerTouched = true;
          return "";
        },
      },
      submission_guard: {
        async claim_submission_once() {
          guardTouched = true;
          return { claimed: true as const };
        },
        async release_submission_claim() {
          guardTouched = true;
          return { released: true as const };
        },
      },
      broadcaster: {
        async broadcast_signed_transaction() {
          broadcasterTouched = true;
          return { accepted: false };
        },
      },
    },
  });
  assert.equal(wrong.ok, false);
  if (wrong.ok) throw new Error("wrong_confirmation_unexpected_ready");
  assert.equal(wrong.stage, "confirmation");
  assert.equal(
    wrong.reason,
    "payment_keyed_execution_composition_exact_confirmations_required",
  );
  assert.equal(planned.calls.length, 0);
  assert.equal(signerTouched, false);
  assert.equal(guardTouched, false);
  assert.equal(broadcasterTouched, false);
}

{
  const planned = planningTransport();
  const missingDeps =
    await runBuyVoidPaymentKeyedExecutionCompositionV1({
      ...input(planned.transport),
      apply: true,
      sign_confirmation:
        VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_SIGNER_CONFIRMATION_V1,
      broadcast_confirmation:
        VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_BROADCAST_CONFIRMATION_V1,
    });
  assert.equal(missingDeps.ok, false);
  if (missingDeps.ok) throw new Error("missing_deps_unexpected_ready");
  assert.equal(missingDeps.stage, "dependencies");
  assert.equal(planned.calls.length, 0);
}

{
  const planned = planningTransport({ wrongChain: true });
  let signerTouched = false;
  const wrongChain =
    await runBuyVoidPaymentKeyedExecutionCompositionV1({
      ...input(planned.transport),
      apply: true,
      sign_confirmation:
        VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_SIGNER_CONFIRMATION_V1,
      broadcast_confirmation:
        VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_BROADCAST_CONFIRMATION_V1,
      dependencies: {
        preparation_transport: planned.transport,
        signer: {
          async get_address() {
            signerTouched = true;
            return WALLET;
          },
          async sign_transaction() {
            signerTouched = true;
            return "";
          },
        },
        submission_guard: {
          async claim_submission_once() {
            return { claimed: true as const };
          },
          async release_submission_claim() {
            return { released: true as const };
          },
        },
        broadcaster: {
          async broadcast_signed_transaction() {
            return { accepted: false };
          },
        },
      },
    });
  assert.equal(wrongChain.ok, false);
  if (wrongChain.ok) throw new Error("wrong_chain_unexpected_ready");
  assert.equal(wrongChain.stage, "preparation");
  assert.equal(
    wrongChain.reason,
    "payment_keyed_transaction_preparation_chain_id_mismatch",
  );
  assert.deepEqual(
    planned.calls.map((call) => call.method),
    ["eth_chainId"],
  );
  assert.equal(signerTouched, false);
}

function applyDependencies(options: {
  claim?: boolean;
  throwBroadcast?: boolean;
  omitEpoch2Marker?: boolean;
  zeroGasPrice?: boolean;
} = {}) {
  const planned = planningTransport({
    zeroGasPrice: options.zeroGasPrice,
  });
  const calls = {
    signer_address: 0,
    sign: 0,
    claim: 0,
    release: 0,
    broadcast: 0,
  };
  return {
    planned,
    calls,
    value: {
      preparation_transport: planned.transport,
      signer: {
        async get_address() {
          calls.signer_address += 1;
          return WALLET;
        },
        async sign_transaction(transaction: any) {
          calls.sign += 1;
          return await wallet.signTransaction({
            type: transaction.type,
            chainId: transaction.chainId,
            nonce: transaction.nonce,
            gasLimit: transaction.gasLimit,
            maxFeePerGas: transaction.maxFeePerGas,
            maxPriorityFeePerGas: transaction.maxPriorityFeePerGas,
            to: transaction.to,
            value: transaction.value,
            data: transaction.data,
            ...(options.omitEpoch2Marker
              ? {}
              : { accessList: transaction.accessList }),
          });
        },
      },
      submission_guard: {
        async claim_submission_once() {
          calls.claim += 1;
          return options.claim === false
            ? { claimed: false as const, reason: "already_claimed" }
            : { claimed: true as const };
        },
        async release_submission_claim() {
          calls.release += 1;
          return { released: true as const };
        },
      },
      broadcaster: {
        async broadcast_signed_transaction(raw: string) {
          calls.broadcast += 1;
          if (options.throwBroadcast) {
            throw new Error("synthetic_broadcast_ambiguity");
          }
          const parsed = Transaction.from(raw);
          assert.equal(
            buyVoidPresaleAccessListExactV1(parsed.accessList, CONTRACT),
            true,
            "synthetic broadcaster saw no valid E2 signed access-list marker",
          );
          return {
            accepted: true,
            transaction_hash: parsed.hash,
            provider_submission_id: "synthetic-composition-accepted-v1",
            submission_may_have_occurred: true,
          };
        },
      },
    },
  };
}

{
  const deps = applyDependencies({ claim: false });
  const duplicate =
    await runBuyVoidPaymentKeyedExecutionCompositionV1({
      ...input(deps.planned.transport),
      apply: true,
      sign_confirmation:
        VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_SIGNER_CONFIRMATION_V1,
      broadcast_confirmation:
        VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_BROADCAST_CONFIRMATION_V1,
      dependencies: deps.value,
    });
  assert.equal(duplicate.ok, false);
  if (duplicate.ok) throw new Error("duplicate_unexpected_ready");
  assert.equal(duplicate.stage, "broadcast");
  assert.equal(
    duplicate.reason,
    "payment_keyed_submission_guard_already_claimed",
  );
  assert.equal(duplicate.reconciliation_required, true);
  assert.equal(duplicate.retry_allowed, false);
  assert.equal(deps.calls.signer_address, 1);
  assert.equal(deps.calls.sign, 1);
  assert.equal(deps.calls.claim, 1);
  assert.equal(deps.calls.broadcast, 0);
}

{
  const deps = applyDependencies({ throwBroadcast: true });
  const ambiguous =
    await runBuyVoidPaymentKeyedExecutionCompositionV1({
      ...input(deps.planned.transport),
      apply: true,
      sign_confirmation:
        VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_SIGNER_CONFIRMATION_V1,
      broadcast_confirmation:
        VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_BROADCAST_CONFIRMATION_V1,
      dependencies: deps.value,
    });
  assert.equal(ambiguous.ok, false);
  if (ambiguous.ok) throw new Error("ambiguous_unexpected_ready");
  assert.equal(ambiguous.stage, "broadcast");
  assert.equal(ambiguous.status, "broadcast_unknown");
  assert.equal(
    ambiguous.reason,
    "payment_keyed_broadcast_submission_exception_unknown",
  );
  assert.equal(ambiguous.reconciliation_required, true);
  assert.equal(ambiguous.retry_allowed, false);
  assert.equal(ambiguous.automatic_retry_allowed, false);
  assert.equal(deps.calls.claim, 1);
  assert.equal(deps.calls.broadcast, 1);
  assert.equal(deps.calls.release, 0);
}

{
  const deps = applyDependencies();
  const accepted =
    await runBuyVoidPaymentKeyedExecutionCompositionV1({
      ...input(deps.planned.transport),
      apply: true,
      sign_confirmation:
        VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_SIGNER_CONFIRMATION_V1,
      broadcast_confirmation:
        VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_BROADCAST_CONFIRMATION_V1,
      dependencies: deps.value,
    });
  if (accepted.ok === false) throw new Error(accepted.reason);
  assert.equal(accepted.status, "broadcast_accepted");
  assert.equal(accepted.applied, true);
  assert.equal(accepted.attempt_id, ATTEMPT_ID);
  assert.equal(accepted.signer_wallet_access_performed, true);
  assert.equal(accepted.signing_performed, true);
  assert.equal(accepted.submission_guard_claimed, true);
  assert.equal(accepted.broadcast_call_performed, true);
  assert.equal(accepted.transaction_broadcast_accepted, true);
  assert.match(accepted.transaction_hash || "", /^0x[0-9a-f]{64}$/);
  assert.match(accepted.submission_idempotency_key || "", /^[0-9a-f]{64}$/);
  assert.equal(accepted.reconciliation_required, false);
  assert.equal(accepted.retry_allowed, false);
  assert.equal(accepted.receipt_verified, false);
  assert.equal(accepted.inventory_mutation_performed, false);
  assert.equal(accepted.public_fulfilled_closeout_performed, false);
  assert.equal(accepted.raw_signed_transaction_persisted, false);
  assert.equal(accepted.raw_signed_transaction_returned, false);
  assert.equal(Object.hasOwn(accepted, "raw_signed_transaction"), false);
  assert.equal(deps.calls.signer_address, 1);
  assert.equal(deps.calls.sign, 1);
  assert.equal(deps.calls.claim, 1);
  assert.equal(deps.calls.broadcast, 1);
  assert.equal(deps.calls.release, 0);
}


{
  const deps = applyDependencies({ omitEpoch2Marker: true });
  const missingMarker =
    await runBuyVoidPaymentKeyedExecutionCompositionV1({
      ...input(deps.planned.transport),
      apply: true,
      sign_confirmation:
        VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_SIGNER_CONFIRMATION_V1,
      broadcast_confirmation:
        VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_BROADCAST_CONFIRMATION_V1,
      dependencies: deps.value,
    });
  assert.equal(missingMarker.ok, false);
  assert.equal(deps.calls.sign, 1);
  assert.equal(deps.calls.claim, 0);
  assert.equal(deps.calls.broadcast, 0);
}
assert.equal(
  buyVoidPresaleAccessListExactV1([], CONTRACT),
  false,
  "E2 missing marker must HOLD",
);
assert.equal(
  buyVoidPresaleAccessListExactV1(
    [{ ...buyVoidPresaleRequiredAccessListV1(CONTRACT)[0],
       storageKeys: ["0x" + "f".repeat(64)] }],
    CONTRACT,
  ),
  false,
  "wrong E2 marker storage key must HOLD",
);

// The pinned Epoch-2 Besu runtime supports zero-native-gas transfers.
// E2-only zero fee must survive planning, custody fingerprints, synthetic
// credential signing and the pre-broadcast signed-envelope admission wall.
{
  const zeroPrice = planningTransport({ zeroGasPrice: true });
  const zeroPolicy = { ...policy, max_priority_fee_per_gas_wei: "0" };
  const dry = await runBuyVoidPaymentKeyedExecutionCompositionV1({
    ...input(zeroPrice.transport),
    policy: zeroPolicy,
  });
  if (dry.ok === false) throw new Error("epoch2_zero_fee_dry:" + dry.reason);
  assert.equal(dry.status, "dry_run");
  const estimate = zeroPrice.calls.find(call => call.method === "eth_estimateGas");
  assert.ok(estimate);
  const params = estimate.params[0] as Record<string, unknown>;
  assert.equal(params.maxFeePerGas, "0x0");
  assert.equal(params.maxPriorityFeePerGas, "0x0");
  assert.deepEqual(
    params.accessList,
    buyVoidPresaleRequiredAccessListV1(CONTRACT),
  );
  const dependencies = applyDependencies({ zeroGasPrice: true });
  const accepted = await runBuyVoidPaymentKeyedExecutionCompositionV1({
    ...input(dependencies.planned.transport),
    policy: zeroPolicy,
    apply: true,
    sign_confirmation:
      VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_SIGNER_CONFIRMATION_V1,
    broadcast_confirmation:
      VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_BROADCAST_CONFIRMATION_V1,
    dependencies: dependencies.value,
  });
  if (accepted.ok === false) throw new Error("epoch2_zero_fee_apply:" + accepted.reason);
  assert.equal(accepted.status, "broadcast_accepted");
  assert.equal(dependencies.calls.sign, 1);
  assert.equal(dependencies.calls.claim, 1);
  assert.equal(dependencies.calls.broadcast, 1);
  assert.equal(accepted.inventory_mutation_performed, false);
  assert.equal(accepted.receipt_verified, false);
  assert.equal(accepted.public_fulfilled_closeout_performed, false);
  assert.equal(accepted.raw_signed_transaction_persisted, false);
}
{
  const zeroPrice = planningTransport({ zeroGasPrice: true });
  const invalidPriority = await runBuyVoidPaymentKeyedExecutionCompositionV1({
    ...input(zeroPrice.transport),
    policy,
  });
  assert.equal(invalidPriority.ok, false);
  assert.equal(invalidPriority.reason,
    "payment_keyed_transaction_preparation_priority_fee_exceeds_computed_max_fee");
  assert.equal(
    buyVoidPresaleFeeEnvelopeValidV1(0n, 0n, CONTRACT), true,
  );
  assert.equal(
    buyVoidPresaleFeeEnvelopeValidV1(0n, 1n, CONTRACT), false,
  );
  assert.equal(
    buyVoidPresaleFeeEnvelopeValidV1(0n, 0n, "0x" + "a".repeat(40)), false,
    "retired, generic and off-target contracts must reject zero fees",
  );
}
assert.equal(
  VOID_BUY_VOID_PAYMENT_KEYED_EXECUTION_COMPOSITION_AUTHORITY_V1
    .runtime_route_mount,
  false,
);
assert.equal(
  VOID_BUY_VOID_PAYMENT_KEYED_EXECUTION_COMPOSITION_AUTHORITY_V1
    .raw_signed_transaction_output,
  false,
);
assert.equal(
  VOID_BUY_VOID_PAYMENT_KEYED_EXECUTION_COMPOSITION_AUTHORITY_V1
    .receipt_acceptance,
  false,
);
assert.equal(
  VOID_BUY_VOID_PAYMENT_KEYED_EXECUTION_COMPOSITION_AUTHORITY_V1
    .inventory_mutation,
  false,
);
assert.equal(
  VOID_BUY_VOID_PAYMENT_KEYED_EXECUTION_COMPOSITION_AUTHORITY_V1
    .public_fulfilled_closeout,
  false,
);
assert.equal(
  VOID_BUY_VOID_PAYMENT_KEYED_EXECUTION_COMPOSITION_AUTHORITY_V1
    .automatic_retry,
  false,
);

console.log("VOID_BUY_VOID_PAYMENT_KEYED_EPOCH2_ENVELOPE_V1_GREEN");
console.log("epoch2_rpc_selected_18553_not_retired_8545=true");
console.log("epoch2_zero_native_gas_signature_and_broadcast_synthetic=true");
console.log("zero_fee_legacy_target_and_priority_mismatch_hold=true");
console.log("epoch2_payment_fulfill_signed_marker_exact=true");
console.log("missing_and_wrong_markers_hold_before_broadcast=true");
console.log("historical_epoch1_fixture_unchanged=true");
console.log("read_only_planning_precedes_signing=true");
console.log("canonical_unsigned_transaction_required=true");
console.log("canonical_custodian_request_required=true");
console.log("signer_dry_run_revalidation_required=true");
console.log("exact_sign_confirmation_required=true");
console.log("exact_broadcast_confirmation_required=true");
console.log("durable_submission_guard_required=true");
console.log("ambiguous_submission_requires_reconciliation=true");
console.log("raw_signed_transaction_output=false");
console.log("raw_signed_transaction_persisted=false");
console.log("receipt_verified=false");
console.log("inventory_mutation=false");
console.log("public_fulfilled_closeout=false");
console.log("runtime_route_mount=false");

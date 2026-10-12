#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  EXPECTED_AUTHORIZATION_ID,
  verifyRoleAuthoritySingleTransactionBroadcastAuthorizationV1,
} from "../tools/chain2050-role-authority-single-transaction-broadcast-authorization-v1.mjs";
import {
  AUTHORITY_V1,
  consumeRoleAuthorityBroadcastAuthorizationWithClockV1,
} from "../tools/chain2050-role-authority-broadcast-authorization-consumption-v1.mjs";

const authorization = JSON.parse(
  fs.readFileSync(
    "ops/mainnet0/chain2050-role-authority-single-transaction-broadcast-authorization-v1.json",
    "utf8",
  ),
);

const verified =
  verifyRoleAuthoritySingleTransactionBroadcastAuthorizationV1(
    authorization,
  );

assert.equal(verified.ok, true);
assert.equal(verified.authorization_id, EXPECTED_AUTHORIZATION_ID);
assert.equal(
  verified.authorization_id,
  "voidcraba1_66779fab9c8657d7f038585525dfc2ac688adfe33cf10a5d5827abb140e04c85",
);
assert.equal(verified.scope.transaction_broadcast_authorized, true);
assert.equal(verified.scope.exact_signed_transaction_only, true);
assert.equal(verified.scope.one_submission_attempt_only, true);
assert.equal(verified.scope.additional_value_transfer_authorized, false);
assert.equal(verified.scope.replacement_transaction_authorized, false);
assert.equal(verified.scope.automatic_retry_authorized, false);

const now = Date.parse("2026-09-22T22:00:00.000Z");

function freshPreflight(overrides = {}) {
  return {
    marker: "VOID_ROLE_AUTHORITY_FRESH_EXECUTION_PREFLIGHT_V1",
    version: 1,
    broadcast_authorization_request_id:
      "voidcrabr1_661c57638e7c9904df997da50841811f509239495891a965aebd46fece405a51",
    signed_transaction_hash:
      "0x8da8cc5a8e126158bdc0e003c5521699939d95a26a72a933969cf6de15d88dd4",
    signed_transaction_file_sha256:
      "96b5d004284e511c12b40f2de627c9a214656e025883b8cd7adec1b82348334d",
    signer_address:
      "0x4d0a1149d13b03448c56ee6582d161159c5e537f",
    chain_id: "2050",
    observation_block_number: "40000",
    observation_block_hash:
      "0x" + "a".repeat(64),
    observed_at_utc: "2026-09-22T21:59:30.000Z",
    latest_nonce: "0",
    pending_nonce: "0",
    pending_transactions_present: false,
    deployer_balance_wei: "7208943000000000",
    predicted_contract_address:
      "0xe4e9a5a8e5ac3a99176fcf50ba986a374577de49",
    predicted_contract_address_vacant: true,
    deployment_gas_estimate: "2002484",
    base_fee_per_gas_wei: "7",
    observed_priority_fee_per_gas_wei: "1000000000",
    signed_transaction_seen_by_hash: false,
    signed_transaction_receipt_seen: false,
    authority: {
      loopback_rpc_only: true,
      transaction_broadcast: false,
      chain2050_mutation: false,
      funds_action: false,
    },
    ...overrides,
  };
}

function stateRoot(mode = 0o700) {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-role-authority-broadcast-consume-v1-"),
  );
  fs.chmodSync(root, mode);
  return root;
}

{
  const root = stateRoot();
  try {
    const result =
      consumeRoleAuthorityBroadcastAuthorizationWithClockV1(
        {
          authorization,
          fresh_preflight: freshPreflight(),
          state_dir: root,
        },
        now,
      );

    assert.equal(result.ok, true);
    assert.equal(
      result.status,
      "broadcast_authorization_consumed_before_broadcaster_access",
    );
    assert.equal(result.authorization_id, EXPECTED_AUTHORIZATION_ID);
    assert.match(
      result.fresh_execution_preflight_id,
      /^voidcrapx1_[0-9a-f]{64}$/,
    );
    assert.match(
      result.broadcast_consumption_record_id,
      /^voidcrabc1_[0-9a-f]{64}$/,
    );
    assert.equal(result.authorization_consumed, true);
    assert.equal(result.consumption.single_use, true);
    assert.equal(
      result.consumption.replay_rejected_within_exact_state_store,
      true,
    );
    assert.equal(
      result.consumption.canonical_state_store_runtime_binding_required,
      true,
    );
    assert.equal(
      result.consumption.fresh_execution_preflight_bound,
      true,
    );
    assert.equal(
      result.consumption.consumption_precedes_any_broadcaster_access,
      true,
    );
    assert.equal(
      result.consumption.one_submission_attempt_only,
      true,
    );
    assert.equal(
      result.consumption.replacement_transaction_authorized,
      false,
    );
    assert.equal(
      result.consumption.automatic_retry_authorized,
      false,
    );
    assert.equal(result.raw_signed_transaction_accessed, false);
    assert.equal(result.broadcaster_access_performed, false);
    assert.equal(result.rpc_call_performed, false);
    assert.equal(result.transaction_broadcast_performed, false);
    assert.equal(result.chain2050_write_performed, false);

    const consumedDir = path.join(root, "broadcast-consumed");
    const files = fs.readdirSync(consumedDir);
    assert.deepEqual(files, [EXPECTED_AUTHORIZATION_ID + ".json"]);
    assert.equal(fs.lstatSync(consumedDir).mode & 0o777, 0o700);
    const file = path.join(consumedDir, files[0]);
    assert.equal(fs.lstatSync(file).mode & 0o777, 0o600);
    const before = fs.readFileSync(file);

    const duplicate =
      consumeRoleAuthorityBroadcastAuthorizationWithClockV1(
        {
          authorization,
          fresh_preflight: freshPreflight({
            observed_at_utc: "2026-09-22T21:59:31.000Z",
          }),
          state_dir: root,
        },
        now + 1000,
      );
    assert.equal(duplicate.ok, false);
    assert.equal(
      duplicate.reason,
      "broadcast_authorization_already_consumed",
    );
    assert.deepEqual(fs.readFileSync(file), before);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

for (const [name, preflight, expectedReason] of [
  [
    "stale",
    freshPreflight({
      observed_at_utc: "2026-09-22T21:57:59.000Z",
    }),
    "fresh_execution_preflight_stale_or_clock_invalid",
  ],
  [
    "nonce_drift",
    freshPreflight({ pending_nonce: "1" }),
    "fresh_execution_preflight_exact_binding_mismatch",
  ],
  [
    "occupied_contract",
    freshPreflight({ predicted_contract_address_vacant: false }),
    "fresh_execution_preflight_state_invalid",
  ],
  [
    "seen_transaction",
    freshPreflight({ signed_transaction_seen_by_hash: true }),
    "fresh_execution_preflight_state_invalid",
  ],
  [
    "insufficient_balance",
    freshPreflight({ deployer_balance_wei: "7208942999999999" }),
    "fresh_execution_preflight_envelope_invalid",
  ],
  [
    "gas_over_limit",
    freshPreflight({ deployment_gas_estimate: "2402982" }),
    "fresh_execution_preflight_envelope_invalid",
  ],
  [
    "fee_outside_envelope",
    freshPreflight({ base_fee_per_gas_wei: "1000000001" }),
    "fresh_execution_preflight_envelope_invalid",
  ],
]) {
  const root = stateRoot();
  try {
    const result =
      consumeRoleAuthorityBroadcastAuthorizationWithClockV1(
        {
          authorization,
          fresh_preflight: preflight,
          state_dir: root,
        },
        now,
      );
    assert.equal(result.ok, false, name);
    assert.equal(result.reason, expectedReason, name);
    assert.equal(
      fs.existsSync(path.join(root, "broadcast-consumed")),
      false,
      name,
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

{
  const root = stateRoot(0o755);
  try {
    const result =
      consumeRoleAuthorityBroadcastAuthorizationWithClockV1(
        {
          authorization,
          fresh_preflight: freshPreflight(),
          state_dir: root,
        },
        now,
      );
    assert.equal(result.ok, false);
    assert.equal(result.reason, "state_root_mode_must_be_0700");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

for (const [key, expected] of Object.entries({
  durable_single_use_consumption: true,
  fresh_execution_preflight_required: true,
  maximum_preflight_age_ms: 120000,
  exact_state_store_realpath_scoped_replay_prevention: true,
  global_replay_prevention_claimed: false,
  canonical_state_store_runtime_binding_required: true,
  raw_signed_transaction_access: false,
  private_key_access: false,
  wallet_or_signer_access: false,
  broadcaster_access: false,
  rpc_call: false,
  transaction_broadcast_performed: false,
  chain2050_write_performed: false,
  additional_funds_action: false,
  automatic_retry: false,
})) {
  assert.equal(AUTHORITY_V1[key], expected, key);
}

const consumptionSource = fs.readFileSync(
  "tools/chain2050-role-authority-broadcast-authorization-consumption-v1.mjs",
  "utf8",
);
for (const forbidden of [
  "eth_sendRawTransaction",
  "eth_sendTransaction",
  "broadcastTransaction(",
  "sendTransaction(",
  "signTransaction(",
  "privateKey",
  "mnemonic",
]) {
  assert.equal(consumptionSource.includes(forbidden), false, forbidden);
}

console.log(
  "VOID_CHAIN2050_ROLE_AUTHORITY_BROADCAST_AUTHORIZATION_CONSUMPTION_V1_GREEN",
);
console.log("broadcast_authorization_id=" + verified.authorization_id);
console.log("transaction_broadcast_authorized=true_exact_transaction_only");
console.log("one_submission_attempt_only=true");
console.log("fresh_execution_preflight_max_age_ms=120000");
console.log("durable_consumption_before_broadcaster_access=true");
console.log("replacement_transaction_authorized=false");
console.log("automatic_retry_authorized=false");
console.log("raw_signed_transaction_access=false");
console.log("broadcaster_access=false");
console.log("rpc_call=false");
console.log("transaction_broadcast_performed=false");
console.log("chain2050_write_performed=false");

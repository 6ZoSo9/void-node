#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import { Wallet } from "ethers";

import {
  VOID_ECONOMIC_EPOCH2_SIGNED_SUBMISSION_GATEWAY_ID_V1,
  VOID_ECONOMIC_EPOCH2_SIGNED_SUBMISSION_TYPES_V1,
  buildVoidEconomicEpoch2SignedSubmissionIntentV1,
  voidEconomicEpoch2SignedSubmissionTypedDataV1,
} from "../tools/void-economic-epoch2-signed-submission-intent-v1.mjs";

import {
  VOID_ECONOMIC_EPOCH2_PUBLIC_SUBMISSION_GATEWAY_AUTHORITY_V1,
  VOID_ECONOMIC_EPOCH2_PUBLIC_SUBMISSION_GATEWAY_CORE_V1,
  VoidEconomicEpoch2PublicSubmissionGatewayHoldV1,
  admitVoidEconomicEpoch2PublicSubmissionGatewayV1,
} from "../tools/void-economic-epoch2-public-submission-gateway-v1.mjs";

function replayStore({ staleHas = false } = {}) {
  const consumed = new Set();
  return {
    has(digest) {
      return staleHas ? false : consumed.has(digest);
    },
    async consumeIfFresh(digest) {
      if (consumed.has(digest)) {
        return {
          consumed: false,
          already_consumed: true,
          atomic: true,
        };
      }
      consumed.add(digest);
      await Promise.resolve();
      return {
        consumed: true,
        already_consumed: false,
        atomic: true,
      };
    },
  };
}

async function expectGatewayHold(run, reason) {
  let thrown = null;
  try {
    await run();
  } catch (error) {
    thrown = error;
  }
  assert(thrown, "expected gateway hold: " + reason);
  assert(
    thrown instanceof VoidEconomicEpoch2PublicSubmissionGatewayHoldV1,
    "wrong gateway error: " + String(thrown),
  );
  assert.equal(thrown.reason, reason);
}

const wallet = Wallet.createRandom();
const signer = wallet.address.toLowerCase();
const target = "0x470075b85352eb86f7d089fb9ba88945f12aad94";
const calldata =
  "0xa9059cbb" +
  "0000000000000000000000000000000000000000000000000000000000000001" +
  "0000000000000000000000000000000000000000000000000000000000000001";
const now = 2_000_000_000n;

const intent = buildVoidEconomicEpoch2SignedSubmissionIntentV1({
  signer,
  nonce: "42",
  issuedAtUnix: String(now - 10n),
  expiresAtUnix: String(now + 110n),
  target,
  gasLimit: "100000",
  calldata,
});
const typed = voidEconomicEpoch2SignedSubmissionTypedDataV1(intent);
const signature = await wallet.signTypedData(
  typed.domain,
  VOID_ECONOMIC_EPOCH2_SIGNED_SUBMISSION_TYPES_V1,
  typed.value,
);

const store = replayStore();
const admitted = await admitVoidEconomicEpoch2PublicSubmissionGatewayV1({
  intent,
  calldata,
  signature,
  nowUnix: String(now),
  allowedTargets: [target],
  replayStore: store,
});

assert.equal(
  admitted.marker,
  VOID_ECONOMIC_EPOCH2_PUBLIC_SUBMISSION_GATEWAY_CORE_V1,
);
assert.equal(admitted.ok, true);
assert.equal(admitted.status, "SOURCE_GATEWAY_ADMISSION_REPLAY_CONSUMED");
assert.equal(admitted.chain_id, 2050);
assert.equal(admitted.execution_epoch, 2);
assert.equal(
  admitted.gateway_id,
  VOID_ECONOMIC_EPOCH2_SIGNED_SUBMISSION_GATEWAY_ID_V1,
);
assert.equal(admitted.signer, signer);
assert.equal(admitted.nonce, "42");
assert.equal(admitted.target, target);
assert.equal(admitted.signed_submission_source_primitive_proven, true);
assert.equal(admitted.execution_epoch_bound_in_public_gateway, true);
assert.equal(admitted.atomic_replay_digest_consumed, true);
assert.equal(admitted.durable_replay_store_verified, false);
assert.equal(
  admitted.privileged_signer_nonce_or_key_replay_fence_proven,
  false,
);
assert.equal(admitted.pending_legacy_signed_transaction_census_complete, false);
assert.equal(admitted.cross_epoch_replay_protection_proven, false);
assert.equal(admitted.runtime_route_active, false);
assert.equal(admitted.public_submission_open, false);
assert.equal(admitted.transaction_submission, false);
assert.equal(admitted.transaction_broadcast, false);
assert.equal(admitted.authoritative_chain2050_write, false);
assert.equal(admitted.migration_authorized, false);
assert.equal(admitted.public_activation, false);
assert.equal(admitted.funds_movement, false);

{
  let thrown = null;
  try {
    await admitVoidEconomicEpoch2PublicSubmissionGatewayV1({
      intent,
      calldata,
      signature,
      nowUnix: String(now),
      allowedTargets: [target],
      replayStore: store,
    });
  } catch (error) {
    thrown = error;
  }
  assert(thrown);
  assert.equal(thrown.reason, "intent_replay_detected");
}

{
  const raceStore = replayStore({ staleHas: true });
  const results = await Promise.allSettled([
    admitVoidEconomicEpoch2PublicSubmissionGatewayV1({
      intent,
      calldata,
      signature,
      nowUnix: String(now),
      allowedTargets: [target],
      replayStore: raceStore,
    }),
    admitVoidEconomicEpoch2PublicSubmissionGatewayV1({
      intent,
      calldata,
      signature,
      nowUnix: String(now),
      allowedTargets: [target],
      replayStore: raceStore,
    }),
  ]);
  assert.equal(
    results.filter((result) => result.status === "fulfilled").length,
    1,
  );
  const rejected = results.find((result) => result.status === "rejected");
  assert(rejected);
  assert(
    rejected.reason instanceof VoidEconomicEpoch2PublicSubmissionGatewayHoldV1,
  );
  assert.equal(
    rejected.reason.reason,
    "intent_replay_detected_at_atomic_consume",
  );
}

await expectGatewayHold(
  () =>
    admitVoidEconomicEpoch2PublicSubmissionGatewayV1({
      intent,
      calldata,
      signature,
      nowUnix: String(now),
      allowedTargets: new Array(257).fill(target),
      replayStore: replayStore(),
    }),
  "target_allowlist_invalid",
);

await expectGatewayHold(
  () =>
    admitVoidEconomicEpoch2PublicSubmissionGatewayV1({
      intent,
      calldata: "0x" + "00".repeat(744_751),
      signature,
      nowUnix: String(now),
      allowedTargets: [target],
      replayStore: replayStore(),
    }),
  "calldata_above_gateway_bound",
);

await expectGatewayHold(
  () =>
    admitVoidEconomicEpoch2PublicSubmissionGatewayV1({
      intent,
      calldata,
      signature,
      nowUnix: String(now),
      allowedTargets: [target],
      replayStore: {
        has() {
          return false;
        },
        async consumeIfFresh() {
          return {
            consumed: true,
            already_consumed: false,
            atomic: false,
          };
        },
      },
    }),
  "atomic_replay_consume_failed",
);

for (const [key, value] of Object.entries(
  VOID_ECONOMIC_EPOCH2_PUBLIC_SUBMISSION_GATEWAY_AUTHORITY_V1,
)) {
  assert.equal(
    key === "source_only" ||
      key === "signed_intent_verification" ||
      key === "atomic_replay_consume_required"
      ? value
      : !value,
    true,
    key,
  );
}

const source = fs.readFileSync(
  "tools/void-economic-epoch2-public-submission-gateway-v1.mjs",
  "utf8",
);
assert.doesNotMatch(source, /eth_sendRawTransaction|eth_sendTransaction/);
assert.doesNotMatch(source, /broadcastTransaction\s*\(/);
assert.doesNotMatch(source, /new\s+Wallet\s*\(/);
assert.doesNotMatch(
  source,
  /mnemonic|PRIVATE_KEY\s*=|process\.env\.[A-Z0-9_]*PRIVATE_KEY|new\s+Wallet\s*\(|fromPhrase\s*\(|fromMnemonic\s*\(/i,
);
assert.match(source, /execution_epoch_bound_in_public_gateway: true/);
assert.match(source, /runtime_route_active: false/);
assert.match(source, /transaction_submission: false/);
assert.match(source, /transaction_broadcast: false/);

console.log("VOID_ECONOMIC_EPOCH2_PUBLIC_SUBMISSION_GATEWAY_CORE_V1_GREEN");
console.log("signed_submission_source_primitive_proven=true");
console.log("execution_epoch_bound_in_public_gateway=true");
console.log("atomic_replay_consume_required=true");
console.log("same_digest_concurrent_admission_exactly_one=true");
console.log("durable_replay_store_verified=false");
console.log("privileged_signer_nonce_or_key_replay_fence_proven=false");
console.log("pending_legacy_signed_transaction_census_complete=false");
console.log("cross_epoch_replay_protection_proven=false");
console.log("runtime_route_active=false");
console.log("transaction_submission=false");
console.log("transaction_broadcast=false");
console.log("authoritative_chain2050_write=false");
console.log("migration_authorized=false");
console.log("public_activation=false");
console.log("funds_movement=false");

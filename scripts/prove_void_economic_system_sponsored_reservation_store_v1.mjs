#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Wallet } from "ethers";

import {
  VOID_ECONOMIC_INTENT_RESERVATION_SCHEMA_V1,
  VOID_ECONOMIC_INTENT_TTL_CAPS_POLICY_SCHEMA_V1,
  economicIntentReservationIdV1,
  economicIntentTtlCapsPolicyIdV1,
} from "../tools/void-economic-intent-ttl-caps-policy-v1.mjs";

import {
  buildVoidEconomicEpoch2SignedSubmissionIntentV1,
  voidEconomicEpoch2SignedSubmissionDigestV1,
  voidEconomicEpoch2SignedSubmissionTypedDataV1,
} from "../tools/void-economic-epoch2-signed-submission-intent-v1.mjs";

import {
  VOID_ECONOMIC_SYSTEM_SPONSORED_POLICY_SCHEMA_V1,
  VOID_ECONOMIC_SYSTEM_SPONSORSHIP_SCHEMA_V1,
  economicSystemSponsoredPolicyIdV1,
  economicSystemSponsorshipIdV1,
  verifyEconomicSystemSponsoredStateV1,
} from "../tools/void-economic-system-sponsored-anti-grief-policy-v1.mjs";

import {
  VOID_ECONOMIC_SYSTEM_SPONSORED_RESERVATION_STORE_AUTHORITY_V1,
  VOID_ECONOMIC_SYSTEM_SPONSORED_RESERVATION_STORE_V1,
  inspectEconomicSystemSponsoredReservationStoreV1,
  listEconomicSystemSponsoredReservationsV1,
  persistEconomicSystemSponsoredReservationV1,
} from "../tools/void-economic-system-sponsored-reservation-store-v1.mjs";

const {
  withBuyVoidFilesystemBakeryLockAsyncExistingQueueV1,
} = await import(
  "../dist/economic/buy_void_filesystem_bakery_lock_v1.js"
);

const launchId = "sha256:" + "a".repeat(64);
const target = "0x4444444444444444444444444444444444444444";
const BASE_UNIX = 1_790_400_000;
const BASE_MS = BASE_UNIX * 1000;

function hash(digit) {
  return "sha256:" + String(digit).repeat(64);
}

function ttlPolicy(overrides = {}) {
  const value = {
    schema: VOID_ECONOMIC_INTENT_TTL_CAPS_POLICY_SCHEMA_V1,
    policy_id: hash("0"),
    coupled_launch_id: launchId,
    policy_generation: "1",
    policy_committed_at_ms: BASE_MS,
    intent_ttl_seconds: 120,
    per_identity_max_outstanding: 4,
    global_max_outstanding: 8,
    late_payment_action: "reconcile_without_automatic_execution",
    ...overrides,
  };
  value.policy_id = economicIntentTtlCapsPolicyIdV1(value);
  return value;
}

function ttlIntent(policy, identityDigit, reservationDigit, issuedUnix) {
  const value = {
    schema: VOID_ECONOMIC_INTENT_RESERVATION_SCHEMA_V1,
    intent_id: hash("0"),
    policy_id: policy.policy_id,
    coupled_launch_id: launchId,
    identity_id: hash(identityDigit),
    reservation_id: hash(reservationDigit),
    issued_at_ms: issuedUnix * 1000,
    expires_at_ms:
      (issuedUnix + policy.intent_ttl_seconds) * 1000,
    state: "pending_unpaid",
  };
  value.intent_id = economicIntentReservationIdV1(value);
  return value;
}

function sponsorPolicy(ttl, overrides = {}) {
  const value = {
    schema: VOID_ECONOMIC_SYSTEM_SPONSORED_POLICY_SCHEMA_V1,
    policy_id: hash("0"),
    coupled_launch_id: launchId,
    intent_ttl_caps_policy_id: ttl.policy_id,
    policy_generation: "1",
    policy_committed_at_ms: BASE_MS + 500,
    per_intent_sponsored_gas_limit: "100000",
    per_identity_sponsored_gas_budget: "120000",
    global_sponsored_gas_budget: "180000",
    budget_exhaustion_action:
      "deny_sponsorship_without_hidden_trade_minimum",
    ...overrides,
  };
  value.policy_id = economicSystemSponsoredPolicyIdV1(value);
  return value;
}

function sponsorship(sponsor, intent, digest, gasLimit) {
  const value = {
    schema: VOID_ECONOMIC_SYSTEM_SPONSORSHIP_SCHEMA_V1,
    sponsorship_id: hash("0"),
    policy_id: sponsor.policy_id,
    coupled_launch_id: launchId,
    intent_ttl_caps_policy_id:
      sponsor.intent_ttl_caps_policy_id,
    intent_id: intent.intent_id,
    identity_id: intent.identity_id,
    reservation_id: intent.reservation_id,
    signed_submission_digest: digest,
    gas_limit: String(gasLimit),
  };
  value.sponsorship_id = economicSystemSponsorshipIdV1(value);
  return value;
}

async function candidate({
  ttl,
  sponsor,
  identityDigit,
  reservationDigit,
  walletDigit,
  issuedUnix,
  gasLimit,
}) {
  const wallet = new Wallet("0x" + String(walletDigit).repeat(64));
  const economicIntent =
    ttlIntent(ttl, identityDigit, reservationDigit, issuedUnix);
  const signedIntent =
    buildVoidEconomicEpoch2SignedSubmissionIntentV1({
      signer: wallet.address.toLowerCase(),
      nonce: "1",
      issuedAtUnix: String(issuedUnix),
      expiresAtUnix:
        String(issuedUnix + ttl.intent_ttl_seconds),
      target,
      gasLimit: String(gasLimit),
      calldata: "0x1234",
    });
  const typed =
    voidEconomicEpoch2SignedSubmissionTypedDataV1(signedIntent);
  const signature = await wallet.signTypedData(
    typed.domain,
    typed.types,
    typed.value,
  );
  const digest =
    voidEconomicEpoch2SignedSubmissionDigestV1(signedIntent);
  return Object.freeze({
    intent: economicIntent,
    sponsorship:
      sponsorship(sponsor, economicIntent, digest, gasLimit),
    signed_submission: Object.freeze({
      intent: signedIntent,
      calldata: "0x1234",
      signature,
      allowed_targets: Object.freeze([target]),
      consumed_digests: new Set(),
    }),
  });
}

function fixture({ lockQueue = true } = {}) {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-sponsored-reservation-store-v1-"),
  );
  fs.chmodSync(root, 0o700);
  const records = path.join(root, "records");
  const queue = path.join(root, "sponsorship-admission-v1.queue");
  fs.mkdirSync(records, { mode: 0o700 });
  if (lockQueue) {
    fs.mkdirSync(queue, { mode: 0o700 });
  }
  return { root, records, queue };
}

function cleanup(f) {
  fs.rmSync(f.root, { recursive: true, force: true });
}

function persistInput(root, ttl, sponsor, value, observedAt) {
  return {
    root_dir: root,
    ttl_caps_policy: ttl,
    sponsorship_policy: sponsor,
    candidate_intent: value.intent,
    candidate_sponsorship: value.sponsorship,
    candidate_signed_submission: value.signed_submission,
    observed_at_ms: observedAt,
  };
}

function listInput(root, ttl, sponsor, observedAt) {
  return {
    root_dir: root,
    ttl_caps_policy: ttl,
    sponsorship_policy: sponsor,
    observed_at_ms: observedAt,
  };
}

function requireOk(value) {
  assert.equal(value.ok, true, JSON.stringify(value));
  return value;
}

function requireHeld(value, reason) {
  assert.equal(value.ok, false, JSON.stringify(value));
  assert.equal(value.status, "held");
  if (reason) assert.equal(value.reason, reason);
  assert.equal(value.mutation_performed, false);
  assert.equal(value.gas_sponsorship_performed, false);
  assert.equal(value.transaction_submission, false);
  assert.equal(value.transaction_broadcast, false);
  assert.equal(value.funds_movement, false);
  return value;
}

for (const [key, value] of Object.entries(
  VOID_ECONOMIC_SYSTEM_SPONSORED_RESERVATION_STORE_AUTHORITY_V1,
)) {
  const trueKeys = new Set([
    "source_only_store",
    "canonical_anti_grief_classifier_reused",
    "canonical_historical_state_verifier_reused",
    "canonical_ttl_intent_identity_reused",
    "canonical_sponsorship_identity_reused",
    "duplicate_signed_submission_identity_required",
    "compound_intent_sponsorship_record",
    "append_only_history",
    "expired_history_retained",
    "serialized_admission",
    "filesystem_read",
    "filesystem_write",
    "descriptor_bound_reads",
    "create_once_publication",
    "preprovisioned_lock_queue_required",
    "structural_inspection_available",
    "policy_observation_time_explicit",
    "lock_housekeeping_wall_clock_read",
  ]);
  assert.equal(value, trueKeys.has(key), key);
}

const ttl = ttlPolicy();
const sponsor = sponsorPolicy(ttl);
const observedAt = (BASE_UNIX + 140) * 1000;

{
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-bakery-existing-queue-v1-"),
  );
  fs.chmodSync(root, 0o700);
  try {
    const missing = path.join(root, "missing.queue");
    await assert.rejects(
      () =>
        withBuyVoidFilesystemBakeryLockAsyncExistingQueueV1(
          missing,
          async () => "unexpected",
        ),
      /bakery_lock_directory_missing/u,
    );
    assert.equal(fs.existsSync(missing), false);

    const weak = path.join(root, "weak.queue");
    fs.mkdirSync(weak, { mode: 0o755 });
    fs.chmodSync(weak, 0o755);
    await assert.rejects(
      () =>
        withBuyVoidFilesystemBakeryLockAsyncExistingQueueV1(
          weak,
          async () => "unexpected",
        ),
      /bakery_lock_directory_must_be_private/u,
    );
    assert.equal(fs.statSync(weak).mode & 0o777, 0o755);

    const valid = path.join(root, "valid.queue");
    fs.mkdirSync(valid, { mode: 0o700 });
    const result =
      await withBuyVoidFilesystemBakeryLockAsyncExistingQueueV1(
        valid,
        async () => "locked",
      );
    assert.equal(result, "locked");
    assert.deepEqual(fs.readdirSync(valid), []);
    assert.equal(fs.statSync(valid).mode & 0o777, 0o700);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

{
  const f = fixture();
  try {
    const inspected = requireOk(
      inspectEconomicSystemSponsoredReservationStoreV1({
        root_dir: f.root,
      }),
    );
    assert.equal(inspected.status, "inspected");
    assert.equal(inspected.tracked_reservation_count, 0);
    assert.equal(inspected.policy_state_evaluated, false);
    assert.equal(inspected.observation_time_evaluated, false);
    assert.equal(inspected.mutation_performed, false);
    assert.equal(inspected.storage_bootstrap, false);
    assert.equal(inspected.preprovisioned_lock_queue_required, true);
  } finally {
    cleanup(f);
  }
}

{
  const f = fixture({ lockQueue: false });
  try {
    assert.equal(fs.existsSync(f.queue), false);
    requireHeld(
      inspectEconomicSystemSponsoredReservationStoreV1({
        root_dir: f.root,
      }),
      "SPONSORED_RESERVATION_STORE_LOCK_QUEUE_DIRECTORY_MISSING",
    );
    const value = await candidate({
      ttl,
      sponsor,
      identityDigit: "1",
      reservationDigit: "3",
      walletDigit: "1",
      issuedUnix: BASE_UNIX + 133,
      gasLimit: 30000,
    });
    requireHeld(
      await persistEconomicSystemSponsoredReservationV1(
        persistInput(f.root, ttl, sponsor, value, observedAt),
      ),
      "SPONSORED_RESERVATION_STORE_LOCK_QUEUE_DIRECTORY_MISSING",
    );
    assert.equal(
      fs.existsSync(f.queue),
      false,
      "missing queue must not be silently bootstrapped",
    );
  } finally {
    cleanup(f);
  }
}

{
  const f = fixture();
  try {
    fs.chmodSync(f.queue, 0o755);
    requireHeld(
      inspectEconomicSystemSponsoredReservationStoreV1({
        root_dir: f.root,
      }),
      "SPONSORED_RESERVATION_STORE_LOCK_QUEUE_DIRECTORY_INVALID",
    );
    assert.equal(fs.statSync(f.queue).mode & 0o777, 0o755);
  } finally {
    cleanup(f);
  }
}

{
  const f = fixture({ lockQueue: false });
  const targetQueue = path.join(f.root, "queue-target");
  try {
    fs.mkdirSync(targetQueue, { mode: 0o700 });
    fs.symlinkSync(targetQueue, f.queue, "dir");
    requireHeld(
      inspectEconomicSystemSponsoredReservationStoreV1({
        root_dir: f.root,
      }),
      "SPONSORED_RESERVATION_STORE_LOCK_QUEUE_DIRECTORY_INVALID",
    );
    assert.equal(fs.lstatSync(f.queue).isSymbolicLink(), true);
  } finally {
    cleanup(f);
  }
}

{
  const f = fixture();
  try {
    const first = await candidate({
      ttl,
      sponsor,
      identityDigit: "1",
      reservationDigit: "4",
      walletDigit: "1",
      issuedUnix: BASE_UNIX + 133,
      gasLimit: 50000,
    });
    const stored = requireOk(
      await persistEconomicSystemSponsoredReservationV1(
        persistInput(f.root, ttl, sponsor, first, observedAt),
      ),
    );
    assert.equal(stored.status, "reserved");
    assert.equal(stored.mutation_performed, true);
    assert.equal(stored.tracked_reservation_count, 1);
    assert.equal(stored.active_reserved_gas, "50000");
    assert.equal(stored.prospective_global_reserved_gas, "50000");

    const listed = requireOk(
      listEconomicSystemSponsoredReservationsV1(
        listInput(f.root, ttl, sponsor, observedAt),
      ),
    );
    assert.equal(listed.status, "listed");
    assert.equal(listed.records.length, 1);
    assert.equal(listed.active_reserved_gas, "50000");
    assert.equal(listed.mutation_performed, false);

    const replay = requireOk(
      await persistEconomicSystemSponsoredReservationV1(
        persistInput(f.root, ttl, sponsor, first, observedAt),
      ),
    );
    assert.equal(replay.status, "duplicate");
    assert.equal(replay.mutation_performed, false);
    assert.equal(replay.tracked_reservation_count, 1);

    const corruptedReplay = {
      ...first,
      signed_submission: {
        ...first.signed_submission,
        signature: "0x" + "00".repeat(65),
      },
    };
    requireHeld(
      await persistEconomicSystemSponsoredReservationV1(
        persistInput(
          f.root,
          ttl,
          sponsor,
          corruptedReplay,
          observedAt,
        ),
      ),
      "SPONSORED_RESERVATION_STORE_REPLAY_SIGNED_SUBMISSION_INVALID",
    );
    const afterCorruptReplay = requireOk(
      listEconomicSystemSponsoredReservationsV1(
        listInput(f.root, ttl, sponsor, observedAt),
      ),
    );
    assert.equal(afterCorruptReplay.records.length, 1);
    assert.equal(afterCorruptReplay.active_reserved_gas, "50000");

    const corruptCalldataReplay = {
      ...first,
      signed_submission: {
        ...first.signed_submission,
        calldata: "0x1235",
      },
    };
    requireHeld(
      await persistEconomicSystemSponsoredReservationV1(
        persistInput(
          f.root,
          ttl,
          sponsor,
          corruptCalldataReplay,
          observedAt,
        ),
      ),
      "SPONSORED_RESERVATION_STORE_REPLAY_SIGNED_SUBMISSION_INVALID",
    );

    const expiredAt = (BASE_UNIX + 254) * 1000;
    const expired = requireOk(
      listEconomicSystemSponsoredReservationsV1(
        listInput(f.root, ttl, sponsor, expiredAt),
      ),
    );
    assert.equal(expired.records.length, 1);
    assert.equal(expired.active_reserved_gas, "0");
    assert.equal(expired.expired_reserved_gas_not_counted, "50000");
    assert.equal(expired.trusted_observation_time_proven, false);
    assert.equal(expired.monotonic_observation_time_proven, false);

    const expiredReplay = requireOk(
      await persistEconomicSystemSponsoredReservationV1(
        persistInput(f.root, ttl, sponsor, first, expiredAt),
      ),
    );
    assert.equal(expiredReplay.status, "duplicate");
    assert.equal(expiredReplay.active_reserved_gas, "0");
    assert.equal(expiredReplay.trusted_observation_time_proven, false);
    assert.equal(expiredReplay.monotonic_observation_time_proven, false);

    requireHeld(
      await persistEconomicSystemSponsoredReservationV1(
        persistInput(
          f.root,
          ttl,
          sponsor,
          corruptedReplay,
          expiredAt,
        ),
      ),
      "SPONSORED_RESERVATION_STORE_REPLAY_SIGNED_SUBMISSION_INVALID",
    );

    const altered = {
      ...first,
      sponsorship:
        sponsorship(
          sponsor,
          first.intent,
          first.sponsorship.signed_submission_digest,
          40000,
        ),
    };
    requireHeld(
      await persistEconomicSystemSponsoredReservationV1(
        persistInput(f.root, ttl, sponsor, altered, observedAt),
      ),
      "SPONSORED_RESERVATION_STORE_IDENTITY_CONFLICT",
    );

    const other = await candidate({
      ttl,
      sponsor,
      identityDigit: "2",
      reservationDigit: "5",
      walletDigit: "2",
      issuedUnix: BASE_UNIX + 134,
      gasLimit: 40000,
    });
    const duplicateDigest = {
      ...other,
      sponsorship:
        sponsorship(
          sponsor,
          other.intent,
          first.sponsorship.signed_submission_digest,
          40000,
        ),
    };
    requireHeld(
      await persistEconomicSystemSponsoredReservationV1(
        persistInput(
          f.root,
          ttl,
          sponsor,
          duplicateDigest,
          observedAt,
        ),
      ),
      "SPONSORED_RESERVATION_STORE_IDENTITY_CONFLICT",
    );
  } finally {
    cleanup(f);
  }
}

{
  const f = fixture();
  try {
    const a = await candidate({
      ttl,
      sponsor,
      identityDigit: "1",
      reservationDigit: "6",
      walletDigit: "1",
      issuedUnix: BASE_UNIX + 133,
      gasLimit: 70000,
    });
    const b = await candidate({
      ttl,
      sponsor,
      identityDigit: "1",
      reservationDigit: "7",
      walletDigit: "2",
      issuedUnix: BASE_UNIX + 134,
      gasLimit: 50000,
    });
    const c = await candidate({
      ttl,
      sponsor,
      identityDigit: "1",
      reservationDigit: "8",
      walletDigit: "3",
      issuedUnix: BASE_UNIX + 135,
      gasLimit: 21000,
    });

    assert.equal(
      requireOk(
        await persistEconomicSystemSponsoredReservationV1(
          persistInput(f.root, ttl, sponsor, a, observedAt),
        ),
      ).status,
      "reserved",
    );
    assert.equal(
      requireOk(
        await persistEconomicSystemSponsoredReservationV1(
          persistInput(f.root, ttl, sponsor, b, observedAt),
        ),
      ).status,
      "reserved",
    );
    requireHeld(
      await persistEconomicSystemSponsoredReservationV1(
        persistInput(f.root, ttl, sponsor, c, observedAt),
      ),
      "sponsored_gas_budget_exhausted",
    );
    const listed = requireOk(
      listEconomicSystemSponsoredReservationsV1(
        listInput(f.root, ttl, sponsor, observedAt),
      ),
    );
    assert.equal(listed.records.length, 2);
    assert.equal(listed.active_reserved_gas, "120000");
  } finally {
    cleanup(f);
  }
}

{
  const f = fixture();
  const globalSponsor = sponsorPolicy(ttl, {
    per_identity_sponsored_gas_budget: "180000",
    global_sponsored_gas_budget: "180000",
  });
  try {
    for (const [identity, reservation, wallet] of [
      ["1", "9", "1"],
      ["2", "a", "2"],
      ["3", "b", "3"],
    ]) {
      const value = await candidate({
        ttl,
        sponsor: globalSponsor,
        identityDigit: identity,
        reservationDigit: reservation,
        walletDigit: wallet,
        issuedUnix: BASE_UNIX + 133 + Number.parseInt(identity, 16),
        gasLimit: 60000,
      });
      assert.equal(
        requireOk(
          await persistEconomicSystemSponsoredReservationV1(
            persistInput(
              f.root,
              ttl,
              globalSponsor,
              value,
              observedAt,
            ),
          ),
        ).status,
        "reserved",
      );
    }

    const overflow = await candidate({
      ttl,
      sponsor: globalSponsor,
      identityDigit: "4",
      reservationDigit: "c",
      walletDigit: "4",
      issuedUnix: BASE_UNIX + 137,
      gasLimit: 21000,
    });
    requireHeld(
      await persistEconomicSystemSponsoredReservationV1(
        persistInput(
          f.root,
          ttl,
          globalSponsor,
          overflow,
          observedAt,
        ),
      ),
      "sponsored_gas_budget_exhausted",
    );
    assert.equal(
      requireOk(
        listEconomicSystemSponsoredReservationsV1(
          listInput(f.root, ttl, globalSponsor, observedAt),
        ),
      ).active_reserved_gas,
      "180000",
    );
  } finally {
    cleanup(f);
  }
}

{
  const f = fixture();
  try {
    const oldValue = await candidate({
      ttl,
      sponsor,
      identityDigit: "1",
      reservationDigit: "d",
      walletDigit: "1",
      issuedUnix: BASE_UNIX + 1,
      gasLimit: 90000,
    });
    const oldObserved = (BASE_UNIX + 10) * 1000;
    requireOk(
      await persistEconomicSystemSponsoredReservationV1(
        persistInput(f.root, ttl, sponsor, oldValue, oldObserved),
      ),
    );

    const fresh = await candidate({
      ttl,
      sponsor,
      identityDigit: "2",
      reservationDigit: "e",
      walletDigit: "2",
      issuedUnix: BASE_UNIX + 133,
      gasLimit: 100000,
    });
    const admitted = requireOk(
      await persistEconomicSystemSponsoredReservationV1(
        persistInput(f.root, ttl, sponsor, fresh, observedAt),
      ),
    );
    assert.equal(admitted.status, "reserved");
    assert.equal(admitted.active_reserved_gas, "100000");
    assert.equal(admitted.expired_reserved_gas_not_counted, "90000");

    const listed = requireOk(
      listEconomicSystemSponsoredReservationsV1(
        listInput(f.root, ttl, sponsor, observedAt),
      ),
    );
    assert.equal(listed.records.length, 2);
    assert.equal(listed.active_reserved_gas, "100000");
    assert.equal(listed.expired_reserved_gas_not_counted, "90000");
  } finally {
    cleanup(f);
  }
}

{
  const f = fixture();
  try {
    const value = await candidate({
      ttl,
      sponsor,
      identityDigit: "1",
      reservationDigit: "f",
      walletDigit: "1",
      issuedUnix: BASE_UNIX + 133,
      gasLimit: 50000,
    });
    requireOk(
      await persistEconomicSystemSponsoredReservationV1(
        persistInput(f.root, ttl, sponsor, value, observedAt),
      ),
    );
    const finalName =
      value.sponsorship.sponsorship_id.replace(/^sha256:/u, "") +
      ".json";
    const finalPath = path.join(f.records, finalName);
    const bytes = fs.readFileSync(finalPath);

    const emptyTemp =
      path.join(
        f.records,
        "." +
          finalName +
          ".tmp-" +
          String(process.pid) +
          "-0000000000000000",
      );
    fs.writeFileSync(emptyTemp, Buffer.alloc(0), { mode: 0o600 });
    requireHeld(
      listEconomicSystemSponsoredReservationsV1(
        listInput(f.root, ttl, sponsor, observedAt),
      ),
      "SPONSORED_RESERVATION_STORE_RECOVERY_REQUIRED",
    );
    const emptyRecovered = requireOk(
      await persistEconomicSystemSponsoredReservationV1(
        persistInput(f.root, ttl, sponsor, value, observedAt),
      ),
    );
    assert.equal(emptyRecovered.status, "duplicate");
    assert.equal(emptyRecovered.mutation_performed, true);
    assert.equal(fs.existsSync(emptyTemp), false);

    const unpublishedTemp =
      path.join(
        f.records,
        "." +
          finalName +
          ".tmp-" +
          String(process.pid) +
          "-0123456789abcdef",
      );
    fs.writeFileSync(unpublishedTemp, bytes, { mode: 0o600 });
    requireHeld(
      listEconomicSystemSponsoredReservationsV1(
        listInput(f.root, ttl, sponsor, observedAt),
      ),
      "SPONSORED_RESERVATION_STORE_RECOVERY_REQUIRED",
    );
    assert.equal(fs.existsSync(unpublishedTemp), true);

    const recovered = requireOk(
      await persistEconomicSystemSponsoredReservationV1(
        persistInput(f.root, ttl, sponsor, value, observedAt),
      ),
    );
    assert.equal(recovered.status, "duplicate");
    assert.equal(recovered.mutation_performed, true);
    assert.equal(fs.existsSync(unpublishedTemp), false);

    const linkedTemp =
      path.join(
        f.records,
        "." +
          finalName +
          ".tmp-" +
          String(process.pid) +
          "-fedcba9876543210",
      );
    fs.linkSync(finalPath, linkedTemp);
    requireHeld(
      listEconomicSystemSponsoredReservationsV1(
        listInput(f.root, ttl, sponsor, observedAt),
      ),
      "SPONSORED_RESERVATION_STORE_RECOVERY_REQUIRED",
    );
    const linkedRecovery = requireOk(
      await persistEconomicSystemSponsoredReservationV1(
        persistInput(f.root, ttl, sponsor, value, observedAt),
      ),
    );
    assert.equal(linkedRecovery.status, "duplicate");
    assert.equal(linkedRecovery.mutation_performed, true);
    assert.equal(fs.existsSync(linkedTemp), false);
    assert.equal(fs.lstatSync(finalPath).nlink, 1);
  } finally {
    cleanup(f);
  }
}

{
  const f = fixture();
  const originalReaddirSync = fs.readdirSync;
  let injectedTemp = "";
  try {
    const value = await candidate({
      ttl,
      sponsor,
      identityDigit: "8",
      reservationDigit: "8",
      walletDigit: "8",
      issuedUnix: BASE_UNIX + 133,
      gasLimit: 50000,
    });
    const finalName =
      value.sponsorship.sponsorship_id.replace(/^sha256:/u, "") +
      ".json";
    const finalPath = path.join(f.records, finalName);
    let postPublicationHistoryReads = 0;
    fs.readdirSync = function patchedReaddirSync(target, ...args) {
      const result = originalReaddirSync.call(fs, target, ...args);
      if (
        Array.isArray(result) &&
        result.includes(finalName)
      ) {
        postPublicationHistoryReads += 1;
        if (postPublicationHistoryReads === 1) {
          injectedTemp = path.join(
            f.records,
            "." +
              finalName +
              ".tmp-" +
              String(process.pid) +
              "-bbbbbbbbbbbbbbbb",
          );
          fs.writeFileSync(injectedTemp, Buffer.alloc(0), {
            mode: 0o600,
          });
        }
      }
      return result;
    };
    const held =
      await persistEconomicSystemSponsoredReservationV1(
        persistInput(f.root, ttl, sponsor, value, observedAt),
      );
    assert.equal(held.ok, false, JSON.stringify(held));
    assert.equal(held.status, "held");
    assert.equal(
      held.reason,
      "SPONSORED_RESERVATION_STORE_RECOVERY_REQUIRED",
    );
    assert.equal(held.mutation_performed, true);
    assert.equal(fs.existsSync(finalPath), true);
    assert.equal(fs.existsSync(injectedTemp), true);
    assert.equal(held.gas_sponsorship_performed, false);
    assert.equal(held.transaction_submission, false);
    assert.equal(held.transaction_broadcast, false);
    assert.equal(held.funds_movement, false);
  } finally {
    fs.readdirSync = originalReaddirSync;
    if (injectedTemp) {
      try {
        fs.unlinkSync(injectedTemp);
      } catch (error) {
        if (error?.code !== "ENOENT") throw error;
      }
    }
    cleanup(f);
  }
}

{
  const f = fixture();
  const originalReaddirSync = fs.readdirSync;
  let racingTemp = "";
  try {
    const value = await candidate({
      ttl,
      sponsor,
      identityDigit: "7",
      reservationDigit: "7",
      walletDigit: "7",
      issuedUnix: BASE_UNIX + 133,
      gasLimit: 50000,
    });
    requireOk(
      await persistEconomicSystemSponsoredReservationV1(
        persistInput(f.root, ttl, sponsor, value, observedAt),
      ),
    );
    const finalName =
      value.sponsorship.sponsorship_id.replace(/^sha256:/u, "") +
      ".json";
    racingTemp = path.join(
      f.records,
      "." +
        finalName +
        ".tmp-" +
        String(process.pid) +
        "-aaaaaaaaaaaaaaaa",
    );
    let recordDirectoryReads = 0;
    fs.readdirSync = function patchedReaddirSync(target, ...args) {
      let result = originalReaddirSync.call(fs, target, ...args);
      if (
        Array.isArray(result) &&
        result.includes(finalName)
      ) {
        recordDirectoryReads += 1;
        if (recordDirectoryReads === 2) {
          fs.writeFileSync(racingTemp, Buffer.alloc(0), {
            mode: 0o600,
          });
          result = originalReaddirSync.call(fs, target, ...args);
        }
      }
      return result;
    };
    requireHeld(
      listEconomicSystemSponsoredReservationsV1(
        listInput(f.root, ttl, sponsor, observedAt),
      ),
      "SPONSORED_RESERVATION_STORE_RECOVERY_REQUIRED",
    );
    assert.equal(fs.existsSync(racingTemp), true);
  } finally {
    fs.readdirSync = originalReaddirSync;
    if (racingTemp) {
      try {
        fs.unlinkSync(racingTemp);
      } catch (error) {
        if (error?.code !== "ENOENT") throw error;
      }
    }
    cleanup(f);
  }
}

{
  const f = fixture();
  const originalReaddirSync = fs.readdirSync;
  let movedRecords = "";
  try {
    const value = await candidate({
      ttl,
      sponsor,
      identityDigit: "9",
      reservationDigit: "9",
      walletDigit: "9",
      issuedUnix: BASE_UNIX + 133,
      gasLimit: 50000,
    });
    const finalName =
      value.sponsorship.sponsorship_id.replace(/^sha256:/u, "") +
      ".json";
    let finalNameReads = 0;
    fs.readdirSync = function patchedReaddirSync(target, ...args) {
      const result = originalReaddirSync.call(fs, target, ...args);
      if (Array.isArray(result) && result.includes(finalName)) {
        finalNameReads += 1;
        if (finalNameReads === 2) {
          movedRecords = f.records + "-moved";
          fs.renameSync(f.records, movedRecords);
          fs.mkdirSync(f.records, { mode: 0o700 });
        }
      }
      return result;
    };
    const held =
      await persistEconomicSystemSponsoredReservationV1(
        persistInput(f.root, ttl, sponsor, value, observedAt),
      );
    assert.equal(held.ok, false, JSON.stringify(held));
    assert.equal(held.status, "held");
    assert.equal(
      held.reason,
      "SPONSORED_RESERVATION_STORE_RECORDS_DIRECTORY_CHANGED",
    );
    assert.equal(held.mutation_performed, true);
    assert.equal(
      fs.existsSync(path.join(movedRecords, finalName)),
      true,
    );
    assert.equal(held.gas_sponsorship_performed, false);
    assert.equal(held.transaction_submission, false);
    assert.equal(held.transaction_broadcast, false);
    assert.equal(held.funds_movement, false);
  } finally {
    fs.readdirSync = originalReaddirSync;
    cleanup(f);
  }
}

{
  const f = fixture();
  const originalReaddirSync = fs.readdirSync;
  let movedRecords = "";
  try {
    const value = await candidate({
      ttl,
      sponsor,
      identityDigit: "7",
      reservationDigit: "7",
      walletDigit: "7",
      issuedUnix: BASE_UNIX + 133,
      gasLimit: 50000,
    });
    requireOk(
      await persistEconomicSystemSponsoredReservationV1(
        persistInput(f.root, ttl, sponsor, value, observedAt),
      ),
    );
    const finalName =
      value.sponsorship.sponsorship_id.replace(/^sha256:/u, "") +
      ".json";
    let finalNameReads = 0;
    fs.readdirSync = function patchedReaddirSync(target, ...args) {
      const result = originalReaddirSync.call(fs, target, ...args);
      if (Array.isArray(result) && result.includes(finalName)) {
        finalNameReads += 1;
        if (finalNameReads === 2) {
          movedRecords = f.records + "-moved";
          fs.renameSync(f.records, movedRecords);
          fs.mkdirSync(f.records, { mode: 0o700 });
        }
      }
      return result;
    };
    const held =
      await persistEconomicSystemSponsoredReservationV1(
        persistInput(f.root, ttl, sponsor, value, observedAt),
      );
    assert.equal(held.ok, false, JSON.stringify(held));
    assert.equal(held.status, "held");
    assert.equal(
      held.reason,
      "SPONSORED_RESERVATION_STORE_RECORDS_DIRECTORY_CHANGED",
    );
    assert.equal(held.mutation_performed, false);
    assert.equal(
      fs.existsSync(path.join(movedRecords, finalName)),
      true,
    );
    assert.equal(held.gas_sponsorship_performed, false);
    assert.equal(held.transaction_submission, false);
    assert.equal(held.transaction_broadcast, false);
    assert.equal(held.funds_movement, false);
  } finally {
    fs.readdirSync = originalReaddirSync;
    cleanup(f);
  }
}

{
  const f = fixture();
  const originalReaddirSync = fs.readdirSync;
  let movedRecords = "";
  try {
    const value = await candidate({
      ttl,
      sponsor,
      identityDigit: "6",
      reservationDigit: "6",
      walletDigit: "6",
      issuedUnix: BASE_UNIX + 133,
      gasLimit: 50000,
    });
    requireOk(
      await persistEconomicSystemSponsoredReservationV1(
        persistInput(f.root, ttl, sponsor, value, observedAt),
      ),
    );
    const finalName =
      value.sponsorship.sponsorship_id.replace(/^sha256:/u, "") +
      ".json";
    let finalNameReads = 0;
    fs.readdirSync = function patchedReaddirSync(target, ...args) {
      const result = originalReaddirSync.call(fs, target, ...args);
      if (Array.isArray(result) && result.includes(finalName)) {
        finalNameReads += 1;
        if (finalNameReads === 2) {
          movedRecords = f.records + "-moved";
          fs.renameSync(f.records, movedRecords);
          fs.mkdirSync(f.records, { mode: 0o700 });
        }
      }
      return result;
    };
    requireHeld(
      listEconomicSystemSponsoredReservationsV1(
        listInput(f.root, ttl, sponsor, observedAt),
      ),
      "SPONSORED_RESERVATION_STORE_RECORDS_DIRECTORY_CHANGED",
    );
  } finally {
    fs.readdirSync = originalReaddirSync;
    cleanup(f);
  }
}

{
  const f = fixture();
  const originalReaddirSync = fs.readdirSync;
  let movedRecords = "";
  try {
    const value = await candidate({
      ttl,
      sponsor,
      identityDigit: "5",
      reservationDigit: "5",
      walletDigit: "5",
      issuedUnix: BASE_UNIX + 133,
      gasLimit: 50000,
    });
    requireOk(
      await persistEconomicSystemSponsoredReservationV1(
        persistInput(f.root, ttl, sponsor, value, observedAt),
      ),
    );
    const finalName =
      value.sponsorship.sponsorship_id.replace(/^sha256:/u, "") +
      ".json";
    let finalNameReads = 0;
    fs.readdirSync = function patchedReaddirSync(target, ...args) {
      const result = originalReaddirSync.call(fs, target, ...args);
      if (Array.isArray(result) && result.includes(finalName)) {
        finalNameReads += 1;
        if (finalNameReads === 2) {
          movedRecords = f.records + "-duplicate-moved";
          fs.renameSync(f.records, movedRecords);
          fs.mkdirSync(f.records, { mode: 0o700 });
        }
      }
      return result;
    };
    const held =
      await persistEconomicSystemSponsoredReservationV1(
        persistInput(f.root, ttl, sponsor, value, observedAt),
      );
    assert.equal(held.ok, false, JSON.stringify(held));
    assert.equal(held.status, "held");
    assert.equal(
      held.reason,
      "SPONSORED_RESERVATION_STORE_RECORDS_DIRECTORY_CHANGED",
    );
    assert.equal(held.mutation_performed, false);
    assert.equal(
      fs.existsSync(path.join(movedRecords, finalName)),
      true,
    );
    assert.equal(held.gas_sponsorship_performed, false);
    assert.equal(held.transaction_submission, false);
    assert.equal(held.transaction_broadcast, false);
    assert.equal(held.funds_movement, false);
  } finally {
    fs.readdirSync = originalReaddirSync;
    cleanup(f);
  }
}

{
  const f = fixture();
  try {
    fs.writeFileSync(
      path.join(f.records, "f".repeat(64) + ".json"),
      "{}\n",
      { mode: 0o600 },
    );
    const held = listEconomicSystemSponsoredReservationsV1(
      listInput(f.root, ttl, sponsor, observedAt),
    );
    assert.equal(held.ok, false);
    assert.match(held.reason, /RECORD_(KEYS|HEADER|IDENTITY|BINDING|JSON)/u);
  } finally {
    cleanup(f);
  }
}

{
  const f = fixture();
  try {
    const foreign = path.join(f.root, "foreign.json");
    fs.writeFileSync(foreign, "{}\n", { mode: 0o600 });
    fs.symlinkSync(
      foreign,
      path.join(f.records, "e".repeat(64) + ".json"),
    );
    const held = listEconomicSystemSponsoredReservationsV1(
      listInput(f.root, ttl, sponsor, observedAt),
    );
    assert.equal(held.ok, false);
    assert.match(held.reason, /RECORD_FILE_INVALID/u);
  } finally {
    cleanup(f);
  }
}

{
  const f = fixture();
  const alias = f.root + "-alias";
  try {
    fs.symlinkSync(f.root, alias);
    const held = listEconomicSystemSponsoredReservationsV1(
      listInput(alias, ttl, sponsor, observedAt),
    );
    assert.equal(held.ok, false);
    assert.match(
      held.reason,
      /SPONSORED_RESERVATION_STORE_ROOT_(ANCESTOR_WALK_FAILED|INVALID)/u,
    );
  } finally {
    try {
      fs.unlinkSync(alias);
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
    cleanup(f);
  }
}

{
  const f = fixture();
  const raceSponsor = sponsorPolicy(ttl, {
    per_identity_sponsored_gas_budget: "100000",
    global_sponsored_gas_budget: "100000",
  });
  try {
    const a = await candidate({
      ttl,
      sponsor: raceSponsor,
      identityDigit: "1",
      reservationDigit: "1",
      walletDigit: "1",
      issuedUnix: BASE_UNIX + 133,
      gasLimit: 60000,
    });
    const b = await candidate({
      ttl,
      sponsor: raceSponsor,
      identityDigit: "2",
      reservationDigit: "2",
      walletDigit: "2",
      issuedUnix: BASE_UNIX + 134,
      gasLimit: 60000,
    });
    const results = await Promise.all([
      persistEconomicSystemSponsoredReservationV1(
        persistInput(f.root, ttl, raceSponsor, a, observedAt),
      ),
      persistEconomicSystemSponsoredReservationV1(
        persistInput(f.root, ttl, raceSponsor, b, observedAt),
      ),
    ]);
    assert.equal(results.filter((value) => value.ok).length, 1);
    assert.equal(
      results.filter(
        (value) =>
          !value.ok &&
          value.reason === "sponsored_gas_budget_exhausted",
      ).length,
      1,
    );

    const listed = requireOk(
      listEconomicSystemSponsoredReservationsV1(
        listInput(f.root, ttl, raceSponsor, observedAt),
      ),
    );
    assert.equal(listed.records.length, 1);
    assert.equal(listed.active_reserved_gas, "60000");
  } finally {
    cleanup(f);
  }
}

{
  const f = fixture();
  try {
    fs.rmSync(f.records, { recursive: true, force: true });
    const held = listEconomicSystemSponsoredReservationsV1(
      listInput(f.root, ttl, sponsor, observedAt),
    );
    assert.equal(held.ok, false);
    assert.equal(
      VOID_ECONOMIC_SYSTEM_SPONSORED_RESERVATION_STORE_AUTHORITY_V1
        .storage_bootstrap,
      false,
    );
  } finally {
    cleanup(f);
  }
}


async function proveTerminalBakeryReleaseSwapHolds(target) {
  const f = fixture();
  const originalFsync = fs.fsyncSync;
  const detached =
    target === "root"
      ? f.root + "-terminal-detached"
      : path.join(f.root, target + "-terminal-detached");
  let injected = false;
  try {
    const value = await candidate({
      ttl,
      sponsor,
      identityDigit: "3",
      reservationDigit: "4",
      walletDigit: "3",
      issuedUnix: BASE_UNIX + 133,
      gasLimit: 50000,
    });
    const recordName =
      value.sponsorship.sponsorship_id.replace(/^sha256:/u, "") +
      ".json";
    fs.fsyncSync = function patchedFsync(fd, ...args) {
      const result = originalFsync.call(fs, fd, ...args);
      if (injected) return result;
      let descriptorPath;
      try {
        descriptorPath = fs.readlinkSync(
          "/proc/self/fd/" + String(fd),
        );
      } catch {
        return result;
      }
      if (
        descriptorPath !== f.queue ||
        !fs.existsSync(path.join(f.records, recordName)) ||
        fs.readdirSync(f.queue).some(
          (name) => name.startsWith("ticket-"),
        )
      ) {
        return result;
      }
      // At this point the last bakery claim has been removed and the
      // release-directory fsync has completed, but the callback outcome
      // has not yet returned to the caller.
      injected = true;
      const visible =
        target === "root"
          ? f.root
          : target === "records"
            ? f.records
            : f.queue;
      fs.renameSync(visible, detached);
      fs.mkdirSync(visible, { mode: 0o700 });
      return result;
    };
    const outcome =
      await persistEconomicSystemSponsoredReservationV1(
        persistInput(f.root, ttl, sponsor, value, observedAt),
      );
    assert.equal(injected, true, target + " release swap not exercised");
    assert.equal(outcome.ok, false, JSON.stringify(outcome));
    assert.equal(outcome.status, "held");
    assert.equal(
      outcome.reason,
      target === "root"
        ? "SPONSORED_RESERVATION_STORE_ROOT_CHANGED"
        : target === "records"
          ? "SPONSORED_RESERVATION_STORE_RECORDS_DIRECTORY_CHANGED"
          : "SPONSORED_RESERVATION_STORE_LOCK_QUEUE_DIRECTORY_CHANGED",
    );
    assert.equal(
      outcome.mutation_performed,
      true,
      "durable reservation remains committed despite the rejected success",
    );
    const committedRecord =
      target === "root"
        ? path.join(detached, "records", recordName)
        : target === "records"
          ? path.join(detached, recordName)
          : path.join(f.records, recordName);
    assert.equal(fs.existsSync(committedRecord), true);
    assert.equal(outcome.gas_sponsorship_performed, false);
    assert.equal(outcome.transaction_submission, false);
    assert.equal(outcome.transaction_broadcast, false);
    assert.equal(outcome.funds_movement, false);
  } finally {
    fs.fsyncSync = originalFsync;
    cleanup(f);
    if (target === "root") {
      fs.rmSync(detached, { recursive: true, force: true });
    }
  }
}

await proveTerminalBakeryReleaseSwapHolds("root");
await proveTerminalBakeryReleaseSwapHolds("records");
await proveTerminalBakeryReleaseSwapHolds("queue");

const historicalState = verifyEconomicSystemSponsoredStateV1({
  sponsorship_policy: sponsor,
  ttl_caps_policy: ttl,
  outstanding_intents: [],
  sponsorships: [],
  observed_at_ms: observedAt,
});
assert.equal(historicalState.historical_state_verified, true);
assert.equal(historicalState.active_reserved_gas, "0");
assert.equal(historicalState.runtime_enforcement_verified, false);
assert.equal(
  VOID_ECONOMIC_SYSTEM_SPONSORED_RESERVATION_STORE_AUTHORITY_V1
    .trusted_observation_time_proven,
  false,
);
assert.equal(
  VOID_ECONOMIC_SYSTEM_SPONSORED_RESERVATION_STORE_AUTHORITY_V1
    .monotonic_observation_time_proven,
  false,
);

const source = fs.readFileSync(
  "tools/void-economic-system-sponsored-reservation-store-v1.mjs",
  "utf8",
);
assert.match(
  source,
  /withBuyVoidFilesystemBakeryLockAsyncExistingQueueV1/u,
);
assert.match(source, /openLockQueueDirectory/u);
assert.match(source, /LOCK_QUEUE_DIRECTORY/u);
assert.match(source, /inspectEconomicSystemSponsoredReservationStoreV1/u);
assert.match(
  source,
  /SPONSORED_RESERVATION_STORE_DIRECTORY_CHANGED_DURING_READ/u,
);
assert.match(
  source,
  /namesAfter\.some\(\(name, index\) => name !== namesBefore\[index\]\)/u,
);
assert.match(
  source,
  /return held\([\s\S]*mutationPerformed[\s\S]*\);/u,
);
assert.equal(
  (
    source.match(
      /assertPinnedDirectoryVisible\([\s\S]{0,120}SPONSORED_RESERVATION_STORE_RECORDS_DIRECTORY/g,
    ) || []
  ).length >= 4,
  true,
);
assert.match(source, /classifyEconomicSystemSponsoredAdmissionV1/u);
assert.match(source, /verifyEconomicSystemSponsoredStateV1/u);
assert.match(source, /O_NOFOLLOW/u);
assert.match(source, /O_DIRECTORY/u);
assert.match(source, /fs\.fsyncSync/u);
assert.doesNotMatch(
  source,
  /eth_sendRawTransaction|eth_sendTransaction|systemctl|mount\s|chownSync/u,
);

console.log(
  "VOID_ECONOMIC_SYSTEM_SPONSORED_RESERVATION_STORE_V1_PROOF_GREEN",
);
console.log("canonical_anti_grief_classifier_reused=true");
console.log("canonical_historical_state_verifier_reused=true");
console.log("compound_intent_sponsorship_record=true");
console.log("exact_replay_idempotent=true");
console.log("duplicate_signed_submission_identity_required=true");
console.log("corrupted_replay_signature_hold=true");
console.log("expired_history_retained=true");
console.log("expired_gas_not_counted=true");
console.log("per_identity_budget_enforced=true");
console.log("global_budget_enforced=true");
console.log("concurrent_near_budget_serialized=true");
console.log("crash_temp_recovery=true");
console.log("crash_temp_cleanup_reports_mutation=true");
console.log("duplicate_visible_store_swap_rejected=true");
console.log("ordinary_duplicate_replay_reports_mutation=false");
console.log("zero_byte_unpublished_temp_recovery=true");
console.log("read_only_listing_temp_cleanup=false");
console.log("duplicate_root_path_revalidated=true");
console.log("terminal_bakery_release_root_swap_hold=true");
console.log("terminal_bakery_release_records_swap_hold=true");
console.log("terminal_bakery_release_queue_swap_hold=true");
console.log("duplicate_path_swap_holds_without_store_mutation=true");
console.log("existing_queue_lock_missing_queue_bootstrap=false");
console.log("existing_queue_lock_permission_normalization=false");
console.log("existing_queue_lock_valid_queue_cleanup=true");
console.log("preprovisioned_lock_queue_required=true");
console.log("missing_lock_queue_bootstrap=false");
console.log("structural_inspection_available=true");
console.log("structural_inspection_policy_state_evaluated=false");
console.log("structural_inspection_observation_time_evaluated=false");
console.log("storage_bootstrap=false");
console.log("runtime_route_mount=false");
console.log("trusted_observation_time_proven=false");
console.log("monotonic_observation_time_proven=false");
console.log("caller_supplied_future_time_can_change_source_budget_view=true");
console.log("runtime_enforcement_verified=false");
console.log("gas_sponsorship_performed=false");
console.log("funds_movement=false");
console.log(
  "marker=" +
    VOID_ECONOMIC_SYSTEM_SPONSORED_RESERVATION_STORE_V1,
);

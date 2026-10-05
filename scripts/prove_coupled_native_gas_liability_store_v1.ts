#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  VOID_COUPLED_NATIVE_GAS_LIABILITY_V1,
  buildCoupledNativeGasPayerObservationV1,
  classifyCoupledNativeGasBuyVoidAdmissionV1,
  type CoupledNativeGasLiabilityRecordV1,
} from "../src/economic/coupled_native_gas_liability_v1.js";
import {
  VOID_COUPLED_NATIVE_GAS_OPEN_LIABILITY_STORE_AUTHORITY_V1,
  VOID_COUPLED_NATIVE_GAS_OPEN_LIABILITY_STORE_V1,
  persistCoupledNativeGasOpenLiabilityV1,
  serializeCoupledNativeGasStorePayerDomainV1,
  type CoupledNativeGasOpenLiabilityStoreDecisionV1,
} from "../src/economic/coupled_native_gas_liability_store_v1.js";
import {
  VOID_BUY_VOID_PREPARED_TRANSACTION_PLAN_RESERVATION_V1,
  type BuyVoidPreparedTransactionPlanReservationV1,
} from "../src/economic/buy_void_prepared_transaction_plan_reservation_v1.js";

const wallet = "0x" + "1".repeat(40);
const otherWallet = "0x" + "2".repeat(40);
const delivery = "0x" + "3".repeat(40);
const RECORDS = "records";
const QUEUE = "gas-liability-admission-v1.queue";
const DOMAIN = "payer-domain-v1.json";

function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") {
    const encoded = JSON.stringify(value);
    if (encoded === undefined) throw new Error("noncanonical_value");
    return encoded;
  }
  if (Array.isArray(value)) {
    return "[" + value.map(canonical).join(",") + "]";
  }
  const record = value as Record<string, unknown>;
  return (
    "{" +
    Object.keys(record)
      .sort()
      .map((key) => JSON.stringify(key) + ":" + canonical(record[key]))
      .join(",") +
    "}"
  );
}

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function fingerprint(value: unknown): string {
  return sha256(canonical(value));
}

function makePlan(input: {
  attempt?: string;
  nonce?: number;
  gas_limit?: string;
  max_fee_per_gas_wei?: string;
  max_priority_fee_per_gas_wei?: string;
  wallet_address?: string;
} = {}): BuyVoidPreparedTransactionPlanReservationV1 {
  const attempt = input.attempt ?? "a".repeat(64);
  const nonce = input.nonce ?? 7;
  const payer = (input.wallet_address ?? wallet).toLowerCase();
  const gas = input.gas_limit ?? "21000";
  const maxFee = input.max_fee_per_gas_wei ?? "10";
  const priority = input.max_priority_fee_per_gas_wei ?? "1";
  const saga = "voidbvfsg1_" + "b".repeat(64);
  const economic = "c".repeat(64);
  const preparation = "d".repeat(64);
  const walletKey = sha256("void-buy-wallet-v1\n2050\n" + payer);
  const template = fingerprint({
    saga_id: saga,
    attempt_id: attempt,
    chain_id: "2050",
    wallet_address: payer,
    delivery_address: delivery,
    native_value_wei: "1",
    gas_limit: gas,
    max_fee_per_gas_wei: maxFee,
    max_priority_fee_per_gas_wei: priority,
    economic_policy_fingerprint_sha256: economic,
    preparation_policy_fingerprint_sha256: preparation,
  });
  const planFingerprint = fingerprint({
    transaction_template_fingerprint_sha256: template,
    nonce,
  });
  const reservationId = sha256(
    [
      "void-buy-prepared-transaction-plan-reservation-v1",
      walletKey,
      String(nonce),
      attempt,
      planFingerprint,
    ].join("\n"),
  );
  return {
    schema: "void_buy_void_prepared_transaction_plan_reservation_v1",
    marker: VOID_BUY_VOID_PREPARED_TRANSACTION_PLAN_RESERVATION_V1,
    version: 1,
    reservation_id: reservationId,
    reserved_at_ms: 1_800_000_000_000,
    saga_id: saga,
    attempt_id: attempt,
    chain_id: "2050",
    wallet_address: payer,
    wallet_key_sha256: walletKey,
    nonce,
    delivery_address: delivery,
    native_value_wei: "1",
    gas_limit: gas,
    max_fee_per_gas_wei: maxFee,
    max_priority_fee_per_gas_wei: priority,
    economic_policy_fingerprint_sha256: economic,
    preparation_policy_fingerprint_sha256: preparation,
    transaction_template_fingerprint_sha256: template,
    transaction_plan_fingerprint_sha256: planFingerprint,
    reservation_status: "reserved",
    nonce_release_authorized: false,
    credential_access_authorized: false,
    wallet_access_authorized: false,
    signing_authorized: false,
    transaction_broadcast_authorized: false,
    raw_signed_transaction_persisted: false,
    money_movement_authorized: false,
  };
}

function observation(input: {
  payer?: string;
  balance?: string;
  fee?: string;
  observed_at_ms?: number;
  expires_at_ms?: number;
  source?: string;
} = {}) {
  return buildCoupledNativeGasPayerObservationV1({
    payer_address: input.payer ?? wallet,
    observed_native_balance_wei: input.balance ?? "1000000",
    required_max_fee_per_gas_wei: input.fee ?? "9",
    observed_at_ms: input.observed_at_ms ?? 1000,
    expires_at_ms: input.expires_at_ms ?? 2000,
    source_identity_sha256: input.source ?? "e".repeat(64),
  });
}

type Fixture = {
  root: string;
  records: string;
  queue: string;
  domain: string;
};

function fixture(input: {
  payer?: string;
  records?: boolean;
  queue?: boolean;
  domain?: boolean;
} = {}): Fixture {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-native-gas-store-v1-"),
  );
  fs.chmodSync(root, 0o700);
  const records = path.join(root, RECORDS);
  const queue = path.join(root, QUEUE);
  const domain = path.join(root, DOMAIN);
  if (input.records !== false) fs.mkdirSync(records, { mode: 0o700 });
  if (input.queue !== false) fs.mkdirSync(queue, { mode: 0o700 });
  if (input.domain !== false) {
    fs.writeFileSync(
      domain,
      serializeCoupledNativeGasStorePayerDomainV1(
        input.payer ?? wallet,
      ),
      { mode: 0o600 },
    );
  }
  return { root, records, queue, domain };
}

function cleanup(f: Fixture): void {
  fs.rmSync(f.root, { recursive: true, force: true });
}

function finalRecordNames(f: Fixture): string[] {
  if (!fs.existsSync(f.records)) return [];
  return fs
    .readdirSync(f.records)
    .filter((name) => /^[0-9a-f]{64}\.json$/u.test(name))
    .sort();
}

function requireOk(
  value: CoupledNativeGasOpenLiabilityStoreDecisionV1,
): Extract<CoupledNativeGasOpenLiabilityStoreDecisionV1, { ok: true }> {
  if (value.ok !== true) throw new Error(value.reason);
  return value;
}

function requireHeld(
  value: CoupledNativeGasOpenLiabilityStoreDecisionV1,
  reason: string,
  mutationPerformed = false,
): Extract<CoupledNativeGasOpenLiabilityStoreDecisionV1, { ok: false }> {
  if (value.ok !== false) {
    throw new Error("expected native gas liability store HOLD");
  }
  assert.equal(value.reason, reason);
  assert.equal(value.mutation_performed, mutationPerformed);
  assert.equal(
    value.status,
    mutationPerformed ? "held_after_mutation" : "held",
  );
  if (mutationPerformed) {
    assert.equal(
      value.detail?.durable_state_requires_reinspection,
      true,
    );
  }
  return value;
}

async function persist(
  f: Fixture,
  input: {
    plan?: BuyVoidPreparedTransactionPlanReservationV1;
    obs?: ReturnType<typeof observation>;
    now?: number;
  } = {},
) {
  return await persistCoupledNativeGasOpenLiabilityV1({
    root_dir: f.root,
    now_ms: input.now ?? 1500,
    buy_void_plan: input.plan ?? makePlan(),
    payer_observation: input.obs ?? observation(),
  });
}

for (const [key, value] of Object.entries(
  VOID_COUPLED_NATIVE_GAS_OPEN_LIABILITY_STORE_AUTHORITY_V1,
)) {
  const trueKeys = new Set([
    "source_store",
    "canonical_liability_classifier_reused",
    "payer_scoped_store",
    "payer_domain_identity_required",
    "full_locked_census",
    "serialized_admission",
    "preprovisioned_root_required",
    "preprovisioned_records_directory_required",
    "preprovisioned_lock_queue_required",
    "descriptor_bound_reads",
    "create_once_publication",
    "exact_postwrite_census",
    "exact_idempotent_replay",
    "postpublication_failure_reports_mutation",
    "open_liability_only",
    "filesystem_read",
    "filesystem_write",
  ]);
  assert.equal(value, trueKeys.has(key), key);
}

const storeSource = fs.readFileSync(
  path.join(
    process.cwd(),
    "src",
    "economic",
    "coupled_native_gas_liability_store_v1.ts",
  ),
  "utf8",
);
assert.match(
  storeSource,
  /withBuyVoidFilesystemBakeryLockAsyncExistingQueueV1/u,
);
assert.doesNotMatch(storeSource, /fs\.mkdirSync|fs\.chmodSync/u);
assert.doesNotMatch(
  storeSource,
  /withBuyVoidFilesystemBakeryLockAsyncV1\(/u,
);
assert.doesNotMatch(
  storeSource,
  /export\s+(?:async\s+)?function\s+[^\n]*(?:release|delete|reconcile)/iu,
);
assert.match(
  storeSource,
  /if \(before\.length >= MAX_RECORDS\) \{[\s\S]{0,180}coupled_native_gas_store_record_count_exceeded[\s\S]{0,240}createOnceLiability\(records!, classified\.liability\)/u,
  "new liability must HOLD at the record ceiling before durable publication",
);
assert.match(storeSource, /CoupledNativeGasStorePostMutationError/u);
assert.match(storeSource, /status: mutationPerformed \? "held_after_mutation" : "held"/u);
assert.match(storeSource, /durable_state_requires_reinspection/u);

{
  const root = path.join(
    os.tmpdir(),
    "void-native-gas-store-missing-" + crypto.randomBytes(8).toString("hex"),
  );
  const result = requireHeld(
    await persistCoupledNativeGasOpenLiabilityV1({
      root_dir: root,
      now_ms: 1500,
      buy_void_plan: makePlan(),
      payer_observation: observation(),
    }),
    "coupled_native_gas_store_root_missing",
  );
  assert.equal(result.authority.storage_bootstrap, false);
  assert.equal(fs.existsSync(root), false);
}

{
  const f = fixture({ records: false });
  try {
    requireHeld(
      await persist(f),
      "coupled_native_gas_store_records_directory_missing",
    );
    assert.equal(fs.existsSync(f.records), false);
  } finally {
    cleanup(f);
  }
}

{
  const f = fixture({ queue: false });
  try {
    requireHeld(
      await persist(f),
      "coupled_native_gas_store_lock_queue_missing",
    );
    assert.equal(fs.existsSync(f.queue), false);
  } finally {
    cleanup(f);
  }
}

{
  const f = fixture({ domain: false });
  try {
    requireHeld(
      await persist(f),
      "coupled_native_gas_store_payer_domain_missing",
    );
    assert.deepEqual(finalRecordNames(f), []);
  } finally {
    cleanup(f);
  }
}

{
  const f = fixture();
  try {
    fs.chmodSync(f.queue, 0o755);
    requireHeld(
      await persist(f),
      "coupled_native_gas_store_lock_queue_invalid",
    );
    assert.equal(fs.statSync(f.queue).mode & 0o777, 0o755);
    assert.deepEqual(finalRecordNames(f), []);
  } finally {
    cleanup(f);
  }
}

{
  const f = fixture({ queue: false });
  const target = path.join(f.root, "queue-target");
  try {
    fs.mkdirSync(target, { mode: 0o700 });
    fs.symlinkSync(target, f.queue, "dir");
    requireHeld(
      await persist(f),
      "coupled_native_gas_store_lock_queue_invalid",
    );
    assert.equal(fs.lstatSync(f.queue).isSymbolicLink(), true);
  } finally {
    cleanup(f);
  }
}

{
  const f = fixture({ payer: otherWallet });
  try {
    requireHeld(
      await persist(f),
      "coupled_native_gas_store_payer_domain_mismatch",
    );
    assert.deepEqual(finalRecordNames(f), []);
  } finally {
    cleanup(f);
  }
}

{
  const f = fixture();
  try {
    const stored = requireOk(await persist(f));
    assert.equal(stored.status, "stored");
    assert.equal(stored.mutation_performed, true);
    assert.equal(stored.payer_address, wallet);
    assert.equal(stored.tracked_open_liability_count, 1);
    assert.equal(stored.reserved_after_wei, "210001");
    assert.equal(stored.liability.marker, VOID_COUPLED_NATIVE_GAS_LIABILITY_V1);
    assert.deepEqual(
      finalRecordNames(f),
      [stored.liability.liability_id + ".json"],
    );
    assert.deepEqual(fs.readdirSync(f.queue), []);

    const fresh = observation({
      observed_at_ms: 1100,
      expires_at_ms: 2100,
      source: "f".repeat(64),
    });
    const replay = requireOk(
      await persist(f, { obs: fresh, now: 1500 }),
    );
    assert.equal(replay.status, "idempotent");
    assert.equal(replay.mutation_performed, false);
    assert.equal(
      replay.liability.liability_id,
      stored.liability.liability_id,
    );
    assert.equal(replay.tracked_open_liability_count, 1);
    assert.deepEqual(
      finalRecordNames(f),
      [stored.liability.liability_id + ".json"],
    );
  } finally {
    cleanup(f);
  }
}

{
  const f = fixture();
  const originalLinkSync = fs.linkSync;
  const originalFsyncSync = fs.fsyncSync;
  let linked = false;
  let injected = false;
  try {
    (fs as any).linkSync = (
      existingPath: fs.PathLike,
      newPath: fs.PathLike,
    ) => {
      originalLinkSync(existingPath, newPath);
      if (
        String(newPath).startsWith(
          f.records + path.sep,
        )
      ) {
        linked = true;
      }
    };
    (fs as any).fsyncSync = (fd: number) => {
      if (linked && !injected) {
        injected = true;
        throw new Error(
          "synthetic_post_link_directory_fsync_failure",
        );
      }
      return originalFsyncSync(fd);
    };

    const ambiguous = requireHeld(
      await persist(f),
      "synthetic_post_link_directory_fsync_failure",
      true,
    );
    assert.equal(injected, true);
    assert.equal(finalRecordNames(f).length, 1);

    (fs as any).linkSync = originalLinkSync;
    (fs as any).fsyncSync = originalFsyncSync;

    const replay = requireOk(await persist(f));
    assert.equal(replay.status, "idempotent");
    assert.equal(replay.mutation_performed, false);
    assert.equal(finalRecordNames(f).length, 1);
    assert.equal(
      replay.liability.liability_id + ".json",
      finalRecordNames(f)[0],
    );
    assert.equal(
      ambiguous.detail?.durable_state_requires_reinspection,
      true,
    );
  } finally {
    (fs as any).linkSync = originalLinkSync;
    (fs as any).fsyncSync = originalFsyncSync;
    cleanup(f);
  }
}

{
  const f = fixture();
  try {
    requireHeld(
      await persist(f, {
        obs: observation({
          observed_at_ms: 1000,
          expires_at_ms: 1200,
        }),
        now: 1200,
      }),
      "coupled_native_gas_fee_observation_stale",
    );
    assert.deepEqual(finalRecordNames(f), []);
  } finally {
    cleanup(f);
  }
}

{
  const f = fixture();
  try {
    const first = requireOk(await persist(f));
    const secondPlan = makePlan({
      attempt: "f".repeat(64),
      nonce: first.liability.nonce,
    });
    requireHeld(
      await persist(f, { plan: secondPlan }),
      "coupled_native_gas_nonce_conflict",
    );
    assert.equal(finalRecordNames(f).length, 1);
  } finally {
    cleanup(f);
  }
}

{
  const f = fixture();
  try {
    const planA = makePlan({
      attempt: "1".repeat(64),
      nonce: 11,
    });
    const planB = makePlan({
      attempt: "2".repeat(64),
      nonce: 12,
    });
    const tight = observation({ balance: "300000" });
    const [left, right] = await Promise.all([
      persist(f, { plan: planA, obs: tight }),
      persist(f, { plan: planB, obs: tight }),
    ]);
    const results = [left, right];
    const successful = results.filter((value) => value.ok === true);
    const held = results.filter((value) => value.ok === false);
    assert.equal(successful.length, 1);
    assert.equal(held.length, 1);
    assert.equal(
      (held[0] as Extract<
        CoupledNativeGasOpenLiabilityStoreDecisionV1,
        { ok: false }
      >).reason,
      "coupled_native_gas_insufficient_unreserved_native_balance",
    );
    assert.equal(finalRecordNames(f).length, 1);
    assert.deepEqual(fs.readdirSync(f.queue), []);
  } finally {
    cleanup(f);
  }
}

{
  const f = fixture();
  try {
    const candidate = classifyCoupledNativeGasBuyVoidAdmissionV1({
      now_ms: 1500,
      buy_void_plan: makePlan(),
      payer_observation: observation(),
      open_liabilities: [],
    });
    if (candidate.ok !== true) {
      throw new Error("unexpected classifier HOLD in corrupt-census fixture");
    }
    const corrupt: CoupledNativeGasLiabilityRecordV1 = {
      ...candidate.liability,
      maximum_reserved_wei: "1",
    };
    fs.writeFileSync(
      path.join(f.records, corrupt.liability_id + ".json"),
      canonical(corrupt) + "\n",
      { mode: 0o600 },
    );
    const other = makePlan({
      attempt: "9".repeat(64),
      nonce: 22,
    });
    requireHeld(
      await persist(f, { plan: other }),
      "coupled_native_gas_liability_economic_binding_invalid",
    );
    assert.equal(finalRecordNames(f).length, 1);
  } finally {
    cleanup(f);
  }
}

{
  const f = fixture();
  try {
    fs.writeFileSync(
      path.join(f.records, "unexpected"),
      "{}\n",
      { mode: 0o600 },
    );
    requireHeld(
      await persist(f),
      "coupled_native_gas_store_record_name_invalid",
    );
  } finally {
    cleanup(f);
  }
}

{
  const f = fixture();
  try {
    const temp =
      "." +
      "a".repeat(64) +
      ".json.tmp-" +
      String(process.pid) +
      "-0123456789abcdef";
    fs.writeFileSync(
      path.join(f.records, temp),
      "{}\n",
      { mode: 0o600 },
    );
    const stored = requireOk(await persist(f));
    assert.equal(stored.status, "stored");
    assert.equal(fs.existsSync(path.join(f.records, temp)), false);
    assert.equal(finalRecordNames(f).length, 1);
  } finally {
    cleanup(f);
  }
}

console.log("VOID_COUPLED_NATIVE_GAS_OPEN_LIABILITY_STORE_V1_PROOF_GREEN");
console.log("canonical_liability_classifier_reused=true");
console.log("payer_scoped_store=true");
console.log("preprovisioned_root_required=true");
console.log("preprovisioned_records_directory_required=true");
console.log("preprovisioned_lock_queue_required=true");
console.log("storage_bootstrap=false");
console.log("full_locked_census=true");
console.log("serialized_admission=true");
console.log("concurrent_near_balance_oversubscription_prevented=true");
console.log("exact_idempotent_replay=true");
console.log("corrupt_census_holds=true");
console.log("record_count_ceiling_prepublication_hold=true");
console.log("open_liability_only=true");
console.log("terminal_receipt_reconciliation=false");
console.log("liability_release_or_delete=false");
console.log("cross_lane_nonce_scheduler_proven=false");
console.log("live_balance_observation=false");
console.log("live_fee_observation=false");
console.log("trusted_time_source_proven=false");
console.log("wc_void_candidate_admission=false");
console.log("runtime_integration=false");
console.log("wallet_access=false");
console.log("signing=false");
console.log("transaction_broadcast=false");
console.log("chain2050_write=false");
console.log("public_presale_activation=false");
console.log("funds_movement=false");
console.log("marker=" + VOID_COUPLED_NATIVE_GAS_OPEN_LIABILITY_STORE_V1);

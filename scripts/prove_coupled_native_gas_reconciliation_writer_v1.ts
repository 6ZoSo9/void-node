#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  serializeCoupledNativeGasStorePayerDomainV1,
} from "../src/economic/coupled_native_gas_liability_store_v1.js";
import {
  VOID_COUPLED_NATIVE_GAS_LIABILITY_V1,
  type CoupledNativeGasLiabilityRecordV1,
} from "../src/economic/coupled_native_gas_liability_v1.js";
import {
  VOID_COUPLED_NATIVE_GAS_LIABILITY_RECONCILIATION_AUTHORITY_V1,
  VOID_COUPLED_NATIVE_GAS_LIABILITY_RECONCILIATION_V1,
  type CoupledNativeGasLiabilityReconciliationVerifiedV1,
} from "../src/economic/coupled_native_gas_liability_reconciliation_v1.js";
import {
  VOID_COUPLED_NATIVE_GAS_RECONCILIATION_EVIDENCE_RESOLVER_AUTHORITY_V1,
  VOID_COUPLED_NATIVE_GAS_RECONCILIATION_EVIDENCE_RESOLVER_V1,
  type CoupledNativeGasReconciliationEvidenceResolverDecisionV1,
} from "../src/economic/coupled_native_gas_reconciliation_evidence_resolver_v1.js";
import {
  classifyCoupledNativeGasEffectiveOpenCensusV1,
} from "../src/economic/coupled_native_gas_effective_open_census_v1.js";
import {
  VOID_COUPLED_NATIVE_GAS_RECONCILIATION_WRITER_AUTHORITY_V1,
  VOID_COUPLED_NATIVE_GAS_RECONCILIATION_WRITER_V1,
  testOnlyPersistCoupledNativeGasReconciliationV1,
} from "../src/economic/coupled_native_gas_reconciliation_writer_v1.js";

const payer = "0x" + "1".repeat(40);
const ROOT_DOMAIN = "payer-domain-v1.json";
const RECORDS = "records";
const RECONCILIATIONS = "reconciliations";
const QUEUE = "gas-liability-admission-v1.queue";
const policy = Object.freeze({
  chain_id: "2050" as const,
  rpc_url: "http://127.0.0.1:18553/",
  required_min_confirmations: "2",
});

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

function sha256Canonical(value: unknown): string {
  return crypto
    .createHash("sha256")
    .update(canonical(value), "utf8")
    .digest("hex");
}

function makeLiability(input: {
  obligation?: string;
  nonce?: number;
  plan?: string;
} = {}): CoupledNativeGasLiabilityRecordV1 {
  const plan = input.plan ?? "b".repeat(64);
  const body = {
    schema: "void_coupled_native_gas_liability_v1",
    marker: VOID_COUPLED_NATIVE_GAS_LIABILITY_V1,
    version: 1,
    lane: "presale" as const,
    obligation_id: input.obligation ?? "a".repeat(64),
    payer_address: payer,
    nonce: input.nonce ?? 7,
    transaction_plan_fingerprint_sha256: plan,
    transaction_native_value_wei: "1",
    gas_limit: "21000",
    admitted_max_fee_per_gas_wei: "10",
    attempt_limit: 1 as const,
    maximum_reserved_wei: "210001",
    fee_observation_sha256: "c".repeat(64),
    source_evidence_kind: "buy_void_prepared_plan_v1" as const,
    source_evidence_id: plan,
    status: "open" as const,
  };
  return Object.freeze({
    ...body,
    liability_id: sha256Canonical(body),
  });
}

function makeReconciliation(
  liability: CoupledNativeGasLiabilityRecordV1,
  input: {
    terminal_cost_evidence_id?: string;
    actual_consumed_wei?: string;
  } = {},
): CoupledNativeGasLiabilityReconciliationVerifiedV1 {
  const maximum = BigInt(liability.maximum_reserved_wei);
  const actual = BigInt(input.actual_consumed_wei ?? "105001");
  const unused = maximum - actual;
  const oneAttempt =
    BigInt(liability.transaction_native_value_wei) +
    BigInt(liability.gas_limit) *
      BigInt(liability.admitted_max_fee_per_gas_wei);
  const body = {
    schema: "void_coupled_native_gas_liability_reconciliation_v1",
    marker: VOID_COUPLED_NATIVE_GAS_LIABILITY_RECONCILIATION_V1,
    version: 1,
    lane: "presale" as const,
    liability_id: liability.liability_id,
    obligation_id: liability.obligation_id,
    payer_address: liability.payer_address,
    nonce: liability.nonce,
    transaction_plan_fingerprint_sha256:
      liability.transaction_plan_fingerprint_sha256,
    terminal_cost_evidence_id:
      input.terminal_cost_evidence_id ?? "8".repeat(64),
    outcome: "confirmed" as const,
    attempt_limit: 1 as const,
    completed_attempt_count: 1 as const,
    remaining_attempt_allowance: 0 as const,
    one_attempt_maximum_wei: oneAttempt.toString(),
    maximum_reserved_wei: maximum.toString(),
    actual_consumed_wei: actual.toString(),
    unconsumed_before_reconciliation_wei: unused.toString(),
    consumed_reserve_retirement_candidate_wei: actual.toString(),
    retained_future_attempt_reserve_wei: "0",
    unused_reserve_release_candidate_wei: unused.toString(),
    next_open_reserved_wei: "0",
    retry_allowance_reserved: false,
    additional_attempt_requires_new_liability: true,
    terminal_close_candidate: true,
  };
  return Object.freeze({
    ok: true,
    status: "reconciliation_classified",
    ...body,
    reconciliation_id: sha256Canonical(body),
    liability_release_authorized: false,
    liability_store_mutation: false,
    retry_execution_authorized: false,
    funds_movement_performed: false,
    authority:
      VOID_COUPLED_NATIVE_GAS_LIABILITY_RECONCILIATION_AUTHORITY_V1,
  });
}

function resolved(
  liability: CoupledNativeGasLiabilityRecordV1,
  reconciliation = makeReconciliation(liability),
): CoupledNativeGasReconciliationEvidenceResolverDecisionV1 {
  return {
    ok: true,
    status: "reconciliation_evidence_resolved",
    packet: {
      schema:
        "void_coupled_native_gas_reconciliation_evidence_packet_v1",
      marker:
        VOID_COUPLED_NATIVE_GAS_RECONCILIATION_EVIDENCE_RESOLVER_V1,
      version: 1,
      liability_id: liability.liability_id,
      obligation_id: liability.obligation_id,
      payer_address: liability.payer_address,
      prepared_plan_reservation_id: liability.obligation_id,
      prepared_plan_fingerprint_sha256:
        liability.transaction_plan_fingerprint_sha256,
      attempt_id: "d".repeat(64),
      transaction_hash: "0x" + "e".repeat(64),
      local_snapshot_sha256: "f".repeat(64),
      rpc_url_fingerprint_sha256: "1".repeat(64),
      rpc_methods_used: Object.freeze([
        "eth_chainId",
        "eth_getTransactionReceipt",
        "eth_blockNumber",
      ]),
      terminal_cost_evidence: {} as any,
      reconciliation,
      mutation_performed: false,
      liability_release_authorized: false,
      funds_movement_performed: false,
      packet_id: "2".repeat(64),
    },
    mutation_performed: false,
    liability_release_authorized: false,
    funds_movement_performed: false,
    authority:
      VOID_COUPLED_NATIVE_GAS_RECONCILIATION_EVIDENCE_RESOLVER_AUTHORITY_V1,
  };
}

type Fixture = {
  root: string;
  liabilities: CoupledNativeGasLiabilityRecordV1[];
  reconciliations: CoupledNativeGasLiabilityReconciliationVerifiedV1[];
};

function writeCanonical(
  target: string,
  value: unknown,
): void {
  fs.writeFileSync(
    target,
    canonical(value) + "\n",
    { mode: 0o600 },
  );
}

function fixture(
  liabilities: CoupledNativeGasLiabilityRecordV1[] = [makeLiability()],
  reconciliations:
    CoupledNativeGasLiabilityReconciliationVerifiedV1[] = [],
): Fixture {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-native-gas-reconciliation-writer-v1-"),
  );
  fs.chmodSync(root, 0o700);
  for (const name of [RECORDS, RECONCILIATIONS, QUEUE]) {
    fs.mkdirSync(path.join(root, name), { mode: 0o700 });
  }
  fs.writeFileSync(
    path.join(root, ROOT_DOMAIN),
    serializeCoupledNativeGasStorePayerDomainV1(payer),
    { mode: 0o600 },
  );
  for (const liability of liabilities) {
    writeCanonical(
      path.join(root, RECORDS, liability.liability_id + ".json"),
      liability,
    );
  }
  for (const reconciliation of reconciliations) {
    writeCanonical(
      path.join(
        root,
        RECONCILIATIONS,
        reconciliation.reconciliation_id + ".json",
      ),
      reconciliation,
    );
  }
  return { root, liabilities, reconciliations };
}

function cleanup(f: Fixture): void {
  fs.rmSync(f.root, { recursive: true, force: true });
}

function requireOk<T extends { ok: boolean }>(
  value: T,
): asserts value is Extract<T, { ok: true }> {
  const runtime = value as T & { reason?: string };
  if (runtime.ok !== true) {
    throw new Error(runtime.reason ?? "unexpected_hold");
  }
}

function requireHeld<T extends { ok: boolean }>(
  value: T,
): asserts value is Extract<T, { ok: false }> {
  if ((value as { ok: boolean }).ok !== false) {
    throw new Error("expected HOLD");
  }
}

for (const [key, value] of Object.entries(
  VOID_COUPLED_NATIVE_GAS_RECONCILIATION_WRITER_AUTHORITY_V1,
)) {
  const trueKeys = new Set([
    "source_writer",
    "payer_scoped_serialization",
    "existing_liability_queue_reused",
    "reconciliation_storage_qualification_required",
    "exact_effective_open_census_precheck",
    "exact_reconciliation_evidence_resolver_reused",
    "idempotent_replay_reauthenticates_terminal_evidence",
    "immutable_liability_history",
    "create_once_reconciliation_publication",
    "exact_effective_open_postcheck",
    "descriptor_bound_reads",
    "filesystem_read",
    "filesystem_write",
    "reconciliation_record_write",
    "effective_open_reserve_release_by_reconciliation",
  ]);
  assert.equal(value, trueKeys.has(key), key);
}

{
  const f = fixture();
  const liability = f.liabilities[0];
  let resolverCalls = 0;
  try {
    const decision =
      await testOnlyPersistCoupledNativeGasReconciliationV1(
        {
          root_dir: f.root,
          payer_address: payer,
          liability_id: liability.liability_id,
          policy,
        },
        {
          resolve_evidence: async () => {
            resolverCalls += 1;
            return resolved(liability);
          },
        },
      );
    requireOk(decision);
    assert.equal(decision.status, "stored");
    assert.equal(decision.mutation_performed, true);
    assert.equal(resolverCalls, 1);
    assert.equal(
      decision.released_open_reserve_wei,
      liability.maximum_reserved_wei,
    );
    assert.equal(decision.effective_open_reserved_after_wei, "0");
    const target = path.join(
      f.root,
      RECONCILIATIONS,
      decision.reconciliation_id + ".json",
    );
    assert.equal(fs.existsSync(target), true);
    assert.equal(
      fs.readFileSync(target, "utf8"),
      canonical(decision.reconciliation) + "\n",
    );
    assert.equal(
      fs.existsSync(
        path.join(f.root, RECORDS, liability.liability_id + ".json"),
      ),
      true,
      "immutable liability row must remain",
    );

    const post = classifyCoupledNativeGasEffectiveOpenCensusV1({
      payer_address: payer,
      liabilities: f.liabilities,
      reconciliations: [decision.reconciliation],
    });
    requireOk(post);
    assert.equal(post.effective_open_liability_count, 0);
    assert.equal(post.reconciled_liability_count, 1);

    const replay =
      await testOnlyPersistCoupledNativeGasReconciliationV1(
        {
          root_dir: f.root,
          payer_address: payer,
          liability_id: liability.liability_id,
          policy,
        },
        {
          resolve_evidence: async () => {
            resolverCalls += 1;
            return resolved(liability);
          },
        },
      );
    requireOk(replay);
    assert.equal(replay.status, "idempotent");
    assert.equal(replay.mutation_performed, false);
    assert.equal(resolverCalls, 2);
    assert.equal(replay.resolver_packet_id, "2".repeat(64));
  } finally {
    cleanup(f);
  }
}

{
  const liability = makeLiability();
  const stored = makeReconciliation(liability);
  const f = fixture([liability], [stored]);
  try {
    const alternate = makeReconciliation(liability, {
      terminal_cost_evidence_id: "9".repeat(64),
      actual_consumed_wei: "126001",
    });
    const decision =
      await testOnlyPersistCoupledNativeGasReconciliationV1(
        {
          root_dir: f.root,
          payer_address: payer,
          liability_id: liability.liability_id,
          policy,
        },
        {
          resolve_evidence: async () =>
            resolved(liability, alternate),
        },
      );
    requireHeld(decision);
    assert.equal(decision.mutation_performed, false);
    assert.equal(
      decision.reason,
      "coupled_native_gas_reconciliation_writer_idempotent_reconciliation_evidence_mismatch",
    );
  } finally {
    cleanup(f);
  }
}

{
  const f = fixture();
  const liability = f.liabilities[0];
  try {
    const decision =
      await testOnlyPersistCoupledNativeGasReconciliationV1(
        {
          root_dir: f.root,
          payer_address: payer,
          liability_id: liability.liability_id,
          policy,
        },
        {
          resolve_evidence: async () => ({
            ok: false,
            status: "held",
            stage: "rpc",
            reason: "synthetic_rpc_hold",
            rpc_url_fingerprint_sha256: null,
            rpc_methods_used: [],
            mutation_performed: false,
            liability_release_authorized: false,
            funds_movement_performed: false,
            authority:
              VOID_COUPLED_NATIVE_GAS_RECONCILIATION_EVIDENCE_RESOLVER_AUTHORITY_V1,
          }),
        },
      );
    requireHeld(decision);
    assert.equal(decision.mutation_performed, false);
    assert.match(decision.reason, /resolver_rpc_synthetic_rpc_hold/u);
    assert.equal(
      fs.readdirSync(path.join(f.root, RECONCILIATIONS)).length,
      0,
    );
  } finally {
    cleanup(f);
  }
}

{
  const first = makeLiability();
  const second = makeLiability({
    obligation: "3".repeat(64),
    nonce: 8,
    plan: "4".repeat(64),
  });
  const f = fixture([first]);
  try {
    const decision =
      await testOnlyPersistCoupledNativeGasReconciliationV1(
        {
          root_dir: f.root,
          payer_address: payer,
          liability_id: first.liability_id,
          policy,
        },
        {
          resolve_evidence: async () => {
            writeCanonical(
              path.join(
                f.root,
                RECORDS,
                second.liability_id + ".json",
              ),
              second,
            );
            return resolved(first);
          },
        },
      );
    requireHeld(decision);
    assert.equal(decision.mutation_performed, false);
    assert.equal(
      decision.reason,
      "coupled_native_gas_reconciliation_writer_history_changed_before_publication",
    );
    assert.equal(
      fs.readdirSync(path.join(f.root, RECONCILIATIONS)).length,
      0,
    );
  } finally {
    cleanup(f);
  }
}

{
  const f = fixture();
  const liability = f.liabilities[0];
  try {
    fs.rmSync(path.join(f.root, RECONCILIATIONS), {
      recursive: true,
      force: true,
    });
    const decision =
      await testOnlyPersistCoupledNativeGasReconciliationV1(
        {
          root_dir: f.root,
          payer_address: payer,
          liability_id: liability.liability_id,
          policy,
        },
        {
          resolve_evidence: async () => resolved(liability),
        },
      );
    requireHeld(decision);
    assert.equal(decision.mutation_performed, false);
    assert.match(
      decision.reason,
      /reconciliations_directory_missing/u,
    );
  } finally {
    cleanup(f);
  }
}

{
  const f = fixture();
  const liability = f.liabilities[0];
  try {
    const decision =
      await testOnlyPersistCoupledNativeGasReconciliationV1(
        {
          root_dir: f.root,
          payer_address: payer,
          liability_id: liability.liability_id,
          policy,
        },
        {
          resolve_evidence: async () => resolved(liability),
          after_publication: () => {
            throw new Error("synthetic_postpublication_failure");
          },
        },
      );
    requireHeld(decision);
    assert.equal(decision.status, "held_after_mutation");
    assert.equal(decision.mutation_performed, true);
    assert.match(
      decision.reason,
      /synthetic_postpublication_failure/u,
    );
    assert.equal(
      fs.readdirSync(path.join(f.root, RECONCILIATIONS))
        .filter((name) => /^[0-9a-f]{64}\.json$/u.test(name))
        .length,
      1,
    );

    const replay =
      await testOnlyPersistCoupledNativeGasReconciliationV1(
        {
          root_dir: f.root,
          payer_address: payer,
          liability_id: liability.liability_id,
          policy,
        },
        {
          resolve_evidence: async () => resolved(liability),
        },
      );
    requireOk(replay);
    assert.equal(replay.status, "idempotent");
  } finally {
    cleanup(f);
  }
}

{
  const f = fixture();
  const liability = f.liabilities[0];
  let resolverCalls = 0;
  try {
    const run = () =>
      testOnlyPersistCoupledNativeGasReconciliationV1(
        {
          root_dir: f.root,
          payer_address: payer,
          liability_id: liability.liability_id,
          policy,
        },
        {
          resolve_evidence: async () => {
            resolverCalls += 1;
            await new Promise((resolve) => setTimeout(resolve, 20));
            return resolved(liability);
          },
        },
      );
    const [left, right] = await Promise.all([run(), run()]);
    requireOk(left);
    requireOk(right);
    assert.deepEqual(
      [left.status, right.status].sort(),
      ["idempotent", "stored"],
    );
    assert.equal(resolverCalls, 2);
    assert.equal(
      fs.readdirSync(path.join(f.root, RECONCILIATIONS))
        .filter((name) => /^[0-9a-f]{64}\.json$/u.test(name))
        .length,
      1,
    );
  } finally {
    cleanup(f);
  }
}

assert.equal(
  VOID_COUPLED_NATIVE_GAS_RECONCILIATION_WRITER_V1,
  "VOID_COUPLED_NATIVE_GAS_RECONCILIATION_WRITER_V1",
);

console.log(
  "VOID_COUPLED_NATIVE_GAS_RECONCILIATION_WRITER_V1_PROOF_GREEN",
);
console.log("existing_payer_queue_reused=true");
console.log("qualified_reconciliation_storage_required=true");
console.log("fresh_resolver_required_before_first_publication=true");
console.log("idempotent_replay_reauthenticates_terminal_evidence=true");
console.log("immutable_liability_history=true");
console.log("create_once_reconciliation_publication=true");
console.log("effective_open_reserve_release_exactly_once=true");
console.log("history_change_before_publication_hold=true");
console.log("postpublication_failure_reports_mutation=true");
console.log("concurrent_exact_replay_single_record=true");
console.log("storage_bootstrap=false");
console.log("liability_record_mutation=false");
console.log("retry_execution=false");
console.log("runtime_integration=false");
console.log("wallet_access=false");
console.log("signing=false");
console.log("transaction_broadcast=false");
console.log("chain2050_write=false");
console.log("gas_spend=false");
console.log("activation=false");
console.log("funds_movement=false");

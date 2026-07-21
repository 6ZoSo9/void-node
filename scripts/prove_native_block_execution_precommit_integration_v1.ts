import assert from "node:assert/strict";

import {
  VOID_NATIVE_BLOCK_EXECUTION_PRECOMMIT_AUTHORITY_V1,
  VOID_NATIVE_BLOCK_EXECUTION_PRECOMMIT_CONFIRMATION_V1,
  VOID_NATIVE_BLOCK_EXECUTION_PRECOMMIT_INTEGRATION_V1,
  VOID_NATIVE_BLOCK_EXECUTION_PRECOMMIT_PREPARE_DECISION_V1,
  VoidNativeBlockExecutionPrecommitHeldErrorV1,
  runVoidNativeBlockExecutionPrecommitIntegrationV1,
} from "../src/chain/native_block_execution_precommit_integration_v1.js";

async function expectHeld(
  reason: string,
  operation: () => Promise<unknown>,
): Promise<void> {
  await assert.rejects(
    operation,
    (error: unknown) => {
      assert.equal(
        error
          instanceof VoidNativeBlockExecutionPrecommitHeldErrorV1,
        true,
      );
      const held =
        error as VoidNativeBlockExecutionPrecommitHeldErrorV1;
      assert.equal(held.reason, reason);
      assert.equal(held.retry_allowed, false);
      assert.equal(held.submission_may_have_occurred, false);
      assert.equal(held.state_mutation_performed, false);
      assert.equal(held.money_movement_performed, false);
      return true;
    },
  );
}

async function main(): Promise<void> {
  let disabledCandidateReads = 0;
  let disabledDependencyReads = 0;
  let disabledConfirmationReads = 0;

  const disabled = await runVoidNativeBlockExecutionPrecommitIntegrationV1(
    {
      policy: {
        enabled: false,
        get confirmation() {
          disabledConfirmationReads += 1;
          throw new Error("disabled confirmation must not be read");
        },
      },
      get candidate_transaction_count() {
        disabledCandidateReads += 1;
        throw new Error("disabled count must not be read");
      },
      get candidate_transactions() {
        disabledCandidateReads += 1;
        throw new Error("disabled transactions must not be read");
      },
      get prepare_dependency() {
        disabledDependencyReads += 1;
        throw new Error("disabled dependency must not be read");
      },
    },
  );

  assert.deepEqual(disabled, {
    ok: true,
    status: "disabled",
    marker:
      VOID_NATIVE_BLOCK_EXECUTION_PRECOMMIT_INTEGRATION_V1,
    version: 1,
    enabled: false,
    dependency_invoked: false,
    candidate_transactions_read: false,
    state_mutation_performed: false,
    money_movement_performed: false,
    authority:
      VOID_NATIVE_BLOCK_EXECUTION_PRECOMMIT_AUTHORITY_V1,
  });
  assert.equal(disabledCandidateReads, 0);
  assert.equal(disabledDependencyReads, 0);
  assert.equal(disabledConfirmationReads, 0);

  let dependencyCalls = 0;
  await expectHeld(
    "precommit_confirmation_required",
    () =>
      runVoidNativeBlockExecutionPrecommitIntegrationV1({
        policy: {
          enabled: true,
          confirmation: null,
        },
        candidate_transaction_count: 1,
        candidate_transactions: ["0x01"],
        prepare_dependency: async () => {
          dependencyCalls += 1;
          throw new Error("must not run");
        },
      }),
  );
  assert.equal(dependencyCalls, 0);

  await expectHeld(
    "prepare_dependency_required",
    () =>
      runVoidNativeBlockExecutionPrecommitIntegrationV1({
        policy: {
          enabled: true,
          confirmation:
            VOID_NATIVE_BLOCK_EXECUTION_PRECOMMIT_CONFIRMATION_V1,
        },
        candidate_transaction_count: 1,
        candidate_transactions: ["0x01"],
        prepare_dependency: null,
      }),
  );

  await expectHeld(
    "candidate_transaction_count_mismatch",
    () =>
      runVoidNativeBlockExecutionPrecommitIntegrationV1({
        policy: {
          enabled: true,
          confirmation:
            VOID_NATIVE_BLOCK_EXECUTION_PRECOMMIT_CONFIRMATION_V1,
        },
        candidate_transaction_count: 2,
        candidate_transactions: ["0x01"],
        prepare_dependency: async () => {
          throw new Error("must not run");
        },
      }),
  );

  const heldReason = "synthetic_transaction_rejected";
  await expectHeld(
    heldReason,
    () =>
      runVoidNativeBlockExecutionPrecommitIntegrationV1({
        policy: {
          enabled: true,
          confirmation:
            VOID_NATIVE_BLOCK_EXECUTION_PRECOMMIT_CONFIRMATION_V1,
        },
        candidate_transaction_count: 1,
        candidate_transactions: ["0x01"],
        prepare_dependency: async () => ({
          ok: false,
          status: "held",
          marker:
            VOID_NATIVE_BLOCK_EXECUTION_PRECOMMIT_PREPARE_DECISION_V1,
          version: 1,
          reason: heldReason,
          retry_allowed: false,
          submission_may_have_occurred: false,
          state_mutation_performed: false,
          money_movement_performed: false,
        }),
      }),
  );

  await expectHeld(
    "prepare_dependency_failed",
    () =>
      runVoidNativeBlockExecutionPrecommitIntegrationV1({
        policy: {
          enabled: true,
          confirmation:
            VOID_NATIVE_BLOCK_EXECUTION_PRECOMMIT_CONFIRMATION_V1,
        },
        candidate_transaction_count: 1,
        candidate_transactions: ["0x01"],
        prepare_dependency: async () => {
          throw new Error("synthetic failure");
        },
      }),
  );

  const candidateTransactions = ["0x01", "0x02"] as const;
  let receivedTransactions: readonly unknown[] | null = null;
  let receivedCount: number | null = null;

  const prepared =
    await runVoidNativeBlockExecutionPrecommitIntegrationV1({
      policy: {
        enabled: true,
        confirmation:
          VOID_NATIVE_BLOCK_EXECUTION_PRECOMMIT_CONFIRMATION_V1,
      },
      candidate_transaction_count:
        candidateTransactions.length,
      candidate_transactions: candidateTransactions,
      prepare_dependency: async (input) => {
        dependencyCalls += 1;
        receivedTransactions = input.candidate_transactions;
        receivedCount = input.candidate_transaction_count;
        return {
          ok: true,
          status: "prepared",
          marker:
            VOID_NATIVE_BLOCK_EXECUTION_PRECOMMIT_PREPARE_DECISION_V1,
          version: 1,
          transaction_count:
            input.candidate_transaction_count,
          plan_binding_sha256: "a".repeat(64),
          state_mutation_performed: false,
          money_movement_performed: false,
        };
      },
    });

  assert.equal(prepared.status, "prepared");
  assert.equal(prepared.enabled, true);
  assert.equal(prepared.transaction_count, 2);
  assert.equal(prepared.plan_binding_sha256, "a".repeat(64));
  assert.equal(prepared.dependency_invoked, true);
  assert.equal(prepared.state_mutation_performed, false);
  assert.equal(prepared.money_movement_performed, false);
  assert.equal(receivedTransactions, candidateTransactions);
  assert.equal(receivedCount, 2);
  assert.equal(dependencyCalls, 1);

  assert.equal(
    VOID_NATIVE_BLOCK_EXECUTION_PRECOMMIT_AUTHORITY_V1
      .preparation_only,
    true,
  );
  assert.equal(
    VOID_NATIVE_BLOCK_EXECUTION_PRECOMMIT_AUTHORITY_V1
      .executor_apply_authority,
    false,
  );
  assert.equal(
    VOID_NATIVE_BLOCK_EXECUTION_PRECOMMIT_AUTHORITY_V1
      .block_store_apply_authority,
    false,
  );
  assert.equal(
    VOID_NATIVE_BLOCK_EXECUTION_PRECOMMIT_AUTHORITY_V1
      .state_mutation,
    false,
  );
  assert.equal(
    VOID_NATIVE_BLOCK_EXECUTION_PRECOMMIT_AUTHORITY_V1
      .money_movement,
    false,
  );

  console.log(
    "VOID_NATIVE_BLOCK_EXECUTION_PRECOMMIT_INTEGRATION_V1_GREEN",
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});

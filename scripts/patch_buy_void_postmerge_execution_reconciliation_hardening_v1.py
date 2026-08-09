from pathlib import Path


def one(text: str, old: str, new: str, name: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{name}: expected 1 anchor, found {count}")
    return text.replace(old, new, 1)


# Residual exact-authority fix on top of exact #1150 semantic files.
runtime = Path("src/economic/buy_void_native_execution_runtime_v1.ts")
text = runtime.read_text()
text = one(
    text,
    '''  if (command.apply === true) {
    const suppliedPolicyFingerprint = String(
      command.policy_fingerprint_sha256 || "",
    ).trim();
    const suppliedPlanFingerprint = String(
      command.expected_plan_fingerprint_sha256 || "",
    ).trim();
    if (!SHA256.test(suppliedPolicyFingerprint)) {
      return held("runtime_policy", {
        reason: "exact_policy_fingerprint_required",
        attempt_id: attemptId,
      });
    }
''',
    '''  if (command.apply === true) {
    const suppliedPolicyFingerprint =
      command.policy_fingerprint_sha256;
    const suppliedPlanFingerprint =
      command.expected_plan_fingerprint_sha256;
    if (
      typeof suppliedPolicyFingerprint !== "string" ||
      !SHA256.test(suppliedPolicyFingerprint)
    ) {
      return held("runtime_policy", {
        reason: "exact_policy_fingerprint_required",
        attempt_id: attemptId,
      });
    }
''',
    "native raw policy authority",
)
text = one(
    text,
    '''    if (!SHA256.test(suppliedPlanFingerprint)) {
      return held("runtime_policy", {
        reason: "exact_plan_fingerprint_required",
        attempt_id: attemptId,
      });
    }
''',
    '''    if (
      typeof suppliedPlanFingerprint !== "string" ||
      !SHA256.test(suppliedPlanFingerprint)
    ) {
      return held("runtime_policy", {
        reason: "exact_plan_fingerprint_required",
        attempt_id: attemptId,
      });
    }
''',
    "native raw plan authority",
)
text = one(
    text,
    '''  if (
    command.apply === true &&
    String(command.expected_plan_fingerprint_sha256 || "").trim() !==
      planFingerprint
  ) {
''',
    '''  if (
    command.apply === true &&
    command.expected_plan_fingerprint_sha256 !== planFingerprint
  ) {
''',
    "native exact plan comparison",
)
runtime.write_text(text)

proof = Path("scripts/prove_buy_void_native_execution_runtime_v1.ts")
text = proof.read_text()
text = one(
    text,
    '''  let driftSignerCalls = 0;
  let driftBroadcasterCalls = 0;
''',
    '''  let paddedPolicySignerCalls = 0;
  let paddedPolicyBroadcasterCalls = 0;
  const paddedPolicyCalls: BuyVoidNativeExecutionPlannerRpcCallV1[] = [];
  const paddedPolicy = await runBuyVoidNativeExecutionRuntimeCommandV1({
    runtime_policy: runtimePolicy(root),
    command: {
      attempt_id: reserved.attempt_id,
      apply: true,
      confirmation: VOID_BUY_VOID_NATIVE_EXECUTION_CONFIRMATION_V1,
      submission_idempotency_key: hash("6"),
      expected_plan_fingerprint_sha256: dry.plan_fingerprint_sha256,
      policy_fingerprint_sha256: `${dry.runtime_policy_fingerprint_sha256} `,
    },
    dependencies: {
      signer: {
        async get_address() {
          paddedPolicySignerCalls += 1;
          return walletAddress;
        },
        async sign_transaction() {
          paddedPolicySignerCalls += 1;
          throw new Error("padded policy signer must not run");
        },
      },
      broadcaster: {
        async broadcast_signed_transaction() {
          paddedPolicyBroadcasterCalls += 1;
          throw new Error("padded policy broadcaster must not run");
        },
      },
    },
    planner_transport: plannerTransport(paddedPolicyCalls),
  });
  assert.equal(paddedPolicy.ok, false);
  if (!("reason" in paddedPolicy)) throw new Error("expected padded policy hold");
  assert.equal(paddedPolicy.reason, "exact_policy_fingerprint_required");
  assert.equal(paddedPolicyCalls.length, 0);
  assert.equal(paddedPolicySignerCalls, 0);
  assert.equal(paddedPolicyBroadcasterCalls, 0);

  let paddedPlanSignerCalls = 0;
  let paddedPlanBroadcasterCalls = 0;
  const paddedPlanCalls: BuyVoidNativeExecutionPlannerRpcCallV1[] = [];
  const paddedPlan = await runBuyVoidNativeExecutionRuntimeCommandV1({
    runtime_policy: runtimePolicy(root),
    command: {
      attempt_id: reserved.attempt_id,
      apply: true,
      confirmation: VOID_BUY_VOID_NATIVE_EXECUTION_CONFIRMATION_V1,
      submission_idempotency_key: hash("5"),
      expected_plan_fingerprint_sha256: `${dry.plan_fingerprint_sha256} `,
      policy_fingerprint_sha256: dry.runtime_policy_fingerprint_sha256,
    },
    dependencies: {
      signer: {
        async get_address() {
          paddedPlanSignerCalls += 1;
          return walletAddress;
        },
        async sign_transaction() {
          paddedPlanSignerCalls += 1;
          throw new Error("padded plan signer must not run");
        },
      },
      broadcaster: {
        async broadcast_signed_transaction() {
          paddedPlanBroadcasterCalls += 1;
          throw new Error("padded plan broadcaster must not run");
        },
      },
    },
    planner_transport: plannerTransport(paddedPlanCalls),
  });
  assert.equal(paddedPlan.ok, false);
  if (!("reason" in paddedPlan)) throw new Error("expected padded plan hold");
  assert.equal(paddedPlan.reason, "exact_plan_fingerprint_required");
  assert.equal(paddedPlanCalls.length, 0);
  assert.equal(paddedPlanSignerCalls, 0);
  assert.equal(paddedPlanBroadcasterCalls, 0);

  let driftSignerCalls = 0;
  let driftBroadcasterCalls = 0;
''',
    "native padded authority proofs",
)
proof.write_text(text)


# Post-merge #1148 fail-closed envelope hardening.
source = Path("scripts/buy_void_production_broadcast_reconciliation_operator_v1.ts")
text = source.read_text()
text = one(
    text,
    '''  const socketFpRaw = child.broadcaster_socket_fingerprint_sha256;
  const socketFp = socketFpRaw === null || socketFpRaw === undefined
    ? null
    : text(socketFpRaw).toLowerCase();
  if (socketFp !== null && !SHA256.test(socketFp)) {
    return held(sagaId, "operator_runtime_socket_fingerprint_invalid");
  }
''',
    '''  const socketFpRaw = child.broadcaster_socket_fingerprint_sha256;
  let socketFp: string | null = null;
  if (socketFpRaw !== null && socketFpRaw !== undefined) {
    if (typeof socketFpRaw !== "string" || !SHA256.test(socketFpRaw)) {
      return held(sagaId, "operator_runtime_socket_fingerprint_invalid");
    }
    socketFp = socketFpRaw;
  }
''',
    "reconciliation socket fingerprint canonicality",
)
text = one(
    text,
    'text(response.saga_id).toLowerCase() !== sagaId',
    'response.saga_id !== sagaId',
    "reconciliation dry response saga",
)
text = one(
    text,
    'text(decision.saga_id).toLowerCase() !== sagaId',
    'decision.saga_id !== sagaId',
    "reconciliation dry decision saga",
)
text = one(
    text,
    '''  const attemptId = text(decision.attempt_id).toLowerCase();
  const runtimeConfirmation = text(response.required_runtime_confirmation);
  const coordinatorConfirmation = text(response.required_coordinator_confirmation);
  const policyFp = text(response.required_policy_fingerprint_sha256).toLowerCase();
  const sagaConfirmation = text(response.required_saga_confirmation);
  const actionConfirmation = text(response.required_saga_action_confirmation);
  if (
    !SHA256.test(attemptId) ||
    runtimeConfirmation !== RUNTIME_CONFIRMATION ||
    !SAFE_TOKEN.test(coordinatorConfirmation) ||
    !SHA256.test(policyFp) ||
    !SAFE_TOKEN.test(sagaConfirmation) ||
    !SAFE_TOKEN.test(actionConfirmation) ||
    decision.required_confirmation !== coordinatorConfirmation ||
    text(decision.required_policy_fingerprint_sha256).toLowerCase() !== policyFp ||
    decision.required_saga_confirmation !== sagaConfirmation ||
    decision.required_saga_action_confirmation !== actionConfirmation
  ) {
''',
    '''  const attemptId =
    typeof decision.attempt_id === "string" ? decision.attempt_id : "";
  const runtimeConfirmation =
    typeof response.required_runtime_confirmation === "string"
      ? response.required_runtime_confirmation
      : "";
  const coordinatorConfirmation =
    typeof response.required_coordinator_confirmation === "string"
      ? response.required_coordinator_confirmation
      : "";
  const policyFp =
    typeof response.required_policy_fingerprint_sha256 === "string"
      ? response.required_policy_fingerprint_sha256
      : "";
  const sagaConfirmation =
    typeof response.required_saga_confirmation === "string"
      ? response.required_saga_confirmation
      : "";
  const actionConfirmation =
    typeof response.required_saga_action_confirmation === "string"
      ? response.required_saga_action_confirmation
      : "";
  if (
    !SHA256.test(attemptId) ||
    runtimeConfirmation !== RUNTIME_CONFIRMATION ||
    !SAFE_TOKEN.test(coordinatorConfirmation) ||
    !SHA256.test(policyFp) ||
    !SAFE_TOKEN.test(sagaConfirmation) ||
    !SAFE_TOKEN.test(actionConfirmation) ||
    decision.required_confirmation !== coordinatorConfirmation ||
    decision.required_policy_fingerprint_sha256 !== policyFp ||
    decision.required_saga_confirmation !== sagaConfirmation ||
    decision.required_saga_action_confirmation !== actionConfirmation
  ) {
''',
    "reconciliation dry authority canonicality",
)
text = one(
    text,
    '''  const dry = parseDryRuntime(response.json, input.saga_id);
  if (!dry) {
''',
    '''  if (response.status !== 200) {
    return held(input.saga_id, "operator_runtime_dry_run_http_invalid", {
      http_status: response.status,
    });
  }
  const dry = parseDryRuntime(response.json, input.saga_id);
  if (!dry) {
''',
    "reconciliation dry HTTP binding",
)
text = one(
    text,
    'text(response.saga_id).toLowerCase() !== sagaId',
    'response.saga_id !== sagaId',
    "reconciliation applied response saga",
)
text = one(
    text,
    '''      decision.applied !== true ||
      text(decision.saga_id).toLowerCase() !== sagaId ||
      text(decision.action) !== "reconcile_possible_broadcast" ||
      !SHA256.test(text(decision.attempt_id).toLowerCase())
    ) return null;
    return {
''',
    '''      decision.applied !== true ||
      decision.saga_id !== sagaId ||
      decision.action !== "reconcile_possible_broadcast" ||
      typeof decision.attempt_id !== "string" ||
      !SHA256.test(decision.attempt_id)
    ) return null;
    const expectedReconciliationRequired =
      status === "unknown" || status === "accepted";
    if (decision.reconciliation_required !== expectedReconciliationRequired) {
      return null;
    }
    return {
''',
    "reconciliation outcome consistency",
)
text = one(
    text,
    'attempt_id: text(decision.attempt_id).toLowerCase(),',
    'attempt_id: decision.attempt_id,',
    "reconciliation exact attempt return",
)
text = one(
    text,
    '''  const parsed = parseAppliedEnvelope(response.json, sagaId);
  if (!parsed) {
''',
    '''  if (response.status !== 200) {
    return transportUnknown(
      sagaId,
      "operator_reconciliation_apply_http_unknown",
      `HTTP${response.status}`,
    );
  }
  const parsed = parseAppliedEnvelope(response.json, sagaId);
  if (!parsed) {
''',
    "reconciliation applied HTTP binding",
)
source.write_text(text)

proof = Path("scripts/prove_buy_void_production_broadcast_reconciliation_operator_v1.ts")
text = proof.read_text()
text = one(text, 'const POLICY_FP = "3".repeat(64);', 'const POLICY_FP = "a3".repeat(32);', "policy fixture")
text = one(text, 'const SOCKET_FP = "4".repeat(64);', 'const SOCKET_FP = "b4".repeat(32);', "socket fixture")
text = one(
    text,
    '''assert.equal(planAgain.plan_fingerprint_sha256, plan.plan_fingerprint_sha256);

const childDisabled = await planBuyVoidProductionBroadcastReconciliationV1({
''',
    '''assert.equal(planAgain.plan_fingerprint_sha256, plan.plan_fingerprint_sha256);

const non200Dry = await planBuyVoidProductionBroadcastReconciliationV1({
  saga_id: SAGA_ID,
  http_get: async () => ({ status: 200, json: statusFixture() }),
  http_post: async () => ({ status: 500, json: dryFixture() }),
});
assert.equal(non200Dry.ok, false);
assert.equal(non200Dry.reason, "operator_runtime_dry_run_http_invalid");

const uppercaseRuntimePolicy = await planBuyVoidProductionBroadcastReconciliationV1({
  saga_id: SAGA_ID,
  http_get: async () => ({ status: 200, json: statusFixture() }),
  http_post: async () => ({
    status: 200,
    json: dryFixture({ policyFingerprint: POLICY_FP.toUpperCase() }),
  }),
});
assert.equal(uppercaseRuntimePolicy.ok, false);
assert.equal(uppercaseRuntimePolicy.reason, "operator_runtime_dry_run_boundary_invalid");

const paddedRuntimeConfirmationBody = dryFixture();
(paddedRuntimeConfirmationBody as any).required_runtime_confirmation =
  `${RUNTIME_CONFIRMATION} `;
const paddedRuntimeConfirmation = await planBuyVoidProductionBroadcastReconciliationV1({
  saga_id: SAGA_ID,
  http_get: async () => ({ status: 200, json: statusFixture() }),
  http_post: async () => ({ status: 200, json: paddedRuntimeConfirmationBody }),
});
assert.equal(paddedRuntimeConfirmation.ok, false);
assert.equal(paddedRuntimeConfirmation.reason, "operator_runtime_dry_run_boundary_invalid");

const uppercaseSocketStatus = await planBuyVoidProductionBroadcastReconciliationV1({
  saga_id: SAGA_ID,
  http_get: async () => ({
    status: 200,
    json: statusFixture({
      socketConfigured: true,
      socketFingerprint: SOCKET_FP.toUpperCase(),
    }),
  }),
  http_post: async () => { throw new Error("must not post"); },
});
assert.equal(uppercaseSocketStatus.ok, false);
assert.equal(uppercaseSocketStatus.reason, "operator_runtime_socket_fingerprint_invalid");

const childDisabled = await planBuyVoidProductionBroadcastReconciliationV1({
''',
    "reconciliation dry adversarial proofs",
)
text = one(
    text,
    '''assert.equal(applied.money_movement_performed, false);
assert.equal(postCount, 3);

let envelopeMismatchPosts = 0;
''',
    '''assert.equal(applied.money_movement_performed, false);
assert.equal(postCount, 3);

for (const outcome of ["unknown", "accepted"] as const) {
  let contradictoryPosts = 0;
  const contradictory = await runBuyVoidProductionBroadcastReconciliationV1({
    args: {
      saga_id: SAGA_ID,
      apply: true,
      expected_plan_fingerprint_sha256: plan.plan_fingerprint_sha256,
      confirmation: RUNTIME_CONFIRMATION,
      coordinator_confirmation: COORDINATOR_CONFIRMATION,
      policy_fingerprint_sha256: POLICY_FP,
      saga_confirmation: SAGA_CONFIRMATION,
      saga_action_confirmation: ACTION_CONFIRMATION,
    },
    http_get: async () => ({
      status: 200,
      json: statusFixture({ applyEnabled: true, socketConfigured: true }),
    }),
    http_post: async () => {
      contradictoryPosts += 1;
      if (contradictoryPosts <= 2) return { status: 200, json: dryFixture() };
      return {
        status: 200,
        json: appliedFixture({ outcome, reconciliationRequired: false }),
      };
    },
  });
  assert.equal(contradictory.ok, false);
  assert.equal(contradictory.status, "reconciliation_unknown");
  assert.equal(contradictory.side_effect_state_known, false);
  assert.equal(contradictory.reconciliation_required, true);
}

for (const outcome of ["not_submitted", "confirmed", "reverted"] as const) {
  let contradictoryPosts = 0;
  const contradictory = await runBuyVoidProductionBroadcastReconciliationV1({
    args: {
      saga_id: SAGA_ID,
      apply: true,
      expected_plan_fingerprint_sha256: plan.plan_fingerprint_sha256,
      confirmation: RUNTIME_CONFIRMATION,
      coordinator_confirmation: COORDINATOR_CONFIRMATION,
      policy_fingerprint_sha256: POLICY_FP,
      saga_confirmation: SAGA_CONFIRMATION,
      saga_action_confirmation: ACTION_CONFIRMATION,
    },
    http_get: async () => ({
      status: 200,
      json: statusFixture({ applyEnabled: true, socketConfigured: true }),
    }),
    http_post: async () => {
      contradictoryPosts += 1;
      if (contradictoryPosts <= 2) return { status: 200, json: dryFixture() };
      return {
        status: 200,
        json: appliedFixture({ outcome, reconciliationRequired: true }),
      };
    },
  });
  assert.equal(contradictory.ok, false);
  assert.equal(contradictory.status, "reconciliation_unknown");
  assert.equal(contradictory.side_effect_state_known, false);
  assert.equal(contradictory.reconciliation_required, true);
}

let non200AppliedPosts = 0;
const non200Applied = await runBuyVoidProductionBroadcastReconciliationV1({
  args: {
    saga_id: SAGA_ID,
    apply: true,
    expected_plan_fingerprint_sha256: plan.plan_fingerprint_sha256,
    confirmation: RUNTIME_CONFIRMATION,
    coordinator_confirmation: COORDINATOR_CONFIRMATION,
    policy_fingerprint_sha256: POLICY_FP,
    saga_confirmation: SAGA_CONFIRMATION,
    saga_action_confirmation: ACTION_CONFIRMATION,
  },
  http_get: async () => ({
    status: 200,
    json: statusFixture({ applyEnabled: true, socketConfigured: true }),
  }),
  http_post: async () => {
    non200AppliedPosts += 1;
    if (non200AppliedPosts <= 2) return { status: 200, json: dryFixture() };
    return { status: 500, json: appliedFixture({ outcome: "confirmed" }) };
  },
});
assert.equal(non200Applied.ok, false);
assert.equal(non200Applied.status, "reconciliation_unknown");
assert.equal(non200Applied.side_effect_state_known, false);
assert.equal(non200Applied.reconciliation_required, true);

let envelopeMismatchPosts = 0;
''',
    "reconciliation applied adversarial proofs",
)
text = one(
    text,
    '''      status: 500,
      json: appliedFixture({ submissionCall: true, broadcast: true, money: true }),
''',
    '''      status: 200,
      json: appliedFixture({ submissionCall: true, broadcast: true, money: true }),
''',
    "authority boundary synthetic status",
)
proof.write_text(text)

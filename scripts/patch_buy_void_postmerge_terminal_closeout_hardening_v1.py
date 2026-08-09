from pathlib import Path


def one(text: str, old: str, new: str, name: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{name}: expected 1 anchor, found {count}")
    return text.replace(old, new, 1)


source = Path("scripts/buy_void_production_terminal_closeout_operator_v1.ts")
text = source.read_text()

text = one(
    text,
    '''  const policyFp = text(child.terminal_policy_fingerprint_sha256).toLowerCase();
  if (!SHA256.test(policyFp)) {
    return cleanHeld(sagaId, "operator_terminal_policy_fingerprint_invalid");
  }
''',
    '''  const policyFp = child.terminal_policy_fingerprint_sha256;
  if (typeof policyFp !== "string" || !SHA256.test(policyFp)) {
    return cleanHeld(sagaId, "operator_terminal_policy_fingerprint_invalid");
  }
''',
    "terminal status policy canonicality",
)

text = one(
    text,
    '''    text(plan.saga_id).toLowerCase() !== sagaId ||
    text(plan.attempt_id).toLowerCase() !== attemptId ||
    text(plan.closeout_id).toLowerCase() !== closeoutId ||
    text(plan.server_policy_fingerprint_sha256).toLowerCase() !== policyFp ||
''',
    '''    plan.saga_id !== sagaId ||
    plan.attempt_id !== attemptId ||
    plan.closeout_id !== closeoutId ||
    plan.server_policy_fingerprint_sha256 !== policyFp ||
''',
    "terminal plan exact bindings",
)

text = one(
    text,
    '''  const transactionHash = text(plan.transaction_hash).toLowerCase();
  const canonicalId = text(plan.canonical_confirmed_state_id).toLowerCase();
  const canonicalFp = text(plan.canonical_confirmed_state_fingerprint).toLowerCase();
  const planFp = text(plan.plan_fingerprint_sha256).toLowerCase();
''',
    '''  const transactionHash =
    typeof plan.transaction_hash === "string" ? plan.transaction_hash : "";
  const canonicalId =
    typeof plan.canonical_confirmed_state_id === "string"
      ? plan.canonical_confirmed_state_id
      : "";
  const canonicalFp =
    typeof plan.canonical_confirmed_state_fingerprint === "string"
      ? plan.canonical_confirmed_state_fingerprint
      : "";
  const planFp =
    typeof plan.plan_fingerprint_sha256 === "string"
      ? plan.plan_fingerprint_sha256
      : "";
''',
    "terminal plan hash canonicality",
)

# Duplicate response + decision exactness.
text = one(
    text,
    '''    text(response.saga_id).toLowerCase() !== sagaId ||
    response.inventory_consumption_performed !== false ||
''',
    '''    response.saga_id !== sagaId ||
    response.inventory_consumption_performed !== false ||
''',
    "duplicate response saga exactness",
)
text = one(
    text,
    '''    decision.money_movement_performed !== false ||
    text(decision.saga_id).toLowerCase() !== sagaId
  ) return null;

  const attemptId = text(decision.attempt_id).toLowerCase();
  const closeoutId = text(decision.closeout_id).toLowerCase();
''',
    '''    decision.money_movement_performed !== false ||
    decision.saga_id !== sagaId
  ) return null;

  const attemptId =
    typeof decision.attempt_id === "string" ? decision.attempt_id : "";
  const closeoutId =
    typeof decision.closeout_id === "string" ? decision.closeout_id : "";
''',
    "duplicate decision canonicality",
)

# Dry response + decision exact authority material.
text = one(
    text,
    '''    response.status !== "dry_run" ||
    response.applied !== false ||
    text(response.saga_id).toLowerCase() !== sagaId ||
''',
    '''    response.status !== "dry_run" ||
    response.applied !== false ||
    response.saga_id !== sagaId ||
''',
    "dry response saga exactness",
)
text = one(
    text,
    '''    decision.money_movement_performed !== false ||
    text(decision.saga_id).toLowerCase() !== sagaId
  ) return null;

  const attemptId = text(decision.attempt_id).toLowerCase();
  const closeoutId = text(decision.closeout_id).toLowerCase();
  const runtimeConfirmation = text(response.required_runtime_confirmation);
  const terminalConfirmation = text(response.required_terminal_closeout_confirmation);
  const policyFp = text(response.required_policy_fingerprint_sha256).toLowerCase();
  const sagaConfirmation = text(response.required_saga_confirmation);
  const actionConfirmation = text(response.required_saga_action_confirmation);
''',
    '''    decision.money_movement_performed !== false ||
    decision.saga_id !== sagaId
  ) return null;

  const attemptId =
    typeof decision.attempt_id === "string" ? decision.attempt_id : "";
  const closeoutId =
    typeof decision.closeout_id === "string" ? decision.closeout_id : "";
  const runtimeConfirmation =
    typeof response.required_runtime_confirmation === "string"
      ? response.required_runtime_confirmation
      : "";
  const terminalConfirmation =
    typeof response.required_terminal_closeout_confirmation === "string"
      ? response.required_terminal_closeout_confirmation
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
''',
    "dry authority extraction",
)
text = one(
    text,
    '''    text(decision.required_confirmation) !== terminalConfirmation ||
    text(decision.required_policy_fingerprint_sha256).toLowerCase() !== policyFp ||
    text(decision.required_saga_confirmation) !== sagaConfirmation ||
    text(decision.required_saga_action_confirmation) !== actionConfirmation
''',
    '''    decision.required_confirmation !== terminalConfirmation ||
    decision.required_policy_fingerprint_sha256 !== policyFp ||
    decision.required_saga_confirmation !== sagaConfirmation ||
    decision.required_saga_action_confirmation !== actionConfirmation
''',
    "dry decision exact authority",
)

text = one(
    text,
    '''  const parsed = parseDry(
    response.json,
    input.saga_id,
    input.policy_fingerprint_sha256,
  );
''',
    '''  if (response.status !== 200) {
    return cleanHeld(input.saga_id, "operator_runtime_dry_run_http_invalid", {
      http_status: response.status,
    });
  }
  const parsed = parseDry(
    response.json,
    input.saga_id,
    input.policy_fingerprint_sha256,
  );
''',
    "dry HTTP success binding",
)

# Applied response: raw response saga and successful decision IDs.
text = one(
    text,
    '''    response.applied !== decision.applied ||
    text(response.saga_id).toLowerCase() !== sagaId ||
''',
    '''    response.applied !== decision.applied ||
    response.saga_id !== sagaId ||
''',
    "applied response saga exactness",
)
text = one(
    text,
    '''  if (decision.ok === true) {
    const outcome = text(decision.status);
    if (!["closed", "recovered_partial", "duplicate"].includes(outcome)) return null;
    const attemptId = text(decision.attempt_id).toLowerCase();
    const closeoutId = text(decision.closeout_id).toLowerCase();
''',
    '''  if (decision.ok === true) {
    const outcome = text(decision.status);
    if (!["closed", "recovered_partial", "duplicate"].includes(outcome)) return null;
    if (decision.saga_id !== sagaId) return null;
    const attemptId =
      typeof decision.attempt_id === "string" ? decision.attempt_id : "";
    const closeoutId =
      typeof decision.closeout_id === "string" ? decision.closeout_id : "";
''',
    "applied success exact IDs",
)

# Bind applied HTTP semantics to the lower runtime contract: success is 200;
# a known mutating held envelope is explicitly 500; all other statuses are unknown.
text = one(
    text,
    '''  const parsed = parseAppliedEnvelope(response.json, sagaId);
  if (parsed) return parsed;
  return closeoutUnknown(
    sagaId,
    "applied_closeout_response_boundary_unknown",
    "InvalidRuntimeEnvelope",
  );
''',
    '''  const parsed = parseAppliedEnvelope(response.json, sagaId);
  if (
    response.status === 200 &&
    parsed?.ok === true
  ) {
    return parsed;
  }
  if (
    response.status === 500 &&
    parsed?.ok === false &&
    parsed.status === "held" &&
    parsed.mutation_performed === true
  ) {
    return parsed;
  }
  return closeoutUnknown(
    sagaId,
    response.status === 200
      ? "applied_closeout_response_boundary_unknown"
      : "applied_closeout_http_unknown",
    response.status === 200 ? "InvalidRuntimeEnvelope" : `HTTP${response.status}`,
  );
''',
    "applied HTTP contract binding",
)

source.write_text(text)


proof = Path("scripts/prove_buy_void_production_terminal_closeout_operator_v1.ts")
text = proof.read_text()

text = one(
    text,
    '''assert.equal(duplicatePlan.mutation_performed, false);

const childDisabled = await planBuyVoidProductionTerminalCloseoutV1({
''',
    '''assert.equal(duplicatePlan.mutation_performed, false);

const non200Dry = await planBuyVoidProductionTerminalCloseoutV1({
  saga_id: SAGA_ID,
  http_get: async () => ({ status: 200, json: statusFixture() }),
  http_post: async () => ({ status: 500, json: dryFixture() }),
});
assert.equal(non200Dry.ok, false);
assert.equal(non200Dry.reason, "operator_runtime_dry_run_http_invalid");

const non200Duplicate = await planBuyVoidProductionTerminalCloseoutV1({
  saga_id: SAGA_ID,
  http_get: async () => ({ status: 200, json: statusFixture() }),
  http_post: async () => ({ status: 500, json: duplicateFixture() }),
});
assert.equal(non200Duplicate.ok, false);
assert.equal(non200Duplicate.reason, "operator_runtime_dry_run_http_invalid");

const childDisabled = await planBuyVoidProductionTerminalCloseoutV1({
''',
    "non-200 dry and duplicate proofs",
)

text = one(
    text,
    '''assert.equal(wrongPolicyDry.ok, false);
assert.equal(wrongPolicyDry.reason, "operator_runtime_dry_run_boundary_invalid");

let wrongPlanPosts = 0;
''',
    '''assert.equal(wrongPolicyDry.ok, false);
assert.equal(wrongPolicyDry.reason, "operator_runtime_dry_run_boundary_invalid");

const uppercaseStatusPolicy = await planBuyVoidProductionTerminalCloseoutV1({
  saga_id: SAGA_ID,
  http_get: async () => ({
    status: 200,
    json: statusFixture({ policyFingerprint: POLICY_FP.toUpperCase() }),
  }),
  http_post: async () => { throw new Error("must not post"); },
});
assert.equal(uppercaseStatusPolicy.ok, false);
assert.equal(uppercaseStatusPolicy.reason, "operator_terminal_policy_fingerprint_invalid");

const paddedRuntimeConfirmationBody = dryFixture();
(paddedRuntimeConfirmationBody as any).required_runtime_confirmation =
  `${RUNTIME_CONFIRMATION} `;
const paddedRuntimeConfirmation = await planBuyVoidProductionTerminalCloseoutV1({
  saga_id: SAGA_ID,
  http_get: async () => ({ status: 200, json: statusFixture() }),
  http_post: async () => ({ status: 200, json: paddedRuntimeConfirmationBody }),
});
assert.equal(paddedRuntimeConfirmation.ok, false);
assert.equal(paddedRuntimeConfirmation.reason, "operator_runtime_dry_run_boundary_invalid");

const uppercasePlanPolicyBody = dryFixture();
((uppercasePlanPolicyBody as any).decision.plan as any)
  .server_policy_fingerprint_sha256 = POLICY_FP.toUpperCase();
const uppercasePlanPolicy = await planBuyVoidProductionTerminalCloseoutV1({
  saga_id: SAGA_ID,
  http_get: async () => ({ status: 200, json: statusFixture() }),
  http_post: async () => ({ status: 200, json: uppercasePlanPolicyBody }),
});
assert.equal(uppercasePlanPolicy.ok, false);
assert.equal(uppercasePlanPolicy.reason, "operator_runtime_dry_run_boundary_invalid");

const uppercaseTransactionBody = dryFixture();
((uppercaseTransactionBody as any).decision.plan as any).transaction_hash =
  `0x${"A".repeat(64)}`;
const uppercaseTransaction = await planBuyVoidProductionTerminalCloseoutV1({
  saga_id: SAGA_ID,
  http_get: async () => ({ status: 200, json: statusFixture() }),
  http_post: async () => ({ status: 200, json: uppercaseTransactionBody }),
});
assert.equal(uppercaseTransaction.ok, false);
assert.equal(uppercaseTransaction.reason, "operator_runtime_dry_run_boundary_invalid");

let wrongPlanPosts = 0;
''',
    "runtime canonicality adversarial proofs",
)

text = one(
    text,
    '''assert.deepEqual(applyBody, {
  action: ACTION,
  saga_id: SAGA_ID,
  apply: true,
  confirmation: RUNTIME_CONFIRMATION,
  terminal_closeout_confirmation: TERMINAL_CONFIRMATION,
  policy_fingerprint_sha256: POLICY_FP,
  saga_confirmation: SAGA_CONFIRMATION,
  saga_action_confirmation: ACTION_CONFIRMATION,
});

let recoveredPosts = 0;
''',
    '''assert.deepEqual(applyBody, {
  action: ACTION,
  saga_id: SAGA_ID,
  apply: true,
  confirmation: RUNTIME_CONFIRMATION,
  terminal_closeout_confirmation: TERMINAL_CONFIRMATION,
  policy_fingerprint_sha256: POLICY_FP,
  saga_confirmation: SAGA_CONFIRMATION,
  saga_action_confirmation: ACTION_CONFIRMATION,
});

let non200ClosedPosts = 0;
const non200Closed = await runBuyVoidProductionTerminalCloseoutV1({
  args: applyArgs(plan.plan_fingerprint_sha256),
  http_get: async () => ({
    status: 200,
    json: statusFixture({ applyEnabled: true }),
  }),
  http_post: async () => {
    non200ClosedPosts += 1;
    if (non200ClosedPosts <= 2) return { status: 200, json: dryFixture() };
    return { status: 500, json: appliedFixture({ outcome: "closed" }) };
  },
});
assert.equal(non200Closed.ok, false);
assert.equal(non200Closed.status, "closeout_unknown");
assert.equal(non200Closed.side_effect_state_known, false);
assert.equal(non200Closed.recovery_required, true);
assert.equal(non200Closed.mutation_performed, null);
assert.equal(non200Closed.inventory_consumption_performed, null);
assert.equal(non200Closed.public_request_fulfilled, null);
assert.equal(non200Closed.saga_closeout_appended, null);

let recoveredPosts = 0;
''',
    "non-200 success-shaped applied proof",
)

# Existing #1153 500 mutating held fixtures remain intact and prove the
# explicitly validated lower-runtime 500 held envelope, including saga append truth.
text = one(
    text,
    '''  post_append_verification_mismatch_saga_truth_preserved: true,
  applied_transport_unknown_preserved: true,
''',
    '''  post_append_verification_mismatch_saga_truth_preserved: true,
  success_http_status_bound: true,
  mutating_500_held_envelope_explicitly_validated: true,
  runtime_authority_material_required_canonical: true,
  applied_transport_unknown_preserved: true,
''',
    "terminal proof receipt",
)

proof.write_text(text)
